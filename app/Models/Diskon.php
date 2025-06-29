<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Diskon extends Model
{
    //
    protected $fillable = [
        'produk_id',
        'jumlah_minimum',
        'diskon',
        'is_tanpa_waktu',
        'tanggal_mulai',
        'tanggal_berakhir'
    ];

    public function produk(){
        return $this->belongsTo(Produk::class);
    }

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

    public function scopeUntukProduk(Builder $query, $produkId){
        return $query->where('produk_id', $produkId);
    }

    public function scopeUntukJumlah(Builder $query, $jumlah){
        return $query->where('jumlah_minimum', '<=', $jumlah);
    }

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
