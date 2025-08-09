<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetailTransaksi extends Model
{
    // Nama tabel yang digunakan model ini
    protected $table = 'detail_transaksis';

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'transaksi_id', 'produk_id', 'nama_produk', 'qty', 'satuan', 'harga', 'subtotal'
    ];

    // Relasi: detail transaksi ini milik satu transaksi (parent)
    public function transaksi()
    {
        return $this->belongsTo(Transaksi::class);
    }

    // Relasi: detail transaksi ini milik satu produk
    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }
}
