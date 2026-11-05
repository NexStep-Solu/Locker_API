<?php

namespace App\Services\Integration;

use App\Models\IntegrationLog;
use Illuminate\Support\Facades\Log;

class IntegrationLogService
{
    /**
     * Record integration activity safely — never log tokens (spec §38, §30).
     *
     * @param  array<string,mixed>|null  $requestBody
     * @param  array<string,mixed>|null  $responseBody
     */
    public function log(
        string $direction,
        string $system,
        string $endpoint,
        ?string $requestId = null,
        ?string $eventId = null,
        ?int $httpStatus = null,
        ?string $status = null,
        ?array $requestBody = null,
        ?array $responseBody = null,
        ?string $errorMessage = null,
    ): IntegrationLog {
        // Defensive: strip any Authorization-like keys if accidentally passed
        $requestBody = $this->sanitize($requestBody);
        $responseBody = $this->sanitize($responseBody);

        $log = IntegrationLog::create([
            'direction' => $direction,
            'system' => $system,
            'endpoint' => $endpoint,
            'request_id' => $requestId,
            'event_id' => $eventId,
            'http_status' => $httpStatus,
            'status' => $status,
            'request_body' => $requestBody,
            'response_body' => $responseBody,
            'error_message' => $errorMessage,
        ]);

        Log::info('Integration log', [
            'direction' => $direction,
            'system' => $system,
            'endpoint' => $endpoint,
            'request_id' => $requestId,
            'event_id' => $eventId,
            'http_status' => $httpStatus,
            'status' => $status,
        ]);

        return $log;
    }

    /**
     * Remove sensitive keys from payload before persisting.
     */
    private function sanitize(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        $sensitive = ['authorization', 'token', 'bearer', 'password', 'api_token', 'locker_api_token', 'pos_api_token'];
        foreach ($payload as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitive, true)) {
                unset($payload[$key]);
            } elseif (is_array($value)) {
                $payload[$key] = $this->sanitize($value);
            }
        }

        return $payload;
    }
}
