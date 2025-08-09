<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Produk extends Model
{
    use HasFactory;

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'nama_produk',
        'kategori',
        'supplier',
        'stok',
        'satuan',
        'harga_beli',
        'harga_jual',
    ];

    // Relasi: satu produk memiliki banyak konversi satuan
    public function konversiSatuan()
    {
        return $this->hasMany(\App\Models\KonversiSatuan::class, 'produk_id');
    }

    // Relasi: satu produk memiliki banyak barcode
    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'produk_id');
    }

    public function diskon()
    {
        return $this->hasMany(\App\Models\Diskon::class, 'produk_id');
    }

    // Relasi: satu produk memiliki satu barcode utama
    public function utamaBarcode()
    {
        return $this->hasOne(Barcode::class)->where('is_utama', true);
    }
}
