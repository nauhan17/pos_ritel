<?php

namespace App\Models;

use App\Models\DetailRestoks;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Restok extends Model
{
    protected $table = 'restoks';

    protected $fillable = [
        'tanggal',
        'user_id',
        'jumlah_produk',
        'total_harga_beli',
        'keterangan',
    ];

    public function detailRestoks(): HasMany
    {
        return $this->hasMany(DetailRestoks::class, 'restok_id');
    }
}
