<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;
use Illuminate\Support\Facades\Auth;

class TrackingController extends Controller
{
    public function index(){
        return view('tracking.index');
    }

    public function getTracking()
    {
        $trackings = Tracking::with('produk')->latest()->paginate(50);
        return response()->json($trackings);
    }

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
