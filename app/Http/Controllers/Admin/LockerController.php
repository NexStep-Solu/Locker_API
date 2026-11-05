<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Locker\LockerApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LockerController extends Controller
{
    public function drawers(LockerApiService $locker, Request $request)
    {
        $availableOnly = $request->boolean('available', true);
        $result = $locker->getDrawers($availableOnly);

        if ($request->expectsJson() || $request->isJson()) {
            return $this->lockerResponse($result);
        }

        return Inertia::render('admin/locker/drawers', [
            'drawers' => $result['drawers'] ?? [],
            'success' => $result['success'] ?? false,
            'raw' => $result['body'] ?? null,
        ]);
    }

    public function bagsPage()
    {
        return Inertia::render('admin/locker/bags');
    }

    public function queryBags(LockerApiService $locker, Request $request)
    {
        $data = $request->validate(['bagNos' => ['required', 'array'], 'bagNos.*' => ['string']]);
        $result = $locker->queryBags($data['bagNos']);

        return $this->lockerResponse($result);
    }

    public function getBag(LockerApiService $locker, string $bagNo)
    {
        $result = $locker->getBag($bagNo);

        return $this->lockerResponse($result);
    }

    /**
     * Normalize a Locker service result into a valid JSON response.
     *
     * The service uses httpStatus 0 when the locker is unreachable. Passing 0
     * to response()->json() throws an InvalidArgumentException, so map it to
     * 502 Bad Gateway and give the UI a predictable error body.
     */
    private function lockerResponse(array $result): JsonResponse
    {
        $status = (int) ($result['httpStatus'] ?? 200);

        if ($status < 100 || $status > 599) {
            $status = 502;
        }

        $body = $result['body'] ?? [];

        if (! is_array($body) || $body === []) {
            $body = [
                'success' => false,
                'message' => $result['error'] ?? 'The locker did not respond. Check the locker connection in Settings.',
                'errorCode' => 'LOCKER_UNAVAILABLE',
            ];
        }

        return response()->json($body, $status);
    }
}
