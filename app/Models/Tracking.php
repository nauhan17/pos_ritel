<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    //
    protected $table = 'trackings';

    protected $fillable = [
        'produk_id',
        'nama_produk',
        'aksi',
        'keterangan'
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
