<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $bag_no
 * @property string|null $voucher_no
 * @property string|null $voucher_date
 * @property string|null $current_location
 * @property string|null $current_drawer_code
 * @property Carbon|null $last_locker_update_at
 * @property string|null $last_locker_event_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Bag extends Model
{
    protected $fillable = [
        'bag_no',
        'voucher_no',
        'voucher_date',
        'current_location',
        'current_drawer_code',
        'last_locker_update_at',
        'last_locker_event_id',
    ];

    protected function casts(): array
    {
        return [
            'voucher_date' => 'date:Y-m-d',
            'last_locker_update_at' => 'datetime',
        ];
    }

    public function locationEvents(): HasMany
    {
        return $this->hasMany(LockerLocationEvent::class, 'bag_no', 'bag_no');
    }
}
