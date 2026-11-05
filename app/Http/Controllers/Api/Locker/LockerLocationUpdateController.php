<?php

namespace App\Http\Controllers\Api\Locker;

use App\Http\Controllers\Controller;
use App\Http\Requests\Locker\StoreLocationUpdateRequest;
use App\Services\Locker\LockerLocationService;
use Illuminate\Http\JsonResponse;

class LockerLocationUpdateController extends Controller
{
    public function __construct(
        protected LockerLocationService $service,
    ) {}

    public function store(StoreLocationUpdateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->service->handleEvent($validated);

        $event = $result['event'];
        $isDuplicate = $result['isDuplicate'];

        if ($isDuplicate) {
            return response()->json([
                'success' => true,
                'message' => 'Duplicate event - already processed',
                'errorCode' => 'DUPLICATE_EVENT',
                'data' => [
                    'eventId' => $event->event_id,
                    'bagNo' => $event->bag_no,
                    'status' => $event->status,
                    'duplicate' => true,
                ],
            ], 200);
        }

        // v1.1 drawerCode support — return both
        return response()->json([
            'success' => true,
            'message' => 'Location update processed',
            'data' => [
                'eventId' => $event->event_id,
                'bagNo' => $event->bag_no,
                'oldLocation' => $event->old_location,
                'newLocation' => $event->new_location,
                'oldDrawerCode' => $event->old_drawer_code,
                'newDrawerCode' => $event->new_drawer_code,
                'currentLocation' => $event->new_location ?? $event->new_drawer_code,
                'currentDrawerCode' => $event->new_drawer_code ?? $event->new_location,
            ],
        ], 200);
    }
}
