<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProdukController;
use App\Http\Controllers\KasirController;
use App\Http\Controllers\PenjualanController;
use App\Http\Controllers\AktivitasController;
use App\Http\Controllers\PenggunaController;

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.index');

Route::get('/produk', [ProdukController::class, 'index'])->name('produk.index');
Route::prefix('api')->group(function() {
    Route::get('/produk', [ProdukController::class, 'endpoint']);
    Route::post('/produk', [ProdukController::class, 'store']);
    Route::put('/produk/{id}', [ProdukController::class, 'update']);
    Route::delete('/produk/delete-multiple', [ProdukController::class, 'destroyMultiple']);
    // API untuk diskon produk
    Route::post('/produk/diskon', [ProdukController::class, 'storeDiskon']);
    Route::get('/produk/diskon/{produkId}', [ProdukController::class, 'getDiskonByProduk']);
});

Route::get('/kasir', [KasirController::class, 'index'])->name('kasir.index');
Route::get('/penjualan', [PenjualanController::class, 'index'])->name('penjualan.index');
Route::get('/aktivitas', [AktivitasController::class, 'index'])->name('aktivitas.index');
Route::get('/pengguna', [PenggunaController::class, 'index'])->name('pengguna.index');
