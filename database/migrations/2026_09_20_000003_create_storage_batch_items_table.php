<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('storage_batch_id')->constrained('storage_batches')->cascadeOnDelete();
            $table->string('voucher_no');
            $table->date('voucher_date');
            $table->string('bag_no');
            $table->string('location');
            $table->string('status')->default('PENDING');
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('bag_no');
            $table->index('status');
            $table->index(['storage_batch_id', 'bag_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage_batch_items');
    }
};
