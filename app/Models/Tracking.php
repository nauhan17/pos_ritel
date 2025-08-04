<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    protected $table = 'trackings';

    protected $fillable = [
        'transaksi_id',
        'produk_id',
        'nama_produk',
        'tipe',
        'keterangan',
        'pengguna',
        'status'
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
