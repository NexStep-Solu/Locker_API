<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locker_location_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('event_type');
            $table->string('bag_no');
            $table->string('voucher_no');
            $table->string('old_location');
            $table->string('new_location');
            $table->string('movement_type');
            $table->timestamp('occurred_at');
            $table->timestamp('processed_at')->nullable();
            $table->string('status')->default('RECEIVED');
            $table->timestamps();

            $table->index('bag_no');
            $table->index('status');
            $table->index('movement_type');
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locker_location_events');
    }
};
