<?php

namespace App\Services\Locker;

use App\Models\Bag;
use App\Models\LockerLocationEvent;
use App\Services\Integration\IntegrationLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LockerLocationService
{
    public function __construct(
        protected IntegrationLogService $logService,
    ) {}

    /**
     * Pure offline Windows App: Locker is authoritative for drawerCode (v1.1) / location (v1.0).
     * No POS sync — gateway is system of record. Idempotent on event_id. Supports both v1.0 (LOC) and v1.1 (DRW).
     *
     * @param  array{eventId:string, eventType:string, bagNo:string, voucherNo:string, oldLocation?:string, newLocation?:string, oldDrawerCode?:string, newDrawerCode?:string, movementType:string, occurredAt:string}  $data
     * @return array{event: LockerLocationEvent, isDuplicate: bool}
     */
    public function handleEvent(array $data): array
    {
        $eventId = $data['eventId'];

        $existing = LockerLocationEvent::where('event_id', $eventId)->first();
        if ($existing) {
            $this->logService->log(
                direction: 'LOCKER_TO_APP',
                system: 'LOCKER',
                endpoint: '/api/locker-integration/v1/location-updates',
                eventId: $eventId,
                httpStatus: 200,
                status: 'DUPLICATE',
                requestBody: $data,
                responseBody: ['eventId' => $eventId, 'duplicate' => true, 'status' => $existing->status],
            );

            return ['event' => $existing, 'isDuplicate' => true];
        }

        return DB::transaction(function () use ($data, $eventId) {
            // Normalize v1.1 drawerCode and v1.0 location (both supported)
            $newDrawer = $data['newDrawerCode'] ?? $data['newLocation'] ?? null;
            $oldDrawer = $data['oldDrawerCode'] ?? $data['oldLocation'] ?? null;
            $newLoc = $data['newLocation'] ?? $data['newDrawerCode'] ?? null;
            $oldLoc = $data['oldLocation'] ?? $data['oldDrawerCode'] ?? null;

            $bag = Bag::where('bag_no', $data['bagNo'])->lockForUpdate()->first();

            if (! $bag) {
                Log::info('LockerLocationService: unknown bag, creating placeholder', ['bagNo' => $data['bagNo']]);
                $bag = Bag::create([
                    'bag_no' => $data['bagNo'],
                    'voucher_no' => $data['voucherNo'],
                    'voucher_date' => null,
                    'current_location' => $newLoc,
                    'current_drawer_code' => $newDrawer,
                    'last_locker_update_at' => $data['occurredAt'],
                    'last_locker_event_id' => $eventId,
                ]);
            } else {
                $expectedLoc = $bag->current_drawer_code ?? $bag->current_location;
                $receivedOld = $oldDrawer ?? $oldLoc;
                if ($expectedLoc !== null && $expectedLoc !== $receivedOld) {
                    Log::warning('LockerLocationService: old drawer/location mismatch', [
                        'bagNo' => $data['bagNo'],
                        'expected' => $expectedLoc,
                        'received_old' => $receivedOld,
                        'new' => $newDrawer ?? $newLoc,
                    ]);
                }

                $bag->update([
                    'current_location' => $newLoc,
                    'current_drawer_code' => $newDrawer,
                    'last_locker_update_at' => $data['occurredAt'],
                    'last_locker_event_id' => $eventId,
                    'voucher_no' => $data['voucherNo'],
                ]);
            }

            $event = LockerLocationEvent::create([
                'event_id' => $eventId,
                'event_type' => $data['eventType'],
                'bag_no' => $data['bagNo'],
                'voucher_no' => $data['voucherNo'],
                'old_location' => $oldLoc,
                'old_drawer_code' => $oldDrawer,
                'new_location' => $newLoc,
                'new_drawer_code' => $newDrawer,
                'movement_type' => $data['movementType'],
                'occurred_at' => $data['occurredAt'],
                'processed_at' => now(),
                'status' => LockerLocationEvent::STATUS_PROCESSED,
            ]);

            // Pure offline: no POS sync — gateway is authoritative, viewed in admin/bags
            Log::info('LockerLocationService: offline mode — POS sync skipped', ['bagNo' => $data['bagNo'], 'eventId' => $eventId]);

            $this->logService->log(
                direction: 'LOCKER_TO_APP',
                system: 'LOCKER',
                endpoint: '/api/locker-integration/v1/'.(isset($data['newDrawerCode']) ? 'drawer-code-updates' : 'location-updates'),
                eventId: $eventId,
                httpStatus: 200,
                status: 'SUCCESS',
                requestBody: $data,
                responseBody: ['eventId' => $eventId, 'bagNo' => $data['bagNo'], 'newDrawerCode' => $newDrawer, 'newLocation' => $newLoc],
            );

            return ['event' => $event, 'isDuplicate' => false];
        });
    }
}
