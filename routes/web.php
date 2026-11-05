<?php

use App\Http\Controllers\Admin\BagController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\IntegrationLogController;
use App\Http\Controllers\Admin\LocationUpdateController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StorageBatchController;
use App\Http\Controllers\Admin\SystemStatusController;
use App\Http\Controllers\Mock\MockLockerController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Mock Locker APIs — no session auth, token checked inside controller (for Gateway → Mock)
Route::post('/mock/locker/api/integration/v1/storage-assignments/batch', [MockLockerController::class, 'storageBatch'])->name('mock.locker.api.batch');
Route::get('/mock/locker/api/integration/v1/drawers', [MockLockerController::class, 'drawers'])->name('mock.locker.api.drawers');
Route::post('/mock/locker/api/integration/v1/bags/query', [MockLockerController::class, 'queryBags'])->name('mock.locker.api.queryBags');
Route::get('/mock/locker/api/integration/v1/bags/{bagNo}', [MockLockerController::class, 'getBag'])->name('mock.locker.api.getBag');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Mock Locker UI for testing (pure offline) — simulates physical locker
    Route::prefix('mock/locker')->name('mock.locker.')->group(function () {
        Route::get('/', [MockLockerController::class, 'dashboard'])->name('dashboard');
        Route::post('/consolidate', [MockLockerController::class, 'consolidate'])->name('consolidate');
        Route::post('/bag-out', [MockLockerController::class, 'bagOut'])->name('bagOut');
        Route::post('/clear', [MockLockerController::class, 'clear'])->name('clear');
    });

    // Pawn Locker Integration — Admin UI (spec §32)
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/storage-batches', [StorageBatchController::class, 'index'])->name('storage-batches.index');
        Route::get('/storage-batches/create', [StorageBatchController::class, 'create'])->name('storage-batches.create');
        Route::post('/storage-batches', [StorageBatchController::class, 'store'])->name('storage-batches.store');
        Route::get('/storage-batches/{id}', [StorageBatchController::class, 'show'])->name('storage-batches.show');
        Route::post('/storage-batches/{id}/retry', [StorageBatchController::class, 'retry'])->name('storage-batches.retry');

        Route::get('/bags', [BagController::class, 'index'])->name('bags.index');
        Route::get('/bags/export', [BagController::class, 'export'])->name('bags.export');
        Route::get('/bags/{bagNo}', [BagController::class, 'show'])->name('bags.show');

        Route::get('/location-updates', [LocationUpdateController::class, 'index'])->name('location-updates.index');

        Route::get('/integration-logs', [IntegrationLogController::class, 'index'])->name('integration-logs.index');
        Route::get('/integration-logs/{id}', [IntegrationLogController::class, 'show'])->name('integration-logs.show');

        Route::get('/failed-integrations', [IntegrationLogController::class, 'failed'])->name('failed-integrations.index');

        Route::get('/system-status', [SystemStatusController::class, 'index'])->name('system-status.index');
        Route::get('/system-status/check', [SystemStatusController::class, 'check'])->name('system-status.check');

        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');

        // Locker proxy for UI (drawers + bag verification) — uses server-side LockerApiService (Bearer never exposed)
        Route::get('/locker/drawers', [\App\Http\Controllers\Admin\LockerController::class, 'drawers'])->name('locker.drawers');
        Route::get('/locker/bags', [\App\Http\Controllers\Admin\LockerController::class, 'bagsPage'])->name('locker.bags.page');
        Route::post('/locker/bags/query', [\App\Http\Controllers\Admin\LockerController::class, 'queryBags'])->name('locker.bags.query');
        Route::get('/locker/bags/{bagNo}', [\App\Http\Controllers\Admin\LockerController::class, 'getBag'])->name('locker.bags.get');
    });
});

require __DIR__.'/settings.php';
