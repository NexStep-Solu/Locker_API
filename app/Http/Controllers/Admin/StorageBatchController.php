<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendStorageAssignmentToLocker;
use App\Models\StorageBatch;
use App\Services\Locker\StorageAssignmentService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StorageBatchController extends Controller
{
    public function index(Request $request)
    {
        $query = StorageBatch::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('search')) {
            $query->where('batch_no', 'like', '%'.$request->string('search').'%');
        }

        $batches = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return Inertia::render('admin/storage-batches/index', [
            'batches' => $batches,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function create()
    {
        // Pure offline: no POS sync, gateway is manual Locker front-end
        return Inertia::render('admin/storage-batches/create', [
            'lockerApi' => [
                'url' => \App\Services\Locker\LockerConfig::baseUrl().'/storage-assignments/batch',
                'timeout' => \App\Services\Locker\LockerConfig::timeout(),
                'retryAttempts' => \App\Services\Locker\LockerConfig::retryAttempts(),
            ],
            'posSyncEnabled' => false,
        ]);
    }

    public function store(Request $request, StorageAssignmentService $service)
    {
        $validated = $request->validate([
            'batchNo' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'items' => ['required', 'array', 'min:1', 'max:1000'],
            'items.*.voucherNo' => ['required', 'string', 'max:100'],
            'items.*.voucherDate' => ['required', 'date_format:Y-m-d'],
            'items.*.bagNo' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'items.*.location' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-_]+$/'],
        ]);

        $requestId = $request->header('X-Request-Id');
        $result = $service->storeBatch($validated['batchNo'], $validated['items'], $requestId);
        $batch = $result['batch'];
        $isDuplicate = $result['isDuplicate'];

        if ($isDuplicate) {
            return redirect()->route('admin.storage-batches.show', $batch->id)
                ->with('warning', 'Duplicate batch — already processed');
        }

        SendStorageAssignmentToLocker::dispatch($batch->id);

        return redirect()->route('admin.storage-batches.show', $batch->id)
            ->with('success', 'Batch created and dispatched to Locker');
    }

    public function show(string $id)
    {
        $batch = StorageBatch::with('items')->findOrFail($id);

        return Inertia::render('admin/storage-batches/show', [
            'batch' => $batch,
        ]);
    }

    public function retry(string $id)
    {
        $batch = StorageBatch::findOrFail($id);

        if (! in_array($batch->status, ['FAILED', 'PARTIAL', 'RETRYING'], true)) {
            return back()->withErrors(['retry' => 'Only failed/partial/retrying batches can be retried']);
        }

        // Reset items that are FAILED/RETRYING to PENDING? Keep REJECTED as is unless forced retry
        // For simple retry, dispatch job again with same batchNo+requestId
        $batch->update(['status' => 'PENDING']);

        SendStorageAssignmentToLocker::dispatch($batch->id);

        return back()->with('success', 'Retry dispatched for '.$batch->batch_no);
    }
}
