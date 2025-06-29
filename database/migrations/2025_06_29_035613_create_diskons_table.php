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
        Schema::create('diskons', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('produk_id');
            $table->foreign('produk_id')
                ->references('id')
                ->on('produks')
                ->onDelete('cascade');

            $table->integer('jumlah_minimum')->default(5);
            $table->decimal('diskon', 5, 2);
            $table->boolean('is_tanpa_waktu')->default('false');
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_berakhir')->nullable();
            $table->timestamps();

            $table->index(['produk_id', 'is_tanpa_waktu']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diskons');
    }
};
