<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $storage_batch_id
 * @property string $voucher_no
 * @property string $voucher_date
 * @property string $bag_no
 * @property string $location
 * @property string|null $drawer_code
 * @property string $status
 * @property string|null $error_code
 * @property string|null $error_message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class StorageBatchItem extends Model
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_ACCEPTED = 'ACCEPTED';
    public const STATUS_REJECTED = 'REJECTED';
    public const STATUS_FAILED = 'FAILED';
    public const STATUS_RETRYING = 'RETRYING';

    protected $fillable = [
        'storage_batch_id',
        'voucher_no',
        'voucher_date',
        'bag_no',
        'location',
        'drawer_code',
        'status',
        'error_code',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'voucher_date' => 'date:Y-m-d',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(StorageBatch::class, 'storage_batch_id');
    }

    public function bag(): BelongsTo
    {
        return $this->belongsTo(Bag::class, 'bag_no', 'bag_no');
    }
}
