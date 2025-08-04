<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Produk extends Model
{
    //
    use HasFactory;

    protected $fillable = [
        'nama_produk',
        'kategori',
        'supplier',
        'stok',
        'satuan',
        'harga_beli',
        'harga_jual',
    ];

    public function konversiSatuan()
    {
        return $this->hasMany(\App\Models\KonversiSatuan::class, 'produk_id');
    }

    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'produk_id');
    }

    public function utamaBarcode()
    {
        return $this->hasOne(Barcode::class)->where('is_utama', true);
    }
}
