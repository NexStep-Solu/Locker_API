<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->id();
            $table->string('direction');
            $table->string('system');
            $table->string('endpoint');
            $table->string('request_id')->nullable();
            $table->string('event_id')->nullable();
            $table->smallInteger('http_status')->nullable();
            $table->string('status')->nullable();
            $table->json('request_body')->nullable();
            $table->json('response_body')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('direction');
            $table->index('system');
            $table->index('request_id');
            $table->index('event_id');
            $table->index('http_status');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
    }
};
