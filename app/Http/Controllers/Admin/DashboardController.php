<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bag;
use App\Models\IntegrationLog;
use App\Models\LockerLocationEvent;
use App\Models\StorageBatch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $today = now()->toDateString();

        $todayBatches = StorageBatch::whereDate('created_at', $today);
        $todayBags = Bag::whereDate('created_at', $today); // fallback; better count batch items today

        // Metrics
        $storageTodayCount = StorageBatch::whereDate('created_at', $today)->count();
        $bagsToday = \App\Models\StorageBatchItem::whereHas('batch', fn ($q) => $q->whereDate('created_at', $today))->count();
        $acceptedToday = \App\Models\StorageBatchItem::whereHas('batch', fn ($q) => $q->whereDate('created_at', $today))->where('status', 'ACCEPTED')->count();
        $rejectedToday = \App\Models\StorageBatchItem::whereHas('batch', fn ($q) => $q->whereDate('created_at', $today))->where('status', 'REJECTED')->count();

        $locationReceived = LockerLocationEvent::whereDate('created_at', $today)->count();
        // Pure offline: gateway is authoritative, no POS sync
        $failedRequests = IntegrationLog::whereDate('created_at', $today)->where('status', 'FAILED')->count();
        $failedBatches = StorageBatch::where('status', 'FAILED')->count();

        // Connection checks (lightweight, no invented Locker health endpoint per spec §37)
        $posConnected = $this->checkPosConnection();
        $lockerConnected = $this->checkLockerConnection();

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'posConnected' => $posConnected,
                'lockerConnected' => $lockerConnected,
                'storageToday' => [
                    'batches' => $storageTodayCount,
                    'bags' => $bagsToday,
                    'accepted' => $acceptedToday,
                    'rejected' => $rejectedToday,
                ],
                'locationUpdates' => [
                    'received' => $locationReceived,
                ],
                'failedRequests' => $failedRequests,
                'failedBatches' => $failedBatches,
            ],
            'recentBatches' => StorageBatch::orderByDesc('created_at')->limit(5)->get(['id', 'batch_no', 'total', 'accepted', 'rejected', 'status', 'created_at']),
            'recentEvents' => LockerLocationEvent::orderByDesc('created_at')->limit(5)->get(['id', 'event_id', 'bag_no', 'old_location', 'new_location', 'old_drawer_code', 'new_drawer_code', 'movement_type', 'status', 'created_at']),
        ]);
    }

    private function checkPosConnection(): ?bool
    {
        // Pure offline Windows App: always offline
        return null;
    }

    private function checkLockerConnection(): ?bool
    {
        $recentLockerLog = IntegrationLog::where('system', 'LOCKER')->where('direction', 'APP_TO_LOCKER')->orderByDesc('created_at')->first();
        if (! $recentLockerLog) {
            return null;
        }

        return $recentLockerLog->status === 'SUCCESS' && $recentLockerLog->created_at->isAfter(now()->subHours(24));
    }
}
