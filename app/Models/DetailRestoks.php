<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailRestoks extends Model
{
    protected $table = 'detail_restoks';

    // Kolom yang boleh diisi secara mass-assignment
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

    // Otomatis cast kolom multi_harga ke array (decode/encode JSON)
    protected $casts = [
        'multi_harga' => 'array',
    ];

    // Relasi: detail restok ini milik satu restok (parent)
    public function restok(): BelongsTo
    {
        return $this->belongsTo(Restok::class, 'restok_id');
    }

    // Relasi: detail restok ini milik satu produk
    public function produk(): BelongsTo
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
