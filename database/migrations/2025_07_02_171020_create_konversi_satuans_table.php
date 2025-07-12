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
        Schema::create('konversi_satuans', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('produk_id');
            $table->foreign('produk_id')
                ->references('id')
                ->on('produks')
                ->onDelete('cascade');

            $table->string('satuan_dasar');
            $table->integer('jumlah');
            $table->string('satuan_besar');
            $table->integer('konversi');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('konversi_satuans');
    }
};
