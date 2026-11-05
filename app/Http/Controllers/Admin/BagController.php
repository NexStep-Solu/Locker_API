<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Bag;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BagController extends Controller
{
    public function index(Request $request)
    {
        $query = Bag::query();

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('bag_no', 'like', "%{$s}%")
                    ->orWhere('voucher_no', 'like', "%{$s}%")
                    ->orWhere('current_location', 'like', "%{$s}%")
                    ->orWhere('current_drawer_code', 'like', "%{$s}%");
            });
        }

        $bags = $query->orderByDesc('updated_at')->paginate(20)->withQueryString();

        return Inertia::render('admin/bags/index', [
            'bags' => $bags,
            'filters' => $request->only('search'),
        ]);
    }

    public function show(string $bagNo)
    {
        $bag = Bag::where('bag_no', $bagNo)->firstOrFail();
        $events = $bag->locationEvents()->orderByDesc('occurred_at')->limit(20)->get();

        return Inertia::render('admin/bags/show', [
            'bag' => $bag,
            'events' => $events,
        ]);
    }

    public function export()
    {
        $bags = Bag::orderBy('bag_no')->get(['bag_no', 'voucher_no', 'voucher_date', 'current_location', 'current_drawer_code', 'last_locker_event_id', 'last_locker_update_at']);

        $csv = "bag_no,voucher_no,voucher_date,current_drawer_code,current_location,last_locker_event_id,last_locker_update_at\n";
        foreach ($bags as $b) {
            $csv .= implode(',', [
                '"'.str_replace('"', '""', $b->bag_no).'"',
                '"'.str_replace('"', '""', $b->voucher_no ?? '').'"',
                '"'.($b->voucher_date ? $b->voucher_date : '').'"',
                '"'.str_replace('"', '""', $b->current_drawer_code ?? $b->current_location ?? '').'"',
                '"'.str_replace('"', '""', $b->current_location ?? '').'"',
                '"'.str_replace('"', '""', $b->last_locker_event_id ?? '').'"',
                '"'.($b->last_locker_update_at ? $b->last_locker_update_at : '').'"',
            ])."\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="bags-'.now()->format('Ymd-His').'.csv"',
        ]);
    }
}
