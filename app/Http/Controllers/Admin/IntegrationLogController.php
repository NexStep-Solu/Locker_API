<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IntegrationLogController extends Controller
{
    public function index(Request $request)
    {
        $query = IntegrationLog::query();

        if ($request->filled('direction')) {
            $query->where('direction', $request->string('direction'));
        }
        if ($request->filled('system')) {
            $query->where('system', $request->string('system'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('http_status')) {
            $query->where('http_status', $request->integer('http_status'));
        }
        if ($request->filled('request_id')) {
            $query->where('request_id', 'like', '%'.$request->string('request_id').'%');
        }
        if ($request->filled('event_id')) {
            $query->where('event_id', 'like', '%'.$request->string('event_id').'%');
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to'));
        }

        $logs = $query->orderByDesc('created_at')->paginate(25)->withQueryString();

        return Inertia::render('admin/integration-logs/index', [
            'logs' => $logs,
            'filters' => $request->only(['direction', 'system', 'status', 'http_status', 'request_id', 'event_id', 'date_from', 'date_to']),
        ]);
    }

    public function show(string $id)
    {
        $log = IntegrationLog::findOrFail($id);

        return Inertia::render('admin/integration-logs/show', [
            'log' => $log,
        ]);
    }

    public function failed(Request $request)
    {
        $query = IntegrationLog::where('status', 'FAILED');

        if ($request->filled('direction')) {
            $query->where('direction', $request->string('direction'));
        }

        $logs = $query->orderByDesc('created_at')->paginate(25)->withQueryString();

        $failedBatches = \App\Models\StorageBatch::where('status', 'FAILED')->orderByDesc('created_at')->limit(10)->get();

        return Inertia::render('admin/failed-integrations/index', [
            'logs' => $logs,
            'failedBatches' => $failedBatches,
            'filters' => $request->only('direction'),
        ]);
    }
}
