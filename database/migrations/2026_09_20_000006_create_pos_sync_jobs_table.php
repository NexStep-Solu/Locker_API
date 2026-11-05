<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_sync_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('locker_location_event_id')->constrained('locker_location_events')->cascadeOnDelete();
            $table->string('bag_no');
            $table->unsignedInteger('attempts')->default(0);
            $table->string('status')->default('PENDING');
            $table->timestamp('last_attempt_at')->nullable();
            $table->timestamp('next_attempt_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('bag_no');
            $table->index('status');
            $table->index('next_attempt_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_sync_jobs');
    }
};
