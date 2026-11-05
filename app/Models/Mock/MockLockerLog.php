<?php

namespace App\Models\Mock;

use Illuminate\Database\Eloquent\Model;

class MockLockerLog extends Model
{
    protected $table = 'mock_locker_logs';
    protected $fillable = ['direction', 'endpoint', 'request_id', 'event_id', 'http_status', 'status', 'payload'];
    protected $casts = ['payload' => 'array'];
}
