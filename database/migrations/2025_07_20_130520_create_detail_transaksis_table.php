<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('detail_transaksis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaksi_id')->constrained('transaksis')->onDelete('cascade');

            $table->unsignedBigInteger('produk_id')->nullable();
            $table->foreign('produk_id')
                ->references('id')
                ->on('produks')
                ->onDelete('set null');

            $table->string('nama_produk');
            $table->integer('qty');
            $table->string('satuan');
            $table->decimal('harga', 18, 2);
            $table->decimal('subtotal', 18, 2);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('detail_transaksis');
    }
};
