<?php

namespace App\Services\Locker;

use App\Models\StorageBatch;
use App\Services\Integration\IntegrationLogService;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Dedicated Locker HTTP client (spec §27).
 * Centralizes base URL, Bearer token, headers, timeout, parsing, error handling.
 * Never expose token to frontend; keep server-side only.
 */
class LockerApiService
{
    public function __construct(
        protected IntegrationLogService $logService,
    ) {}

    protected function client(?string $requestId = null): PendingRequest
    {
        // Settings page (database) wins; .env is only the fallback.
        $base = LockerConfig::baseUrl();
        $token = LockerConfig::token();
        $timeout = LockerConfig::timeout();

        $client = Http::baseUrl($base)
            ->timeout($timeout)
            ->acceptJson()
            ->contentType('application/json')
            ->retry(0);

        if ($token !== '') {
            $client = $client->withToken($token);
        }

        if ($requestId !== null) {
            $client = $client->withHeaders(['X-Request-Id' => $requestId]);
        }

        return $client;
    }

    /**
     * Locker validation errors may return `message` as an array (NestJS style).
     * Normalize it before handing it to IntegrationLogService::log().
     */
    private function errorMessage(array $body, Response $response): string
    {
        $message = $body['message'] ?? null;

        if (is_array($message)) {
            $message = implode('; ', Arr::flatten($message));
        }

        if (! is_string($message) || $message === '') {
            $message = $response->body();
        }

        return $message;
    }

    /**
     * Send batch to Locker: POST /api/integration/v1/storage-assignments/batch (spec §9)
     *
     * @return array{httpStatus:int, body:array, success:bool, errorCode:?string, retryable:bool}
     */
    public function assignStorage(StorageBatch $batch): array
    {
        // v1.1 rejects unknown properties (e.g. "location"), so send only the
        // field that belongs to the configured API version.
        $isV11 = str_contains(LockerConfig::pathPrefix(), 'v1.1');

        $payload = [
            'batchNo' => $batch->batch_no,
            'items' => $batch->items->map(function ($i) use ($isV11) {
                $item = [
                    'voucherNo' => $i->voucher_no,
                    'voucherDate' => $i->voucher_date instanceof \DateTimeInterface ? $i->voucher_date->format('Y-m-d') : $i->voucher_date,
                    'bagNo' => $i->bag_no,
                ];

                if ($isV11) {
                    $item['drawerCode'] = $i->drawer_code ?: $i->location;
                } else {
                    $item['location'] = $i->location ?: $i->drawer_code;
                }

                return $item;
            })->toArray(),
        ];

        $requestId = $batch->request_id;
        $logEndpoint = LockerConfig::pathPrefix().'/storage-assignments/batch';

        try {
            // Real locker at 192.168.1.33 expects X-Request-Id as header (spec) but example shows query param ?X-Request-Id= — send both for compat
            $endpoint = '/storage-assignments/batch';
            if ($requestId !== null) {
                $endpoint .= '?X-Request-Id=' . urlencode($requestId);
            }
            $response = $this->client($requestId)->post($endpoint, $payload);
            $status = $response->status();
            $body = $response->json() ?? [];

            // Spec §11: success flag + HTTP status both matter
            // Partial failure still success:true with data.rejected>0
            $isHttpSuccess = $response->successful();
            $isBodySuccess = ($body['success'] ?? null) === true;
            // Legacy: some lockers may omit success flag but HTTP 2xx implies success
            $success = $isHttpSuccess && ($isBodySuccess || ! array_key_exists('success', $body));

            // Edge: HTTP 200 but body success:false -> business failure (not retryable unless 500/503)
            if ($isHttpSuccess && isset($body['success']) && $body['success'] === false) {
                $success = false;
            }

            $errorCode = $body['errorCode'] ?? null;
            $retryable = $this->isRetryable($status, $errorCode);

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: $logEndpoint,
                requestId: $requestId,
                httpStatus: $status,
                status: $success ? 'SUCCESS' : ($retryable ? 'RETRYING' : 'FAILED'),
                requestBody: $payload,
                responseBody: $body,
                errorMessage: $success ? null : $this->errorMessage($body, $response),
            );

            return [
                'httpStatus' => $status,
                'body' => $body,
                'success' => $success,
                'errorCode' => $errorCode,
                'retryable' => $retryable,
            ];
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning('Locker assignStorage connection failed', ['batchNo' => $batch->batch_no, 'error' => $e->getMessage()]);

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: $logEndpoint,
                requestId: $requestId,
                httpStatus: 0,
                status: 'RETRYING',
                requestBody: $payload,
                errorMessage: 'Connection failed: '.$e->getMessage(),
            );

            return [
                'httpStatus' => 0,
                'body' => [],
                'success' => false,
                'errorCode' => 'LOCKER_UNAVAILABLE',
                'retryable' => true,
            ];
        } catch (\Throwable $e) {
            Log::error('Locker assignStorage failed', ['batchNo' => $batch->batch_no, 'error' => $e->getMessage()]);

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: $logEndpoint,
                requestId: $requestId,
                httpStatus: 0,
                status: 'FAILED',
                requestBody: $payload,
                errorMessage: $e->getMessage(),
            );

            return [
                'httpStatus' => 0,
                'body' => [],
                'success' => false,
                'errorCode' => 'LOCKER_UNAVAILABLE',
                'retryable' => true,
            ];
        }
    }

    public function isRetryable(int $httpStatus, ?string $errorCode = null): bool
    {
        // Spec §13: retry on timeout, connection refused (0), 500, 503
        if ($httpStatus === 0) {
            return true;
        }

        if (in_array($httpStatus, [500, 503, 408, 429, 504], true)) {
            return true;
        }

        // Business errors are NOT retryable (spec §11: 400,401,403,404,409,422)
        if (in_array($httpStatus, [400, 401, 403, 404, 409, 422], true)) {
            return false;
        }

        // ErrorCode hints: v1.0 LOCKER_* and v1.1 DRAWER_* (spec 32)
        if ($errorCode !== null && in_array($errorCode, ['LOCKER_UNAVAILABLE', 'LOCKER_NOT_AVAILABLE', 'LOCKER_OCCUPIED', 'DRAWER_NOT_AVAILABLE', 'DRAWER_OCCUPIED', 'INVALID_DRAWER_CODE', 'INVALID_LOCATION'], true)) {
            // OCCUPIED / INVALID are business, not retryable
            return in_array($errorCode, ['LOCKER_UNAVAILABLE', 'LOCKER_NOT_AVAILABLE', 'DRAWER_NOT_AVAILABLE'], true);
        }

        return false;
    }

    /**
     * New Locker APIs per updated docs/API.md — all require Bearer token
     */

    public function getDrawers(bool $availableOnly = true): array
    {
        try {
            $response = $this->client()->get('/drawers', ['available' => $availableOnly ? 'true' : 'false']);
            $status = $response->status();
            $body = $response->json() ?? [];
            $success = $response->successful() && ($body['success'] ?? false) === true;

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: LockerConfig::pathPrefix().'/drawers?available=' . ($availableOnly ? 'true' : 'false'),
                httpStatus: $status,
                status: $success ? 'SUCCESS' : 'FAILED',
                requestBody: ['available' => $availableOnly],
                responseBody: $body,
                errorMessage: $success ? null : $this->errorMessage($body, $response),
            );

            return [
                'httpStatus' => $status,
                'body' => $body,
                'success' => $success,
                'drawers' => $body['data']['drawers'] ?? [],
            ];
        } catch (\Throwable $e) {
            Log::error('getDrawers failed', ['error' => $e->getMessage()]);
            return ['httpStatus' => 0, 'body' => [], 'success' => false, 'drawers' => [], 'error' => $e->getMessage()];
        }
    }

    public function queryBags(array $bagNos): array
    {
        try {
            $response = $this->client()->post('/bags/query', ['bagNos' => $bagNos]);
            $status = $response->status();
            $body = $response->json() ?? [];
            $success = $response->successful() && ($body['success'] ?? false) === true;

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: LockerConfig::pathPrefix().'/bags/query',
                httpStatus: $status,
                status: $success ? 'SUCCESS' : 'FAILED',
                requestBody: ['bagNos' => $bagNos],
                responseBody: $body,
                errorMessage: $success ? null : $this->errorMessage($body, $response),
            );

            return ['httpStatus' => $status, 'body' => $body, 'success' => $success];
        } catch (\Throwable $e) {
            Log::error('queryBags failed', ['error' => $e->getMessage()]);
            return ['httpStatus' => 0, 'body' => [], 'success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getBag(string $bagNo): array
    {
        try {
            $response = $this->client()->get("/bags/{$bagNo}");
            $status = $response->status();
            $body = $response->json() ?? [];
            $success = $response->successful() && ($body['success'] ?? false) === true;

            $this->logService->log(
                direction: 'APP_TO_LOCKER',
                system: 'LOCKER',
                endpoint: LockerConfig::pathPrefix()."/bags/{$bagNo}",
                httpStatus: $status,
                status: $success ? 'SUCCESS' : 'FAILED',
                requestBody: null,
                responseBody: $body,
                errorMessage: $success ? null : $this->errorMessage($body, $response),
            );

            return ['httpStatus' => $status, 'body' => $body, 'success' => $success];
        } catch (\Throwable $e) {
            Log::error('getBag failed', ['bagNo' => $bagNo, 'error' => $e->getMessage()]);
            return ['httpStatus' => 0, 'body' => [], 'success' => false, 'error' => $e->getMessage()];
        }
    }
}
