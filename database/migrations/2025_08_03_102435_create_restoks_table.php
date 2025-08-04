<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('restoks', function (Blueprint $table) {
            $table->id();
            $table->dateTime('tanggal')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->unsignedBigInteger('user_id')->nullable();
            $table->integer('jumlah_produk')->default(0);
            $table->decimal('total_harga_beli', 20, 2)->default(0);
            $table->string('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('restoks');
    }
};
