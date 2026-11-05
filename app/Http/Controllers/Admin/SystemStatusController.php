<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class SystemStatusController extends Controller
{
    public function index()
    {
        $dbHealthy = $this->checkDatabase();
        $queueRunning = $this->checkQueue();
        $posApi = $this->checkPos();
        $lockerApi = $this->checkLocker();

        return Inertia::render('admin/system-status/index', [
            'status' => [
                'app' => true,
                'database' => $dbHealthy,
                'queue' => $queueRunning,
                'pos' => $posApi,
                'locker' => $lockerApi,
                'timestamp' => now()->toIso8601String(),
            ],
        ]);
    }

    public function check()
    {
        return response()->json([
            'app' => true,
            'database' => $this->checkDatabase(),
            'queue' => $this->checkQueue(),
            'pos' => $this->checkPos(),
            'locker' => $this->checkLocker(),
        ]);
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            DB::select('select 1');

            return ['healthy' => true, 'message' => 'Healthy'];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'message' => $e->getMessage()];
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = DB::table('jobs')->count();
            $failed = DB::table('failed_jobs')->count();

            return ['healthy' => true, 'message' => "Pending: {$pending}, Failed: {$failed}", 'pending' => $pending, 'failed' => $failed];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'message' => $e->getMessage()];
        }
    }

    private function checkPos(): array
    {
        // Pure Offline Windows App: no POS_API_URL expected
        $url = config('integration.pos.api_url');
        $syncEnabled = (bool) config('integration.pos.sync_enabled');
        if (empty($url) || ! $syncEnabled) {
            return ['healthy' => null, 'message' => 'Offline mode — POS is pure C# core with no network. Gateway is manual Locker-API front-end (input/scan → Locker). No POS push.'];
        }

        $recent = \App\Models\IntegrationLog::where('system', 'POS')->orderByDesc('created_at')->first();
        $recentStatus = $recent ? $recent->status.' ('.$recent->created_at->diffForHumans().')' : 'No recent POS logs';

        return ['healthy' => null, 'message' => "Configured: {$url} | Last: {$recentStatus}", 'url' => $url];
    }

    private function checkLocker(): array
    {
        $url = \App\Services\Locker\LockerConfig::baseUrl();
        if (empty($url)) {
            return ['healthy' => false, 'message' => 'LOCKER_API_URL not configured'];
        }

        $recent = \App\Models\IntegrationLog::where('system', 'LOCKER')->orderByDesc('created_at')->first();
        $recentStatus = $recent ? $recent->status.' ('.$recent->created_at->diffForHumans().')' : 'No recent Locker logs';

        return ['healthy' => null, 'message' => "Configured: {$url} | Last: {$recentStatus}", 'url' => $url];
    }
}
