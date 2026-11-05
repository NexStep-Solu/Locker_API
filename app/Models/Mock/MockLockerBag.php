<?php

namespace App\Models\Mock;

use Illuminate\Database\Eloquent\Model;

class MockLockerBag extends Model
{
    protected $table = 'mock_locker_bags';
    protected $fillable = ['bag_no', 'voucher_no', 'voucher_date', 'location', 'drawer_code', 'status', 'batch_no', 'stored_at'];
    protected $casts = ['voucher_date' => 'date:Y-m-d', 'stored_at' => 'datetime'];
}
