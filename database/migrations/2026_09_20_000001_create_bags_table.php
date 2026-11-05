<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bags', function (Blueprint $table) {
            $table->id();
            $table->string('bag_no')->unique();
            $table->string('voucher_no')->nullable();
            $table->date('voucher_date')->nullable();
            $table->string('current_location')->nullable();
            $table->timestamp('last_locker_update_at')->nullable();
            $table->string('last_locker_event_id')->nullable();
            $table->timestamps();

            $table->index('voucher_no');
            $table->index('current_location');
            $table->index('last_locker_event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bags');
    }
};
