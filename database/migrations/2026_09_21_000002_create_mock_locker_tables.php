<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mock Locker physical state — simulates real Locker System for testing
        // Pure offline gateway is manual; this mock lets you test without hardware
        Schema::create('mock_locker_bags', function (Blueprint $table) {
            $table->id();
            $table->string('bag_no')->unique();
            $table->string('voucher_no');
            $table->date('voucher_date')->nullable();
            $table->string('location');
            $table->string('status')->default('STORED'); // STORED, OUT, MOVED
            $table->string('batch_no')->nullable();
            $table->timestamp('stored_at')->nullable();
            $table->timestamps();
            $table->index('location');
            $table->index('status');
        });

        Schema::create('mock_locker_logs', function (Blueprint $table) {
            $table->id();
            $table->string('direction'); // MOCK_APP_TO_LOCKER, MOCK_LOCKER_TO_APP, MOCK_CONSOLIDATION
            $table->string('endpoint');
            $table->string('request_id')->nullable();
            $table->string('event_id')->nullable();
            $table->integer('http_status')->nullable();
            $table->string('status')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_locker_logs');
        Schema::dropIfExists('mock_locker_bags');
    }
};
