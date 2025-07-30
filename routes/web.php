<?php

use App\Http\Middleware\CekHakAkses;
use Illuminate\Support\Facades\Auth;

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProdukController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\TransaksiController;
use App\Http\Controllers\PembelianController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\StokController;
use App\Http\Controllers\KasirController;
use App\Http\Controllers\AktivitasController;
use App\Http\Controllers\PenggunaController;
use Illuminate\Support\Facades\Route;


// Login routes (tanpa middleware)
Route::get('/login', [LoginController::class, 'index'])->name('login');
Route::post('/api/login', [LoginController::class, 'proses']);

// Pengguna (akses:pengguna)
Route::resource('pengguna', PenggunaController::class)
    ->middleware([CekHakAkses::class . ':pengguna', 'auth']);

Route::prefix('api')->middleware([CekHakAkses::class . ':pengguna', 'auth'])->group(function() {
    Route::get('/pengguna', [PenggunaController::class, 'endpoint']);
    Route::post('/pengguna', [PenggunaController::class, 'store']);
    Route::get('/pengguna/{id}', [PenggunaController::class, 'show']); // Kembali ke show
    Route::put('/pengguna/{id}', [PenggunaController::class, 'update']); // Kembali ke update
    Route::delete('/pengguna/{id}', [PenggunaController::class, 'destroy']);
});

// Dashboard (akses:dashboard)
Route::get('/dashboard', [DashboardController::class, 'index'])
    ->name('dashboard.index')
    ->middleware([CekHakAkses::class . ':dashboard', 'auth']);

// Produk (akses:produk)
Route::get('/produk', [ProdukController::class, 'index'])
    ->name('produk.index')
    ->middleware([CekHakAkses::class . ':produk', 'auth']);

// API Produk - pisahkan route GET untuk kasir
Route::get('/api/produk', [ProdukController::class, 'endpoint'])
    ->middleware([CekHakAkses::class . ':produk', 'auth']); // Kasir dan produk bisa akses

Route::prefix('api')->middleware([CekHakAkses::class . ':produk', 'auth'])->group(function() {
    Route::post('/produk', [ProdukController::class, 'store']);
    Route::put('/produk/{id}', [ProdukController::class, 'update']);
    Route::delete('/produk/delete-multiple', [ProdukController::class, 'destroyMultiple']);
    Route::post('/produk/diskon', [ProdukController::class, 'storeDiskon']);
    Route::get('/produk/{id}/diskon', [ProdukController::class, 'getDiskon']);
    Route::delete('/produk/diskon/{id}', [ProdukController::class, 'hapusDiskon']);
    Route::get('/produk/{produkId}/satuan', [ProdukController::class, 'getSatuan']);
    Route::post('/produk/satuan', [ProdukController::class, 'storeSatuan']);
    Route::delete('/produk/satuan/{id}', [ProdukController::class, 'destroySatuan']);
    Route::get('/produk/{produkId}/barcode', [ProdukController::class, 'getBarcode']);
    Route::get('/produk/{produkId}/generate-barcode', [ProdukController::class, 'generateBarcode']);
    Route::post('/produk/barcode', [ProdukController::class, 'storeBarcode']);
    Route::delete('/produk/barcode/{barcodeId}', [ProdukController::class, 'destroyBarcode']);
    Route::put('/produk/barcode/{barcodeId}/set-utama', [ProdukController::class, 'setAsUtama']);
});

// Tracking (akses:tracking)
Route::get('/tracking', [TrackingController::class, 'index'])
    ->name('tracking.index')
    ->middleware([CekHakAkses::class . ':tracking', 'auth']);

Route::prefix('api')->middleware([CekHakAkses::class . ':tracking', 'auth'])->group(function() {
    Route::get('/tracking', [TrackingController::class, 'getTracking']);
    Route::post('/tracking', [TrackingController::class, 'store']);
});

// Kasir (akses:kasir)
Route::get('/kasir', [KasirController::class, 'index'])
    ->name('kasir.index')
    ->middleware([CekHakAkses::class . ':kasir', 'auth']);
Route::post('/api/transaksi', [TransaksiController::class, 'store'])
    ->middleware([CekHakAkses::class . ':kasir', 'auth']);
Route::get('/api/no-transaksi-baru', [TransaksiController::class, 'getNoTransaksiBaru'])
    ->middleware([CekHakAkses::class . ':kasir', 'auth']);

// Pembelian (akses:pembelian)
Route::get('/pembelian', [PembelianController::class, 'index'])
    ->name('pembelian.index')
    ->middleware([CekHakAkses::class . ':pembelian', 'auth']);

// Aktivitas (akses:aktivitas)
Route::get('/aktivitas', [AktivitasController::class, 'index'])
    ->name('aktivitas.index')
    ->middleware([CekHakAkses::class . ':aktivitas', 'auth']);

Route::post('/logout', function() {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/login');
})->name('logout');
