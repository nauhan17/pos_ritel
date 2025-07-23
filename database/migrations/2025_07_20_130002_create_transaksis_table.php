<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('transaksis', function (Blueprint $table) {
            $table->id();
            $table->string('no_transaksi')->unique();
            $table->datetime('tanggal');
            $table->decimal('total', 18, 2);
            $table->decimal('uang_customer', 18, 2);
            $table->decimal('kembalian', 18, 2);
            $table->string('status')->default('lunas');
            $table->string('nama_pembeli')->nullable();
            $table->string('no_hp')->nullable();
            $table->date('jatuh_tempo')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('transaksis');
    }
};
