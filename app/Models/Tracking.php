<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    // Nama tabel yang digunakan model ini
    protected $table = 'trackings';

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'transaksi_id',
        'produk_id',
        'nama_produk',
        'tipe',
        'keterangan',
        'pengguna',
        'status'
    ];

    // Relasi: tracking ini milik satu produk
    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
