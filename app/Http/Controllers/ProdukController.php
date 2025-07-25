<?php

namespace App\Http\Controllers;

use App\Models\Produk;
use App\Models\Diskon;
use App\Models\KonversiSatuan;
use App\Models\Barcode;

use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProdukController extends Controller
{
    //
    public function index()
    {
        $produks = Produk::all();
        return view('produk.index', compact('produks'));
    }

    public function endpoint(Request $request){
        if (!session('pengguna')) {
            return response()->json(['message' => 'Session pengguna tidak ditemukan'], 401);
        }
        $aksesArr = is_array(session('pengguna.akses'))
            ? session('pengguna.akses')
            : json_decode(session('pengguna.akses') ?? '[]', true);

        // Debug: cek hak akses
        if (empty($aksesArr)) {
            return response()->json(['message' => 'Hak akses kosong'], 403);
        }

        $sort = $request->get('sort', 'nama_produk');
        $order = $request->get('order', 'asc');

        $validSorts = ['nama_produk', 'kategori', 'supplier', 'stok', 'satuan', 'harga_beli', 'harga_jual', 'timestamps'];
        $sort = in_array($sort, $validSorts) ? $sort : 'nama_produk';

        $produk = Produk::with('konversiSatuan', 'barcodes')->orderBy($sort, $order)->get();

        return response()->json($produk);
    }

    public function store(Request $request){
        $request->validate([
            'nama_produk' => 'required|string|max:100',
            'kategori' => 'nullable|string',
            'supplier' => 'nullable|string',
            'stok' => 'nullable|integer',
            'satuan' => 'nullable|string',
            'harga_beli' => 'nullable|decimal:0,2',
            'harga_jual' => 'nullable|decimal:0,2',
        ]);

        $produk = Produk::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $produk
        ]);
    }

    public function update(Request $request, $id){
        $validated = $request->validate([
            'nama_produk' => 'sometimes|string|max:100',
            'kategori' => 'nullable|string',
            'supplier' => 'nullable|string',
            'stok' => 'nullable|integer',
            'harga_beli' => 'nullable|numeric',
            'harga_jual' => 'nullable|numeric'
        ]);

        $produk = Produk::findOrFail($id);
        $produk->update($validated);

        return response()->json($produk);
    }

    public function destroyMultiple(Request $request)
    {
        if (empty($request->ids)) {
            return response()->json(['error' => 'TIDAK ADA DATA YANG DIPILIH'], 400);
        }

        try {
            Produk::whereIn('id', $request->ids)->delete();
            return response()->json(['success' => 'DATA BERHASIL DIHAPUS']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'GAGAL MENGHAPUS: ' . $e->getMessage()], 500);
        }
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

        return response()->json([
            'success' => true,
            'message' => 'Diskon berhasil ditambahkan',
            'data' => $diskon
        ]);
    }

    public function getDiskon($id){
        $diskon = Diskon::where('produk_id', $id)
            ->orderBy('jumlah_minimum')
            ->get();

        return response()->json($diskon);
    }

    public function hapusDiskon($id){
        try {
            $diskon = Diskon::findOrFail($id);
            $diskon->delete();

            return response()->json(['success' => true]);
        } catch (\Exception $e){
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function storeSatuan(Request $request){
        $validated = $request->validate([
            'produk_id' => 'required|exists:produks,id',
            'satuan_dasar' => 'required|string|max:20',
            'jumlah' => 'required|numeric|min:0.01',
            'satuan_besar' => [
                'required',
                'string',
                'max:20',
                Rule::unique('konversi_satuans')
                    ->where('produk_id', $request->produk_id)
                    ->where('satuan_dasar', $request->satuan_dasar)
            ],
            'konversi' => 'required|numeric|min:0.01'
        ]);

        $konversi = KonversiSatuan::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Konversi satuan berhasil ditambahkan',
            'data' => $konversi
        ]);
    }

    public function getSatuan($produkId){
        $konversi = KonversiSatuan::where('produk_id', $produkId)
                    ->orderBy('created_at', 'desc')
                    ->get();

        return response()->json($konversi);
    }

    public function destroySatuan($id)
    {
        try {
            $konversi = KonversiSatuan::findOrFail($id);
            $konversi->delete();

            return response()->json(['success' => true]);
        } catch (\Exception $e){
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getBarcode($produkId)
    {
        $produk = Produk::findOrFail($produkId);
        $barcodes = $produk->barcodes()->latest()->get();

        return response()->json($barcodes);
    }

    public function storeBarcode(Request $request)
    {
        $validated = $request->validate([
            'produk_id' => 'required|exists:produks,id',
            'kode_barcode' => [
                'required',
                'string',
                'max:50',
                Rule::unique('barcodes')->where(function ($query) use ($request) {
                    return $query->where('produk_id', $request->produk_id);
                })
            ],
            'is_utama' => 'sometimes|boolean'
        ]);

        DB::transaction(function () use ($validated) {
            if ($validated['is_utama'] ?? false) {
                Barcode::where('produk_id', $validated['produk_id'])
                    ->where('is_utama', true)
                    ->update(['is_utama' => false]);
            }

            Barcode::create($validated);
        });

        return response()->json(['message' => 'Barcode berhasil disimpan'], 201);
    }

    public function destroyBarcode($barcodeId)
    {
        $barcode = Barcode::findOrFail($barcodeId);

        DB::transaction(function () use ($barcode) {
            if ($barcode->is_utama) {
                Barcode::where('produk_id', $barcode->produk_id)
                    ->where('id', '!=', $barcode->id)
                    ->first()
                    ?->update(['is_utama' => true]);
            }

            $barcode->delete();
        });

        return response()->json(['message' => 'Barcode berhasil dihapus']);
    }

    public function setAsUtama($barcodeId)
    {
        $barcode = Barcode::findOrFail($barcodeId);

        DB::transaction(function () use ($barcode) {
            Barcode::where('produk_id', $barcode->produk_id)
                ->where('is_utama', true)
                ->update(['is_utama' => false]);

            $barcode->update(['is_utama' => true]);
        });

        return response()->json(['message' => 'Barcode utama berhasil diubah']);
    }

    public function generateBarcode($produkId)
    {
        $produk = Produk::findOrFail($produkId);
        $barcode = Barcode::generateUniqueBarcode();

        return response()->json([
            'kode_barcode' => $barcode
        ]);
    }
}
