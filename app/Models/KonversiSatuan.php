<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KonversiSatuan extends Model
{
    // Nama tabel yang digunakan model ini
    protected $table = 'konversi_satuans';

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'produk_id',
        'satuan_dasar',
        'jumlah',
        'satuan_besar',
        'konversi'
    ];

    // Relasi: konversi satuan ini milik satu produk
    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }
}
