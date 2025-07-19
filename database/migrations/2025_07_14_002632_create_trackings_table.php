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
        Schema::create('trackings', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('produk_id')->nullable( );
            $table->foreign('produk_id')
                ->references('id')
                ->on('produks')
                ->onDelete('set null');

            $table->string('nama_produk')->nullable();
            $table->string('aksi');
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trackings');
    }
};
