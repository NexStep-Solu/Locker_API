<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StoreStorageAssignmentRequest;
use App\Jobs\SendStorageAssignmentToLocker;
use App\Services\Locker\StorageAssignmentService;
use Illuminate\Http\JsonResponse;

class PosStorageAssignmentController extends Controller
{
    public function __construct(
        protected StorageAssignmentService $service,
    ) {}

    public function store(StoreStorageAssignmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // X-Request-Id must be stable for retry (spec §10, §13)
        $requestId = $request->header('X-Request-Id') ?: $request->header('X-Request-ID');

        $result = $this->service->storeBatch(
            batchNo: $validated['batchNo'],
            items: $validated['items'],
            requestId: $requestId,
        );

        /** @var \App\Models\StorageBatch $batch */
        $batch = $result['batch'];
        $isDuplicate = $result['isDuplicate'];
        $requestId = $result['requestId'];

        if ($isDuplicate) {
            return response()->json([
                'success' => true,
                'message' => 'Duplicate batch - already processed',
                'errorCode' => 'DUPLICATE_BATCH',
                'data' => [
                    'batchNo' => $batch->batch_no,
                    'requestId' => $batch->request_id,
                    'total' => $batch->total,
                    'accepted' => $batch->accepted,
                    'rejected' => $batch->rejected,
                    'status' => $batch->status,
                    'duplicate' => true,
                ],
            ], 200);
        }

        // Queue Locker sync — respects queue connection database (spec §6, §29)
        // If QUEUE_CONNECTION=sync, this runs inline (useful for tests).
        SendStorageAssignmentToLocker::dispatch($batch->id);

        return response()->json([
            'success' => true,
            'message' => 'Storage assignment accepted',
            'data' => [
                'batchNo' => $batch->batch_no,
                'requestId' => $requestId,
                'total' => $batch->total,
                'status' => $batch->status,
                'items' => $batch->items->map(fn ($i) => [
                    'voucherNo' => $i->voucher_no,
                    'voucherDate' => $i->voucher_date instanceof \DateTimeInterface ? $i->voucher_date->format('Y-m-d') : $i->voucher_date,
                    'bagNo' => $i->bag_no,
                    'location' => $i->location,
                    'status' => $i->status,
                ]),
            ],
        ], 201);
    }
}
