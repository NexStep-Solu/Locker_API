<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $direction
 * @property string $system
 * @property string $endpoint
 * @property string|null $request_id
 * @property string|null $event_id
 * @property int|null $http_status
 * @property string|null $status
 * @property array|null $request_body
 * @property array|null $response_body
 * @property string|null $error_message
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class IntegrationLog extends Model
{
    public const DIRECTION_POS_TO_APP = 'POS_TO_APP';
    public const DIRECTION_APP_TO_LOCKER = 'APP_TO_LOCKER';
    public const DIRECTION_LOCKER_TO_APP = 'LOCKER_TO_APP';
    public const DIRECTION_APP_TO_POS = 'APP_TO_POS';

    protected $fillable = [
        'direction',
        'system',
        'endpoint',
        'request_id',
        'event_id',
        'http_status',
        'status',
        'request_body',
        'response_body',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'http_status' => 'integer',
            'request_body' => 'array',
            'response_body' => 'array',
        ];
    }
}
