<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaksi extends Model
{
    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'no_transaksi', 'tanggal', 'total', 'uang_customer', 'kembalian', 'hutang', 'status', 'nama_pembeli', 'no_hp', 'jatuh_tempo'
    ];

    // Relasi: satu transaksi memiliki banyak detail transaksi (produk yang dibeli)
    public function details()
    {
        return $this->hasMany(DetailTransaksi::class);
    }
}
