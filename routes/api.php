<?php

use App\Http\Controllers\Api\Locker\LockerLocationUpdateController;
use App\Http\Controllers\Api\Pos\PosBagController;
use App\Http\Controllers\Api\Pos\PosStorageAssignmentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pawn Locker Integration — API Routes
|--------------------------------------------------------------------------
|
| POS → Integration App  : /api/v1/pos/*
| Locker → Integration   : /api/locker-integration/v1/*
|
| Integration App → Locker is outbound (LockerApiService) and not routed here.
| All IPs/URLs remain configurable via config/integration.php (spec §5-6).
|
*/

Route::prefix('v1')->group(function () {
    Route::prefix('pos')->middleware('pos.integration')->group(function () {
        Route::post('/storage-assignments', [PosStorageAssignmentController::class, 'store']);
        Route::get('/bags/{bagNo}', [PosBagController::class, 'show']);
        Route::get('/bags/{bagNo}/location', [PosBagController::class, 'location']);
        Route::get('/free-drawers', [\App\Http\Controllers\Api\Pos\PosDrawerController::class, 'index']);
    });
});

// Locker → App callbacks — v1.0 location-updates + v1.1 drawer-code-updates (spec 1.1 §23-24)
Route::prefix('locker-integration/v1')->group(function () {
    // Auth intentionally disabled for this callback: the locker calls it without a Bearer token.
    Route::post('/drawer-code-updates', [LockerLocationUpdateController::class, 'store']);

    Route::middleware('locker.integration')->group(function () {
        Route::post('/location-updates', [LockerLocationUpdateController::class, 'store']);
    });
});

// Health for System Status page (spec §37) — no invented Locker health endpoint
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'message' => 'Integration gateway healthy',
        'data' => [
            'app' => true,
            'timestamp' => now()->toIso8601String(),
        ],
    ]);
});
