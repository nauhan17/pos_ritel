<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('restok_produks', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('produk_id');
            $table->foreign('produk_id')
                ->references('id')
                ->on('produks')
                ->onDelete('cascade');

            $table->string('supplier')->nullable();
            $table->string('barcode')->nullable();
            $table->integer('stok_masuk')->default(0);
            $table->string('satuan_stok');
            $table->decimal('harga_beli', 20, 2)->default(0);
            $table->decimal('harga_jual', 20, 2)->default(0);
            $table->json('harga_konversi')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('restok_produks');
    }
};
