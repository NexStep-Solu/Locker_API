<?php

namespace App\Http\Controllers\Mock;

use App\Http\Controllers\Controller;
use App\Models\Mock\MockLockerBag;
use App\Models\Mock\MockLockerLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MockLockerController extends Controller
{
    // Approved identifiers for test — v1.1 drawer codes (D001 etc) + v1.0 locations backward compat
    private array $approvedLocations = [
        'C1-R1','C1-R2','C1-R3','C1-R4','C1-R5','C1-R6','C1-R7','C1-R8',
        'C2-R1','C2-R2','C2-R3','C2-R4','C2-R5','C2-R6','C2-R7','C2-R8',
        'C3-R1','C3-R2','C3-R3','C3-R4','C3-R5','C3-R6','C3-R7','C3-R8',
        'D001','D002','D003','D101','D102','D103','D301','D302','D303',
    ];

    public function dashboard()
    {
        return Inertia::render('mock/locker', [
            'bags' => MockLockerBag::orderByDesc('updated_at')->limit(50)->get(),
            'logs' => MockLockerLog::orderByDesc('created_at')->limit(20)->get(),
            'approvedLocations' => $this->approvedLocations,
            'lockerApiUrl' => config('integration.locker.api_url'),
            'gatewayUrl' => config('app.url').'/api/locker-integration/v1/location-updates',
        ]);
    }

    // Mock Locker API: POST /mock/locker/api/integration/v1/storage-assignments/batch
    // Simulates real Locker System (spec §9) — called by Gateway's LockerApiService
    public function storageBatch(Request $request)
    {
        $token = $request->bearerToken();
        $expected = config('integration.locker.api_token') ?: 'dev-locker-token-change-me';
        // In mock, accept dev token or any when APP_ENV != production
        if (! hash_equals((string) $expected, (string) $token) && app()->environment('production')) {
            MockLockerLog::create(['direction'=>'MOCK_APP_TO_LOCKER','endpoint'=>'/storage-assignments/batch','http_status'=>401,'status'=>'FAILED','payload'=>['error'=>'auth']]);
            return response()->json(['success'=>false,'message'=>'Authentication failed','errorCode'=>'AUTH_FAILED'], 401);
        }

        $data = $request->validate([
            'batchNo' => ['required','string','max:100'],
            'items' => ['required','array','min:1'],
            'items.*.voucherNo' => ['required','string'],
            'items.*.voucherDate' => ['required','string'],
            'items.*.bagNo' => ['required','string'],
            'items.*.location' => ['nullable','string'],
            'items.*.drawerCode' => ['nullable','string'],
        ]);

        $requestId = $request->header('X-Request-Id') ?: $request->query('X-Request-Id');

        $accepted = 0;
        $rejected = 0;
        $rejectedItems = [];

        foreach ($data['items'] as $item) {
            $identifier = $item['drawerCode'] ?? $item['location'] ?? null;
            $loc = $item['location'] ?? $item['drawerCode'] ?? null;
            $drawer = $item['drawerCode'] ?? $item['location'] ?? null;
            // Simulate: invalid drawer/location → reject
            if (! in_array($identifier, $this->approvedLocations, true)) {
                $rejected++;
                $errorCode = isset($item['drawerCode']) ? 'INVALID_DRAWER_CODE' : 'INVALID_LOCATION';
                $rejectedItems[] = ['bagNo'=>$item['bagNo'],'drawerCode'=>$drawer,'location'=>$loc,'errorCode'=>$errorCode,'message'=>"Drawer $identifier not approved"];
                MockLockerLog::create(['direction'=>'MOCK_APP_TO_LOCKER','endpoint'=>'/storage-assignments/batch','request_id'=>$requestId,'http_status'=>200,'status'=>'REJECTED','payload'=>$item]);
                continue;
            }

            MockLockerBag::updateOrCreate(
                ['bag_no' => $item['bagNo']],
                ['voucher_no'=>$item['voucherNo'],'voucher_date'=>$item['voucherDate'],'location'=>$loc,'drawer_code'=>$drawer,'status'=>'STORED','batch_no'=>$data['batchNo'],'stored_at'=>now()]
            );
            $accepted++;
        }

        $rejectedCount = count($rejectedItems);
        $status = $rejectedCount === 0 ? 'SUCCESS' : ($accepted === 0 ? 'FAILED' : 'PARTIAL');
        $httpStatus = 200;
        $body = [
            'success' => $rejectedCount === 0 || $accepted > 0,
            'message' => $rejectedCount === 0 ? 'Storage assignment processed' : "Batch processed with rejected items",
            'data' => ['total'=> count($data['items']), 'accepted'=>$accepted, 'rejected'=>$rejectedCount],
        ];
        if ($rejectedCount > 0) {
            // v1.1 uses INVALID_DRAWER_CODE / DRAWER_NOT_AVAILABLE
            $hasDrawer = collect($data['items'])->contains(fn($i) => !empty($i['drawerCode']));
            $body['errorCode'] = $hasDrawer ? 'INVALID_DRAWER_CODE' : 'INVALID_LOCATION';
            $body['data']['rejectedItems'] = $rejectedItems;
            $body['data']['errors'] = $rejectedItems; // v1.1 uses errors
        }

        MockLockerLog::create([
            'direction'=>'MOCK_APP_TO_LOCKER',
            'endpoint'=>'/storage-assignments/batch',
            'request_id'=>$requestId,
            'http_status'=>$httpStatus,
            'status'=>$status,
            'payload'=>['batchNo'=>$data['batchNo'],'accepted'=>$accepted,'rejected'=>$rejectedCount],
        ]);

        return response()->json($body, $httpStatus);
    }

    // GET /mock/locker/api/integration/v1/drawers?available=true — v1.1 new
    public function drawers(Request $request)
    {
        $token = $request->bearerToken();
        $expected = config('integration.locker.api_token') ?: 'dev-locker-token-change-me';
        if (! hash_equals((string) $expected, (string) $token) && app()->environment('production')) {
            return response()->json(['success'=>false,'message'=>'Authentication failed','errorCode'=>'AUTH_FAILED'], 401);
        }

        $available = $request->query('available') === 'true';
        $drawers = [];
        foreach ($this->approvedLocations as $code) {
            // Simulate: D009 has no controller, D010 etc hardwareReady variations per real example
            $isAvailable = in_array($code, ['D001','D002','D003','D004','D005','D006','D007','D008','D010'], true);
            if ($available && ! $isAvailable) continue;
            $drawers[] = [
                'code' => $code,
                'zoneNo' => str_starts_with($code, 'D0') ? 'ZONE A' : 'ZONE B',
                'rowNo' => 'R'.substr($code, 1, 1),
                'columnNo' => 'C'.substr($code, 1),
                'status' => $isAvailable ? 'available' : 'unavailable',
                'lockStatus' => 'locked',
                'enabled' => true,
                'maintenance' => false,
                'hardwareReady' => $code !== 'D009',
                'unavailableReason' => $code === 'D009' ? 'Drawer D009 has no controller assigned.' : null,
                'updatedAt' => now()->toIso8601String(),
            ];
        }

        // Sort to match real example: D001, D002, D003, D010, D004...
        // Keep as defined order
        return response()->json(['success'=>true,'message'=>'Drawers retrieved','data'=>['total'=>count($drawers),'drawers'=>$drawers]]);
    }

    // POST /mock/locker/api/integration/v1/bags/query {bagNos:[]}
    public function queryBags(Request $request)
    {
        $token = $request->bearerToken();
        $expected = config('integration.locker.api_token') ?: 'dev-locker-token-change-me';
        if (! hash_equals((string) $expected, (string) $token) && app()->environment('production')) {
            return response()->json(['success'=>false,'message'=>'Authentication failed'], 401);
        }

        $data = $request->validate(['bagNos'=>['required','array'],'bagNos.*'=>['string']]);
        $bags = MockLockerBag::whereIn('bag_no', $data['bagNos'])->get();
        $found = $bags->map(fn($b) => [
            'bagNo'=>$b->bag_no,'voucherNo'=>$b->voucher_no,'voucherDate'=>$b->voucher_date ? $b->voucher_date : null,
            'status'=>$b->status,'drawerCode'=>$b->drawer_code ?? $b->location,'removedAt'=>null,'updatedAt'=>$b->updated_at?->toIso8601String(),
        ])->toArray();
        $missing = array_values(array_diff($data['bagNos'], $bags->pluck('bag_no')->toArray()));

        return response()->json(['success'=>true,'message'=>'Bags retrieved','data'=>['totalRequested'=>count($data['bagNos']),'found'=>count($found),'missing'=>count($missing),'bags'=>$found,'missingBagNos'=>$missing]]);
    }

    // GET /mock/locker/api/integration/v1/bags/{bagNo}
    public function getBag(string $bagNo, Request $request)
    {
        $token = $request->bearerToken();
        $expected = config('integration.locker.api_token') ?: 'dev-locker-token-change-me';
        if (! hash_equals((string) $expected, (string) $token) && app()->environment('production')) {
            return response()->json(['success'=>false,'message'=>'Authentication failed'], 401);
        }

        $bag = MockLockerBag::where('bag_no', $bagNo)->first();
        if (! $bag) return response()->json(['success'=>false,'message'=>'Bag not found','errorCode'=>'BAG_NOT_FOUND'], 404);

        return response()->json(['success'=>true,'message'=>'Bag retrieved','data'=>[
            'bagNo'=>$bag->bag_no,'voucherNo'=>$bag->voucher_no,'voucherDate'=>$bag->voucher_date ? $bag->voucher_date : null,
            'status'=>$bag->status,'drawerCode'=>$bag->drawer_code ?? $bag->location,'removedAt'=>null,'updatedAt'=>$bag->updated_at?->toIso8601String(),
        ]]);
    }

    // Physical simulation: Consolidation D001 → D301 (v1.1) or C1-R1 → C3-R8 (v1.0)
    public function consolidate(Request $request)
    {
        $data = $request->validate([
            'bagNo' => ['required','string'],
            'newLocation' => ['nullable','string','in:'.implode(',', $this->approvedLocations)],
            'newDrawerCode' => ['nullable','string','in:'.implode(',', $this->approvedLocations)],
        ]);

        $bag = MockLockerBag::where('bag_no', $data['bagNo'])->first();
        if (! $bag) {
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json(['success'=>false,'message'=>'Bag not found','errorCode'=>'BAG_NOT_FOUND'], 404);
            }
            return back()->withErrors(['bagNo' => 'Bag not found']);
        }

        $oldDrawer = $bag->drawer_code ?? $bag->location;
        $newDrawer = $data['newDrawerCode'] ?? $data['newLocation'] ?? null;
        if (! $newDrawer) {
            return response()->json(['success'=>false,'message'=>'newDrawerCode or newLocation required'], 422);
        }
        if ($oldDrawer === $newDrawer) {
            return response()->json(['success'=>false,'message'=>'Already at drawer'], 422);
        }

        $bag->update(['location'=>$newDrawer,'drawer_code'=>$newDrawer,'status'=>'STORED']);

        // v1.1 eventId DRW-..., type BAG_DRAWER_CHANGED
        $eventId = 'DRW-MOCK-'.now()->format('YmdHis').'-'.rand(100,999);
        $payload = [
            'eventId' => $eventId,
            'eventType' => 'BAG_DRAWER_CHANGED',
            'bagNo' => $bag->bag_no,
            'voucherNo' => $bag->voucher_no,
            'oldDrawerCode' => $oldDrawer,
            'newDrawerCode' => $newDrawer,
            'oldLocation' => $oldDrawer, // keep for backward
            'newLocation' => $newDrawer,
            'movementType' => 'CONSOLIDATION',
            'occurredAt' => now()->toIso8601String(),
        ];

        // Call gateway directly via service (no HTTP needed for test, works offline)
        try {
            $service = app(\App\Services\Locker\LockerLocationService::class);
            $result = $service->handleEvent($payload);
            $event = $result['event'];
            $isDuplicate = $result['isDuplicate'];

            MockLockerLog::create([
                'direction'=>'MOCK_LOCKER_TO_APP',
                'endpoint'=>'/location-updates',
                'event_id'=>$eventId,
                'http_status'=>200,
                'status'=> $isDuplicate ? 'DUPLICATE' : 'SUCCESS',
                'payload'=>$payload,
            ]);

            if ($request->expectsJson() || $request->isJson()) {
                return response()->json([
                    'success'=> true,
                    'message'=> $isDuplicate ? 'Duplicate event' : 'Consolidation notified to Gateway',
                    'data'=> ['eventId'=>$eventId,'oldDrawerCode'=>$oldDrawer,'newDrawerCode'=>$newDrawer,'oldLocation'=>$oldDrawer,'newLocation'=>$newDrawer,'isDuplicate'=>$isDuplicate],
                ], 200);
            }

            return back()->with('success', $isDuplicate ? 'Duplicate event' : "Consolidated {$bag->bag_no} $oldDrawer → $newDrawer and notified gateway");
        } catch (\Throwable $e) {
            Log::error('Mock consolidate failed', ['error'=>$e->getMessage()]);
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json(['success'=>false,'message'=>$e->getMessage()], 500);
            }
            return back()->withErrors(['consolidate' => $e->getMessage()]);
        }
    }

    public function bagOut(Request $request)
    {
        $data = $request->validate(['bagNo'=>['required','string']]);
        $bag = MockLockerBag::where('bag_no', $data['bagNo'])->first();
        if (! $bag) {
            if ($request->expectsJson() || $request->isJson()) {
                return response()->json(['success'=>false,'errorCode'=>'BAG_NOT_FOUND'], 404);
            }
            return back()->withErrors(['bagOut' => 'Bag not found']);
        }

        $loc = $bag->location;
        $bag->update(['status'=>'OUT']);

        MockLockerLog::create(['direction'=>'MOCK_PHYSICAL','endpoint'=>'/bag-out','http_status'=>200,'status'=>'OUT','payload'=>['bagNo'=>$bag->bag_no,'location'=>$loc]]);

        if ($request->expectsJson() || $request->isJson()) {
            return response()->json(['success'=>true,'message'=>"Bag {$bag->bag_no} OUT from $loc — door opened (mock)"]);
        }

        return back()->with('success', "Bag {$bag->bag_no} OUT from $loc — door opened (mock)");
    }

    public function clear()
    {
        MockLockerBag::truncate();
        MockLockerLog::truncate();
        return back()->with('success', 'Mock Locker cleared');
    }
}
