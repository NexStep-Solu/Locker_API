<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $batch_no
 * @property string $request_id
 * @property int $total
 * @property int $accepted
 * @property int $rejected
 * @property string $status
 * @property Carbon|null $sent_at
 * @property Carbon|null $response_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class StorageBatch extends Model
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PROCESSING = 'PROCESSING';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_PARTIAL = 'PARTIAL';
    public const STATUS_FAILED = 'FAILED';
    public const STATUS_RETRYING = 'RETRYING';

    protected $fillable = [
        'batch_no',
        'request_id',
        'total',
        'accepted',
        'rejected',
        'status',
        'sent_at',
        'response_at',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'integer',
            'accepted' => 'integer',
            'rejected' => 'integer',
            'sent_at' => 'datetime',
            'response_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(StorageBatchItem::class);
    }
}
