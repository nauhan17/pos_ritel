<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KonversiSatuan extends Model
{
    //
    protected $table = 'konversi_satuans';
    protected $fillable = [
        'produk_id',
        'satuan_dasar',
        'jumlah',
        'satuan_besar',
        'konversi'
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }
}
