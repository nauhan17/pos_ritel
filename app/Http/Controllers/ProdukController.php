<?php

namespace App\Http\Controllers;

use App\Models\Produk;
use App\Models\Diskon;
use Illuminate\Http\Request;

class ProdukController extends Controller
{
    //
    public function index()
    {
        $produks = Produk::all();
        return view('produk.index', compact('produks'));
    }

    public function endpoint(Request $request){
        $sort = $request->get('sort', 'nama_produk');
        $order = $request->get('order', 'asc');

        $validSorts = ['nama_produk', 'barcode', 'stok', 'harga_beli', 'harga_jual', 'diskon', 'kadaluwarsa'];
        $sort = in_array($sort, $validSorts) ? $sort : 'nama_produk';

        $produk = Produk::orderBy($sort, $order)->get();

        return response()->json($produk);
    }

    public function store(Request $request){
        $request->validate([
            'nama_produk' => 'required|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'stok' => 'nullable|integer',
            'harga_beli' => 'nullable|decimal:0,2',
            'harga_jual' => 'nullable|decimal:0,2',
            'diskon' => 'nullable|decimal:0,2',
            'kadaluwarsa' => 'nullable|date'
        ]);

        $produk = Produk::create($request->all());

        return response()->json($produk, 201);
    }

    public function update(Request $request, $id){
        $validated = $request->validate([
            'nama_produk' => 'sometimes|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'stok' => 'nullable|integer',
            'harga_beli' => 'nullable|numeric',
            'harga_jual' => 'nullable|numeric',
            'diskon' => 'nullable|numeric|min:0|max:100',
            'kadaluwarsa' => 'nullable|date'
        ]);

        if(isset($validated['diskon'])){
            $validated['diskon'] = (float) $validated['diskon'];
        }

        $produk = Produk::findOrFail($id);
        $produk->update($validated);

        return response()->json($produk);
    }

    public function destroyMultiple(Request $request)
    {
        if (empty($request->ids)) {
            return response()->json(['error' => 'Tidak ada data yang dipilih'], 400);
        }

        try {
            Produk::whereIn('id', $request->ids)->delete();
            return response()->json(['success' => 'Data berhasil dihapus']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal menghapus: ' . $e->getMessage()], 500);
        }
    }

    // Diskon
    public function diskonIndex(){
        $produk = Produk::all();
        return view('produk.diskon', compact('produks'));
    }

    public function storeDiskon(Request $request)
    {
        $request->validate([
            'produk_id' => 'required|exists:produks,id',
            'jumlah_minimum' => 'required|integer|min:1',
            'diskon' => 'required|numeric|min:0|max:100',
            'is_tanpa_waktu' => 'boolean',
            'tanggal_mulai' => 'required_if:is_tanpa_waktu,false|date|nullable',
            'tanggal_berakhir' => 'required_if:is_tanpa_waktu,false|date|after_or_equal:tanggal_mulai|nullable'
        ]);

        $diskon = Diskon::create([
            'produk_id' => $request->produk_id,
            'jumlah_minimum' => $request->jumlah_minimum,
            'diskon' => $request->diskon,
            'is_tanpa_waktu' => $request->is_tanpa_waktu ?? false,
            'tanggal_mulai' => $request->is_tanpa_waktu ? null : $request->tanggal_mulai,
            'tanggal_berakhir' => $request->is_tanpa_waktu ? null : $request->tanggal_berakhir
        ]);

        // Update diskon di produk jika perlu
        $produk = Produk::find($request->produk_id);
        $produk->update([
            'diskon' => $this->hitungDiskonProduk($produk->id)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Diskon berhasil ditambahkan',
            'data' => $diskon
        ]);
    }

    // Method untuk mendapatkan diskon produk
    public function getDiskonByProduk($produkId)
    {
        $diskon = Diskon::where('produk_id', $produkId)
                    ->orderBy('created_at', 'desc')
                    ->get();

        return response()->json($diskon);
    }

    // Method helper untuk menghitung diskon produk
    private function hitungDiskonProduk($produkId)
    {
        $diskonAktif = Diskon::where('produk_id', $produkId)
                        ->where(function($query) {
                            $query->where('is_tanpa_waktu', true)
                                    ->orWhere(function($q) {
                                        $now = now();
                                        $q->where('tanggal_mulai', '<=', $now)
                                        ->where('tanggal_berakhir', '>=', $now);
                                    });
                        })
                        ->orderBy('diskon', 'desc')
                        ->first();

        return $diskonAktif ? $diskonAktif->diskon : 0;
    }
}
