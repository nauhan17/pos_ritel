<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Barcode extends Model
{
    //
    use HasFactory;

    protected $fillable = [
        'produk_id',
        'kode_barcode',
        'is_utama'
    ];

    protected $casts = [
        'is_utama' => 'boolean'
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }

    public static function generateUniqueBarcode()
    {
        do {
            $barcode = mt_rand(100000000000, 999999999999);
            $checkDigit = self::calculateEAN13CheckDigit($barcode);
            $fullBarcode = $barcode . $checkDigit;
        } while (self::where('kode_barcode', $fullBarcode)->exists());

        return $fullBarcode;
    }

    protected static function calculateEAN13CheckDigit($barcode)
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += $barcode[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        return (10 - ($sum % 10)) % 10;
    }
}
