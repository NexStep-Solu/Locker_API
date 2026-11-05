<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $event_id
 * @property string $event_type
 * @property string $bag_no
 * @property string $voucher_no
 * @property string $old_location
 * @property string|null $old_drawer_code
 * @property string $new_location
 * @property string|null $new_drawer_code
 * @property string $movement_type
 * @property Carbon $occurred_at
 * @property Carbon|null $processed_at
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class LockerLocationEvent extends Model
{
    public const STATUS_RECEIVED = 'RECEIVED';
    public const STATUS_PROCESSED = 'PROCESSED';
    public const STATUS_DUPLICATE = 'DUPLICATE';
    public const STATUS_FAILED = 'FAILED';

    protected $fillable = [
        'event_id',
        'event_type',
        'bag_no',
        'voucher_no',
        'old_location',
        'old_drawer_code',
        'new_location',
        'new_drawer_code',
        'movement_type',
        'occurred_at',
        'processed_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function bag(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Bag::class, 'bag_no', 'bag_no');
    }
}
