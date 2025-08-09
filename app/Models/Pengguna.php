<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Pengguna extends Authenticatable
{
    // Nama tabel yang digunakan model ini
    protected $table = 'penggunas';

    // Kolom yang boleh diisi secara mass-assignment
    protected $fillable = [
        'nama', 'email', 'no_hp', 'akses', 'is_active', 'password'
    ];

    // Otomatis cast kolom akses ke array dan is_active ke boolean
    protected $casts = [
        'akses' => 'array',
        'is_active' => 'boolean',
    ];

    // Kolom password disembunyikan saat model diubah ke array/JSON
    protected $hidden = [
        'password',
    ];
}
