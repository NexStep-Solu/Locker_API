<?php

namespace App\Jobs;

use App\Models\StorageBatch;
use App\Models\StorageBatchItem;
use App\Services\Locker\LockerApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class SendStorageAssignmentToLocker implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries;
    public int $backoff;

    public function __construct(public int $storageBatchId)
    {
        $this->tries = \App\Services\Locker\LockerConfig::retryAttempts();
        $this->backoff = \App\Services\Locker\LockerConfig::retryDelay();
    }

    public function backoff(): array
    {
        $d = $this->backoff;

        return [$d, $d * 2, $d * 3];
    }

    public function handle(LockerApiService $locker): void
    {
        $batch = StorageBatch::with('items')->find($this->storageBatchId);
        if (! $batch) {
            Log::warning('SendStorageAssignment: batch not found', ['id' => $this->storageBatchId]);

            return;
        }

        // Idempotency: already completed/partial should not re-send (spec §13 same batchNo+requestId)
        if (in_array($batch->status, [StorageBatch::STATUS_COMPLETED, StorageBatch::STATUS_PARTIAL], true)) {
            Log::info('SendStorageAssignment: batch already finished', ['batchNo' => $batch->batch_no, 'status' => $batch->status]);

            return;
        }

        $batch->update(['status' => StorageBatch::STATUS_PROCESSING, 'sent_at' => now()]);

        $result = $locker->assignStorage($batch);
        $status = $result['httpStatus'];
        $body = $result['body'];
        $retryable = $result['retryable'];

        if ($result['success']) {
            $this->handleSuccess($batch, $body);

            return;
        }

        // Handle HTTP 200 but success:false with business errorCode — map to item-level if possible
        if (in_array($status, [400, 422, 409], true)) {
            $this->handleBusinessFailure($batch, $body, $status);

            return;
        }

        // Retryable failure (spec §13)
        if ($retryable && $this->attempts() < $this->tries) {
            $batch->update(['status' => StorageBatch::STATUS_RETRYING]);
            $delay = $this->backoff[$this->attempts() - 1] ?? $this->backoff;
            $this->release($delay);
            Log::info('SendStorageAssignment retrying', [
                'batchNo' => $batch->batch_no,
                'requestId' => $batch->request_id,
                'attempt' => $this->attempts(),
                'maxAttempts' => $this->tries,
                'status' => $status,
                'errorCode' => $result['errorCode'],
                'delay' => $delay,
            ]);

            return;
        }

        // Non-retryable or exhausted
        $batch->update([
            'status' => StorageBatch::STATUS_FAILED,
            'response_at' => now(),
        ]);

        // Mark pending items as FAILED so UI can show retryable
        StorageBatchItem::where('storage_batch_id', $batch->id)
            ->where('status', StorageBatchItem::STATUS_PENDING)
            ->update([
                'status' => StorageBatchItem::STATUS_FAILED,
                'error_code' => $result['errorCode'] ?? 'LOCKER_UNAVAILABLE',
                'error_message' => $body['message'] ?? 'Locker request failed after retries',
            ]);

        if ($retryable) {
            $this->fail(new \RuntimeException('Locker unavailable after '.$this->tries.' attempts: '.$batch->batch_no.' status:'.$status));
        }
    }

    /**
     * Normalize Locker messages, which may be a string or an array of validation errors.
     */
    private function message(array $body, string $default): string
    {
        $message = $body['message'] ?? $default;

        if (is_array($message)) {
            $message = implode('; ', Arr::flatten($message));
        }

        return is_string($message) && $message !== '' ? $message : $default;
    }

    private function handleSuccess(StorageBatch $batch, array $body): void
    {
        $data = $body['data'] ?? [];
        $accepted = $data['accepted'] ?? null;
        $rejected = $data['rejected'] ?? null;
        $total = $data['total'] ?? $batch->total;

        // Try to map per-item results if Locker provides them (future-proof).
        // v1.1 returns rejected items in data.errors.
        $itemsPayload = $data['items'] ?? $data['details'] ?? $data['results'] ?? $data['errors'] ?? null;
        $payloadIsErrors = ! isset($data['items'], $data['details'], $data['results']) && isset($data['errors']);

        if (is_array($itemsPayload) && isset($itemsPayload[0]) && is_array($itemsPayload[0])) {
            foreach ($itemsPayload as $itemRes) {
                $bagNo = $itemRes['bagNo'] ?? $itemRes['bag_no'] ?? null;
                $itemStatus = strtoupper((string) ($itemRes['status'] ?? ''));
                $errorCode = $itemRes['errorCode'] ?? $itemRes['error_code'] ?? null;
                $errorMsg = $itemRes['message'] ?? $itemRes['error_message'] ?? null;
                $isRejected = $payloadIsErrors || $itemStatus === 'REJECTED' || $errorCode !== null;

                if ($bagNo) {
                    StorageBatchItem::where('storage_batch_id', $batch->id)
                        ->where('bag_no', $bagNo)
                        ->update([
                            'status' => $isRejected ? StorageBatchItem::STATUS_REJECTED : StorageBatchItem::STATUS_ACCEPTED,
                            'error_code' => $isRejected ? $errorCode : null,
                            'error_message' => $isRejected ? $errorMsg : null,
                        ]);
                }
            }

            $accepted = StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_ACCEPTED)->count();
            $rejected = StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_REJECTED)->count();
        } elseif ($accepted !== null || $rejected !== null) {
            // Counts only — distribute statuses (spec §12 example: 3 total 2 accepted 1 rejected)
            // For demo: mark first N as ACCEPTED, rest REJECTED with generic error if counts show rejected>0
            if (($rejected ?? 0) > 0) {
                $allItems = StorageBatchItem::where('storage_batch_id', $batch->id)->orderBy('id')->get();
                $i = 0;
                foreach ($allItems as $item) {
                    if ($i < ($accepted ?? 0)) {
                        $item->update([
                            'status' => StorageBatchItem::STATUS_ACCEPTED,
                            'error_code' => null,
                            'error_message' => null,
                        ]);
                    } else {
                        $item->update([
                            'status' => StorageBatchItem::STATUS_REJECTED,
                            'error_code' => $body['errorCode'] ?? 'INVALID_LOCATION',
                            'error_message' => $this->message($body, 'Rejected by Locker'),
                        ]);
                    }
                    $i++;
                }
            } else {
                StorageBatchItem::where('storage_batch_id', $batch->id)
                    ->update(['status' => StorageBatchItem::STATUS_ACCEPTED]);
            }
        } else {
            // No data breakdown — all accepted
            StorageBatchItem::where('storage_batch_id', $batch->id)
                ->where('status', StorageBatchItem::STATUS_PENDING)
                ->update([
                    'status' => StorageBatchItem::STATUS_ACCEPTED,
                    'error_code' => null,
                    'error_message' => null,
                ]);
            $accepted = $batch->total;
            $rejected = 0;
        }

        // Refresh counts if not provided
        $accepted = $accepted ?? StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_ACCEPTED)->count();
        $rejected = $rejected ?? StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_REJECTED)->count();

        $batch->update([
            'accepted' => $accepted,
            'rejected' => $rejected,
            'total' => $total ?? $batch->total,
            'status' => ($rejected ?? 0) > 0
                ? (($accepted ?? 0) > 0 ? StorageBatch::STATUS_PARTIAL : StorageBatch::STATUS_FAILED)
                : StorageBatch::STATUS_COMPLETED,
            'response_at' => now(),
        ]);
    }

    private function handleBusinessFailure(StorageBatch $batch, array $body, int $httpStatus): void
    {
        $errorCode = $body['errorCode'] ?? 'VALIDATION_ERROR';
        $message = $this->message($body, 'Business validation failure');

        // For 400/422/409, whole batch is not retried — mark items accordingly
        // If body contains item-level errors, try to map; else mark all pending as REJECTED/FAILED
        $data = $body['data'] ?? [];
        $itemsPayload = $data['items'] ?? $data['details'] ?? null;

        if (is_array($itemsPayload) && isset($itemsPayload[0])) {
            foreach ($itemsPayload as $itemRes) {
                $bagNo = $itemRes['bagNo'] ?? $itemRes['bag_no'] ?? null;
                if ($bagNo) {
                    StorageBatchItem::where('storage_batch_id', $batch->id)
                        ->where('bag_no', $bagNo)
                        ->update([
                            'status' => StorageBatchItem::STATUS_REJECTED,
                            'error_code' => $itemRes['errorCode'] ?? $errorCode,
                            'error_message' => $itemRes['message'] ?? $message,
                        ]);
                }
            }
            // Any still pending without explicit error
            StorageBatchItem::where('storage_batch_id', $batch->id)
                ->where('status', StorageBatchItem::STATUS_PENDING)
                ->update([
                    'status' => StorageBatchItem::STATUS_REJECTED,
                    'error_code' => $errorCode,
                    'error_message' => $message,
                ]);
        } else {
            // No per-item breakdown — mark as REJECTED for business error, not FAILED for retry
            $itemStatus = in_array($httpStatus, [409], true) ? StorageBatchItem::STATUS_REJECTED : StorageBatchItem::STATUS_REJECTED;
            StorageBatchItem::where('storage_batch_id', $batch->id)
                ->where('status', StorageBatchItem::STATUS_PENDING)
                ->update([
                    'status' => $itemStatus,
                    'error_code' => $errorCode,
                    'error_message' => $message,
                ]);
        }

        $rejectedCount = StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_REJECTED)->count();
        $acceptedCount = StorageBatchItem::where('storage_batch_id', $batch->id)->where('status', StorageBatchItem::STATUS_ACCEPTED)->count();

        $batch->update([
            'accepted' => $acceptedCount,
            'rejected' => $rejectedCount,
            'status' => $rejectedCount > 0 && $acceptedCount > 0 ? StorageBatch::STATUS_PARTIAL : StorageBatch::STATUS_FAILED,
            'response_at' => now(),
        ]);
    }
}
