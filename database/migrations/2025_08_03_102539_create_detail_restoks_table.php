<?php
// database/migrations/xxxx_xx_xx_create_detail_restoks_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('detail_restoks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('restok_id');
            $table->unsignedBigInteger('produk_id');
            $table->string('nama_produk');
            $table->string('supplier')->nullable();
            $table->integer('jumlah')->default(0);
            $table->string('satuan');
            $table->decimal('harga_beli', 20, 2)->default(0);
            $table->decimal('subtotal', 20, 2)->default(0);
            // Multi harga per satuan (JSON: [{satuan, harga_beli, harga_jual}])
            $table->json('multi_harga')->nullable();
            $table->timestamps();

            $table->foreign('restok_id')->references('id')->on('restoks')->onDelete('cascade');
            $table->foreign('produk_id')->references('id')->on('produks')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('detail_restoks');
    }
};
