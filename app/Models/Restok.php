<?php

namespace App\Models;

use App\Models\DetailRestoks;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Restok extends Model
{
    // Nama tabel yang digunakan model ini
    protected $table = 'restoks';

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'tanggal',
        'user_id',
        'jumlah_produk',
        'total_harga_beli',
        'keterangan',
    ];

    // Relasi: satu restok memiliki banyak detail restok (produk yang direstok)
    public function detailRestoks(): HasMany
    {
        return $this->hasMany(DetailRestoks::class, 'restok_id');
    }
}
