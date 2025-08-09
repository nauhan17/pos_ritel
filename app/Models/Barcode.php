<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Barcode extends Model
{
    use HasFactory;

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'produk_id',
        'kode_barcode',
        'is_utama'
    ];

    // Cast kolom is_utama ke tipe boolean
    protected $casts = [
        'is_utama' => 'boolean'
    ];

    // Relasi: barcode ini milik satu produk
    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }

    // Generate barcode unik 13 digit (EAN-13) yang belum pernah ada di database
    // Menggunakan random 12 digit + check digit EAN-13
    public static function generateUniqueBarcode()
    {
        do {
            $barcode = mt_rand(100000000000, 999999999999); // 12 digit random
            $checkDigit = self::calculateEAN13CheckDigit($barcode); // Hitung check digit
            $fullBarcode = $barcode . $checkDigit; // Gabungkan jadi 13 digit
        } while (self::where('kode_barcode', $fullBarcode)->exists()); // Ulang jika sudah ada di DB

        return $fullBarcode;
    }

    // Hitung check digit EAN-13 dari 12 digit barcode
    // Algoritma: jumlahkan digit genap x3 + digit ganjil, lalu cari selisih ke kelipatan 10 terdekat
    protected static function calculateEAN13CheckDigit($barcode)
    {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += $barcode[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        return (10 - ($sum % 10)) % 10;
    }
}
