<?php

namespace App\Services\Integration;

use App\Models\LockerLocationEvent;
use App\Models\StorageBatch;

class IdempotencyService
{
    public function isBatchDuplicate(string $batchNo): bool
    {
        return StorageBatch::where('batch_no', $batchNo)->exists();
    }

    public function findBatchByNo(string $batchNo): ?StorageBatch
    {
        return StorageBatch::where('batch_no', $batchNo)->first();
    }

    public function isEventDuplicate(string $eventId): bool
    {
        return LockerLocationEvent::where('event_id', $eventId)->exists();
    }

    public function findEventById(string $eventId): ?LockerLocationEvent
    {
        return LockerLocationEvent::where('event_id', $eventId)->first();
    }
}
