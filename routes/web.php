<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProdukController;
use App\Http\Controllers\TrackingController;

use App\Http\Controllers\SupplierController;
use App\Http\Controllers\StokController;

use App\Http\Controllers\KasirController;

use App\Http\Controllers\AktivitasController;
use App\Http\Controllers\PenggunaController;
use App\Models\Produk;
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

Route::get('/tracking', [TrackingController::class, 'index'])->name('tracking.index');

Route::get('/api/tracking', [TrackingController::class, 'getTracking']);
Route::post('/api/tracking', [TrackingController::class, 'store']);


Route::get('/kasir', [KasirController::class, 'index'])->name('kasir.index');
Route::get('/tracking', [TrackingController::class, 'index'])->name('tracking.index');
Route::get('/aktivitas', [AktivitasController::class, 'index'])->name('aktivitas.index');
Route::get('/pengguna', [PenggunaController::class, 'index'])->name('pengguna.index');
