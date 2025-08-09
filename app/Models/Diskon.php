<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Diskon extends Model
{
    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'produk_id',
        'jumlah_minimum',
        'diskon',
        'is_tanpa_waktu',
        'tanggal_mulai',
        'tanggal_berakhir'
    ];

    // Relasi: diskon ini milik satu produk
    public function produk(){
        return $this->belongsTo(Produk::class);
    }

    // Scope: mengambil diskon yang aktif (tanpa waktu atau dalam rentang tanggal berlaku)
    public function scopeAktif(Builder $query){
        return $query->where(function($q){
            $q->where('is_tanpa_waktu', true)
            ->orWhere(function($q2){
                $now = Carbon::now();
                $q2->where('tanggal_mulai', '<=', $now)
                ->where('tanggal_berakhir', '>=', $now);
            });
        });
    }

    // Scope: filter diskon untuk produk tertentu
    public function scopeUntukProduk(Builder $query, $produkId){
        return $query->where('produk_id', $produkId);
    }

    // Scope: filter diskon berdasarkan jumlah minimum pembelian
    public function scopeUntukJumlah(Builder $query, $jumlah){
        return $query->where('jumlah_minimum', '<=', $jumlah);
    }

    // Mengecek apakah diskon ini sedang aktif (berlaku sekarang)
    public function isAktif(){
        if($this->is_tanpa_waktu){
            return true;
        }

        $now = Carbon::now();
        return $now->between(
            Carbon::parse($this->tanggal_mulai),
            Carbon::parse($this->tanggal_berakhir)
        );
    }
}
