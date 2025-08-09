<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;
use Illuminate\Support\Facades\Auth;

class TrackingController extends Controller
{
    // Menampilkan halaman utama tracking (log aktivitas) ke view tracking.index
    public function index(){
        return view('tracking.index');
    }

    // Mengambil data tracking (log aktivitas) terbaru beserta relasi produk, hasilnya dipaginasi 50 data per halaman
    public function getTracking()
    {
        $trackings = Tracking::with('produk')->latest()->paginate(50);
        return response()->json($trackings);
    }

    // Menyimpan data tracking/log aktivitas ke database
    // Data yang divalidasi: transaksi_id, produk_id, nama_produk, tipe, keterangan, status
    // Nama pengguna diambil dari Auth, jika tidak ada maka diisi 'Guest'
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaksi_id' => 'nullable|integer|exists:transaksis,id',
            'produk_id' => 'nullable|integer|exists:produks,id',
            'nama_produk' => 'nullable|string',
            'tipe' => 'required|string',
            'keterangan' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $validated['pengguna'] = Auth::user() ? Auth::user()->nama : 'Guest';

        $tracking = Tracking::create($validated);

        return response()->json([
            'success' => true,
            'data' => $tracking
        ]);
    }
}
