<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\Bag;
use Illuminate\Http\JsonResponse;

class PosBagController extends Controller
{
    public function show(string $bagNo): JsonResponse
    {
        $bag = Bag::where('bag_no', $bagNo)->first();

        if (! $bag) {
            return response()->json([
                'success' => false,
                'message' => 'Bag not found',
                'errorCode' => 'BAG_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Bag retrieved',
            'data' => [
                'bagNo' => $bag->bag_no,
                'voucherNo' => $bag->voucher_no,
                'voucherDate' => $bag->voucher_date instanceof \DateTimeInterface ? $bag->voucher_date->format('Y-m-d') : $bag->voucher_date,
                'currentLocation' => $bag->current_location,
                'currentDrawerCode' => $bag->current_drawer_code ?? $bag->current_location,
                'lastLockerUpdateAt' => $bag->last_locker_update_at?->toIso8601String(),
                'lastLockerEventId' => $bag->last_locker_event_id,
            ],
        ]);
    }

    public function location(string $bagNo): JsonResponse
    {
        $bag = Bag::where('bag_no', $bagNo)->first();

        if (! $bag) {
            return response()->json([
                'success' => false,
                'message' => 'Bag not found',
                'errorCode' => 'BAG_NOT_FOUND',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Bag location retrieved',
            'data' => [
                'bagNo' => $bag->bag_no,
                'currentLocation' => $bag->current_location,
                'currentDrawerCode' => $bag->current_drawer_code ?? $bag->current_location,
                'lastLockerUpdateAt' => $bag->last_locker_update_at?->toIso8601String(),
                'lastLockerEventId' => $bag->last_locker_event_id,
            ],
        ]);
    }
}
