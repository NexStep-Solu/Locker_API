<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LockerLocationEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LocationUpdateController extends Controller
{
    public function index(Request $request)
    {
        $query = LockerLocationEvent::query();

        if ($request->filled('search')) {
            $s = $request->string('search');
            $query->where(function ($q) use ($s) {
                $q->where('event_id', 'like', "%{$s}%")
                    ->orWhere('bag_no', 'like', "%{$s}%")
                    ->orWhere('voucher_no', 'like', "%{$s}%");
            });
        }
        if ($request->filled('movementType')) {
            $query->where('movement_type', $request->string('movementType'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $events = $query->orderByDesc('occurred_at')->paginate(20)->withQueryString();

        return Inertia::render('admin/location-updates/index', [
            'events' => $events,
            'filters' => $request->only(['search', 'movementType', 'status']),
        ]);
    }
}
