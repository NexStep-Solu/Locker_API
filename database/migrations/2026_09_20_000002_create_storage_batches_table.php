<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_no')->unique();
            $table->string('request_id')->unique();
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('accepted')->default(0);
            $table->unsignedInteger('rejected')->default(0);
            $table->string('status')->default('PENDING');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('response_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage_batches');
    }
};
