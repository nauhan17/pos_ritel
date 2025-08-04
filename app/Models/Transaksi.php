<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaksi extends Model
{
    //
    protected $fillable = [
        'no_transaksi', 'tanggal', 'total', 'uang_customer', 'kembalian', 'hutang', 'status', 'nama_pembeli', 'no_hp', 'jatuh_tempo'
    ];

    public function details()
    {
        return $this->hasMany(DetailTransaksi::class);
    }
}
