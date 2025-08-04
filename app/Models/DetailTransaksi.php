<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetailTransaksi extends Model
{
    //
    protected $table = 'detail_transaksis';

    protected $fillable = [
        'transaksi_id', 'produk_id', 'nama_produk', 'qty', 'satuan', 'harga', 'subtotal'
    ];

    public function transaksi()
    {
        return $this->belongsTo(Transaksi::class);
    }

    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }
}
