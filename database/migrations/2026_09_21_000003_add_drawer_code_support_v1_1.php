<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bags: add drawer_code as new identifier (location deprecated but kept for backward compat)
        Schema::table('bags', function (Blueprint $table) {
            $table->string('current_drawer_code')->nullable();
        });

        // Storage batch items: add drawer_code
        Schema::table('storage_batch_items', function (Blueprint $table) {
            $table->string('drawer_code')->nullable();
        });

        // Locker location events: add drawer code fields (old/new)
        Schema::table('locker_location_events', function (Blueprint $table) {
            $table->string('old_drawer_code')->nullable();
            $table->string('new_drawer_code')->nullable();
        });

        // Mock locker bags: add drawer_code
        if (Schema::hasTable('mock_locker_bags')) {
            Schema::table('mock_locker_bags', function (Blueprint $table) {
                $table->string('drawer_code')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::table('bags', function (Blueprint $table) {
            $table->dropColumn('current_drawer_code');
        });
        Schema::table('storage_batch_items', function (Blueprint $table) {
            $table->dropColumn('drawer_code');
        });
        Schema::table('locker_location_events', function (Blueprint $table) {
            $table->dropColumn(['old_drawer_code', 'new_drawer_code']);
        });
        if (Schema::hasTable('mock_locker_bags')) {
            Schema::table('mock_locker_bags', function (Blueprint $table) {
                $table->dropColumn('drawer_code');
            });
        }
    }
};
