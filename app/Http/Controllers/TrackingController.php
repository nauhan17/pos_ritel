<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tracking;

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
            'produk_id' => 'nullable|integer|exists:produks,id',
            'nama_produk' => 'nullable|string',
            'aksi' => 'required|string',
            'keterangan' => 'nullable|string'
        ]);

        $tracking = Tracking::create($validated);

        return response()->json([
            'success' => true,
            'data' => $tracking
        ]);
    }

}
