<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Pengguna extends Authenticatable
{
    protected $table = 'penggunas';

    protected $fillable = [
        'nama', 'email', 'no_hp', 'akses', 'is_active', 'password'
    ];

    protected $casts = [
        'akses' => 'array',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'password',
    ];
}
