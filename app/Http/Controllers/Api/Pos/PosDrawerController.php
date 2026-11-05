<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Services\Locker\LockerApiService;
use Illuminate\Http\JsonResponse;

class PosDrawerController extends Controller
{
    public function __construct(
        protected LockerApiService $locker,
    ) {}

    public function index(): JsonResponse
    {
        $result = $this->locker->getDrawers(availableOnly: true);
        $drawers = $result['drawers'] ?? [];

        if (! is_array($drawers)) {
            $drawers = [];
        }

        $free = array_values(array_filter($drawers, function ($d) {
            return ($d['status'] ?? '') === 'available'
                && ($d['enabled'] ?? true) !== false
                && ($d['maintenance'] ?? false) !== true;
        }));

        $normalized = array_map(function ($d) {
            return [
                'code' => $d['code'] ?? null,
                'status' => $d['status'] ?? 'unknown',
                'enabled' => $d['enabled'] ?? true,
                'maintenance' => $d['maintenance'] ?? false,
                'updatedAt' => $d['updatedAt'] ?? $d['updated_at'] ?? null,
            ];
        }, $free);

        return response()->json([
            'success' => true,
            'message' => 'Free drawers retrieved',
            'data' => [
                'count' => count($normalized),
                'drawers' => $normalized,
            ],
        ], 200);
    }
}
