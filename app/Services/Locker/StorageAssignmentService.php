<?php

namespace App\Services\Locker;

use App\Models\Bag;
use App\Models\StorageBatch;
use App\Models\StorageBatchItem;
use App\Services\Integration\IntegrationLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StorageAssignmentService
{
    public function __construct(
        protected IntegrationLogService $logService,
    ) {}

    /**
     * Persist POS storage assignment batch atomically. v1.1: drawerCode preferred, location kept for backward compat.
     *
     * Handles idempotency on batchNo — duplicate logical batch returns existing.
     * Persists bags current_location/current_drawer_code and batch items.
     *
     * @param  array<int, array{voucherNo:string, voucherDate:string, bagNo:string, location?:string, drawerCode?:string}>  $items
     * @return array{batch: StorageBatch, isDuplicate: bool}
     */
    public function storeBatch(string $batchNo, array $items, ?string $requestId = null): array
    {
        $requestId = $requestId ?: (string) Str::ulid();

        // Idempotency: batchNo is unique (spec §22.2)
        $existing = StorageBatch::where('batch_no', $batchNo)->first();
        if ($existing) {
            $this->logService->log(
                direction: 'POS_TO_APP',
                system: 'POS',
                endpoint: '/api/v1/pos/storage-assignments',
                requestId: $requestId,
                httpStatus: 200,
                status: 'DUPLICATE',
                requestBody: ['batchNo' => $batchNo, 'total' => count($items)],
                responseBody: ['batchNo' => $existing->batch_no, 'status' => $existing->status, 'duplicate' => true],
            );

            return ['batch' => $existing->load('items'), 'isDuplicate' => true, 'requestId' => $requestId];
        }

        return DB::transaction(function () use ($batchNo, $requestId, $items) {
            $batch = StorageBatch::create([
                'batch_no' => $batchNo,
                'request_id' => $requestId,
                'total' => count($items),
                'accepted' => 0,
                'rejected' => 0,
                'status' => StorageBatch::STATUS_PENDING,
            ]);

            foreach ($items as $row) {
                $drawerCode = $row['drawerCode'] ?? $row['location'] ?? null;
                $location = $row['location'] ?? $row['drawerCode'] ?? null;
                StorageBatchItem::create([
                    'storage_batch_id' => $batch->id,
                    'voucher_no' => $row['voucherNo'],
                    'voucher_date' => $row['voucherDate'],
                    'bag_no' => $row['bagNo'],
                    'location' => $location,
                    'drawer_code' => $drawerCode,
                    'status' => StorageBatchItem::STATUS_PENDING,
                ]);

                // Upsert bag with initial location/drawer (spec v1.1: drawerCode is integration identifier)
                Bag::updateOrCreate(
                    ['bag_no' => $row['bagNo']],
                    [
                        'voucher_no' => $row['voucherNo'],
                        'voucher_date' => $row['voucherDate'],
                        'current_location' => $location,
                        'current_drawer_code' => $drawerCode,
                    ]
                );
            }

            $this->logService->log(
                direction: 'POS_TO_APP',
                system: 'POS',
                endpoint: '/api/v1/pos/storage-assignments',
                requestId: $requestId,
                httpStatus: 201,
                status: 'SUCCESS',
                requestBody: ['batchNo' => $batchNo, 'total' => count($items), 'requestId' => $requestId],
                responseBody: ['batchNo' => $batchNo, 'status' => $batch->status],
            );

            return ['batch' => $batch->load('items'), 'isDuplicate' => false, 'requestId' => $requestId];
        });
    }
}
