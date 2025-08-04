<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailRestoks extends Model
{
    protected $table = 'detail_restoks';

    protected $fillable = [
        'restok_id',
        'produk_id',
        'nama_produk',
        'supplier',
        'jumlah',
        'satuan',
        'harga_beli',
        'subtotal',
        'multi_harga',
    ];

    protected $casts = [
        'multi_harga' => 'array', // otomatis decode/encode JSON
    ];

    public function restok(): BelongsTo
    {
        return $this->belongsTo(Restok::class, 'restok_id');
    }

    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
