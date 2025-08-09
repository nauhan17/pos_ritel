<?php

namespace App\Http\Controllers;

use App\Models\Produk;
use App\Models\Diskon;
use App\Models\KonversiSatuan;
use App\Models\Barcode;
use App\Models\Restok;
use App\Models\DetailRestoks;

use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProdukController extends Controller
{
    // Menampilkan halaman utama produk dengan semua data produk
    public function index()
    {
        $produks = Produk::all();
        return view('produk.index', compact('produks'));
    }

    // Endpoint API untuk mengambil data produk (dengan relasi dan multi harga), sorting, dan validasi akses
    public function endpoint(Request $request){
        if (!session('pengguna')) {
            return response()->json(['message' => 'Session pengguna tidak ditemukan'], 401);
        }
        $aksesArr = is_array(session('pengguna.akses'))
            ? session('pengguna.akses')
            : json_decode(session('pengguna.akses') ?? '[]', true);

        if (empty($aksesArr)) {
            return response()->json(['message' => 'Hak akses kosong'], 403);
        }

        $sort = $request->get('sort', 'nama_produk');
        $order = $request->get('order', 'asc');
        $validSorts = ['nama_produk', 'kategori', 'supplier', 'stok', 'satuan', 'harga_beli', 'harga_jual', 'timestamps'];
        $sort = in_array($sort, $validSorts) ? $sort : 'nama_produk';

        $produk = Produk::with(['konversiSatuan', 'barcodes', 'diskon'])->orderBy($sort, $order)->get();

        // Tambahkan multi_harga dari restok terakhir jika ada
        foreach ($produk as $p) {
            $lastRestok = \App\Models\DetailRestoks::where('produk_id', $p->id)
                ->orderByDesc('created_at')
                ->first();

            if ($lastRestok && $lastRestok->multi_harga) {
                $p->multi_harga = is_array($lastRestok->multi_harga)
                    ? $lastRestok->multi_harga
                    : json_decode($lastRestok->multi_harga, true);
            } else {
                $p->multi_harga = [
                    [
                        'satuan' => $p->satuan,
                        'harga_beli' => $p->harga_beli,
                        'harga_jual' => $p->harga_jual
                    ]
                ];
            }
        }

        return response()->json($produk);
    }

    // Menyimpan produk baru ke database
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

    // Mengupdate data produk berdasarkan ID
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

    // Menghapus banyak produk sekaligus (multi delete) dengan validasi password user
    public function destroyMultiple(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|integer|exists:produks,id',
            'password' => 'required|string|min:1'
        ]);

        if (empty($request->ids)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data yang dipilih'
            ], 400);
        }

        $pengguna = session('pengguna');
        if (!$pengguna) {
            return response()->json([
                'success' => false,
                'message' => 'Session pengguna tidak ditemukan'
            ], 401);
        }

        // Ambil data pengguna dari database, bukan dari session
        $penggunaDb = \App\Models\Pengguna::find($pengguna['id'] ?? null);
        if (!$penggunaDb) {
            return response()->json([
                'success' => false,
                'message' => 'Pengguna tidak ditemukan'
            ], 401);
        }

        // Verifikasi password user dengan hash dari database
        if (!Hash::check($request->password, $penggunaDb->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password tidak sesuai'
            ], 401);
        }

        try {
            DB::beginTransaction();

            $produkIds = $request->ids;

            // Hapus data terkait produk
            Barcode::whereIn('produk_id', $produkIds)->delete();
            KonversiSatuan::whereIn('produk_id', $produkIds)->delete();
            Diskon::whereIn('produk_id', $produkIds)->delete();

            // Hapus produk
            $deletedCount = Produk::whereIn('id', $produkIds)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$deletedCount} produk berhasil dihapus",
                'deleted_count' => $deletedCount
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting products: ' . $e->getMessage(), [
                'ids' => $request->ids
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus produk: ' . $e->getMessage()
            ], 500);
        }
    }

    // Menyimpan diskon baru untuk produk
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

    // Mengambil daftar diskon untuk produk tertentu
    public function getDiskon($id){
        $diskon = Diskon::where('produk_id', $id)
            ->orderBy('jumlah_minimum')
            ->get();

        return response()->json($diskon);
    }

    // Menghapus diskon berdasarkan ID
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

    // Menyimpan konversi satuan baru untuk produk
    public function storeSatuan(Request $request){
        $validated = $request->validate([
            'produk_id' => 'required|exists:produks,id',
            'satuan_besar' => [
                'required',
                'string',
                'max:20',
                Rule::unique('konversi_satuans')
                    ->where('produk_id', $request->produk_id)
            ],
            'jumlah_satuan' => 'required|numeric|min:0.01',
            'konversi_satuan' => 'required|numeric|min:0.01'
        ]);

        $produk = Produk::findOrFail($validated['produk_id']);
        $konversi = KonversiSatuan::create([
            'produk_id' => $validated['produk_id'],
            'satuan_dasar' => $produk->satuan ?? 'pcs',
            'satuan_besar' => $validated['satuan_besar'],
            'jumlah' => $validated['jumlah_satuan'],
            'konversi' => $validated['konversi_satuan']
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Konversi satuan berhasil ditambahkan',
            'data' => $konversi
        ]);
    }

    // Mengambil daftar konversi satuan untuk produk tertentu
    public function getSatuan($produkId){
        $konversi = KonversiSatuan::where('produk_id', $produkId)
                    ->orderBy('created_at', 'desc')
                    ->get();

        return response()->json($konversi);
    }

    // Menghapus konversi satuan berdasarkan ID
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

    // Mengambil daftar barcode untuk produk tertentu
    public function getBarcode($produkId)
    {
        $produk = Produk::findOrFail($produkId);
        $barcodes = $produk->barcodes()->latest()->get();

        return response()->json($barcodes);
    }

    // Menyimpan barcode baru untuk produk (hanya satu barcode utama per produk)
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

    // Menghapus barcode berdasarkan ID, dan jika barcode utama dihapus, set barcode lain sebagai utama
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

    // Mengubah barcode tertentu menjadi barcode utama untuk produk
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

    // Generate barcode unik untuk produk (gunakan helper di model Barcode)
    public function generateBarcode($produkId)
    {
        $produk = Produk::findOrFail($produkId);
        $barcode = Barcode::generateUniqueBarcode();

        return response()->json([
            'kode_barcode' => $barcode
        ]);
    }

    // Menampilkan halaman daftar restok
    public function restokIndex()
    {
        $restoks = Restok::with('detailRestoks')->orderBy('tanggal', 'desc')->paginate(20);
        return view('restok.index', compact('restoks'));
    }

    // Menyimpan data restok baru beserta detail produk yang direstok, update stok produk
    public function restokStore(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'user_id' => 'nullable|integer',
            'jumlah_produk' => 'required|integer|min:1',
            'total_harga_beli' => 'required|numeric|min:0',
            'keterangan' => 'nullable|string',
            'detail' => 'required|array|min:1',
            'detail.*.produk_id' => 'required|integer|exists:produks,id',
            'detail.*.nama_produk' => 'required|string',
            'detail.*.supplier' => 'nullable|string',
            'detail.*.jumlah' => 'required|integer|min:1',
            'detail.*.satuan' => 'required|string',
            'detail.*.harga_beli' => 'required|numeric|min:0',
            'detail.*.subtotal' => 'required|numeric|min:0',
            'detail.*.multi_harga' => 'nullable|array',
        ]);

        DB::beginTransaction();
        try {
            $restok = Restok::create([
                'tanggal' => $request->tanggal,
                'user_id' => $request->user_id,
                'jumlah_produk' => $request->jumlah_produk,
                'total_harga_beli' => $request->total_harga_beli,
                'keterangan' => $request->keterangan,
            ]);

            foreach ($request->detail as $item) {
                DetailRestoks::create([
                    'restok_id' => $restok->id,
                    'produk_id' => $item['produk_id'],
                    'nama_produk' => $item['nama_produk'],
                    'supplier' => $item['supplier'] ?? null,
                    'jumlah' => $item['jumlah'],
                    'satuan' => $item['satuan'],
                    'harga_beli' => $item['harga_beli'],
                    'subtotal' => $item['subtotal'],
                    'multi_harga' => isset($item['multi_harga']) ? json_encode($item['multi_harga']) : null,
                ]);

                // Update stok produk (konversi jika satuan berbeda)
                $produk = Produk::find($item['produk_id']);
                if ($produk) {
                    $jumlahTambah = $item['jumlah'];
                    if ($item['satuan'] !== $produk->satuan) {
                        $konversi = \App\Models\KonversiSatuan::where('produk_id', $produk->id)
                            ->where('satuan_besar', $item['satuan'])
                            ->value('konversi');
                        if ($konversi && $konversi > 0) {
                            $jumlahTambah = $item['jumlah'] * $konversi;
                        }
                    }
                    $produk->increment('stok', $jumlahTambah); // stok di DB selalu dalam satuan dasar (pcs)
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Restok berhasil disimpan', 'restok_id' => $restok->id]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Gagal menyimpan restok: ' . $e->getMessage()], 500);
        }
    }

    // Mengambil detail restok berdasarkan ID restok
    public function restokShow($id)
    {
        $restok = Restok::with('detailRestoks')->findOrFail($id);
        return response()->json($restok);
    }

    // Menghapus data restok berdasarkan ID
    public function restokDestroy($id)
    {
        $restok = Restok::findOrFail($id);
        $restok->delete();
        return response()->json(['success' => true, 'message' => 'Restok berhasil dihapus']);
    }

    // Menyimpan data retur produk (pengurangan stok), konversi satuan jika perlu
    public function returStore(Request $request)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'detail' => 'required|array|min:1',
            'detail.*.produk_id' => 'required|integer|exists:produks,id',
            'detail.*.nama_produk' => 'required|string',
            'detail.*.satuan' => 'required|string',
            'detail.*.jumlah' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            foreach ($request->detail as $item) {
                $produk = Produk::find($item['produk_id']);
                if ($produk) {
                    $jumlahKurang = $item['jumlah'];
                    // Jika satuan retur bukan satuan dasar, konversi ke satuan dasar
                    if ($item['satuan'] !== $produk->satuan) {
                        $konversi = \App\Models\KonversiSatuan::where('produk_id', $produk->id)
                            ->where('satuan_besar', $item['satuan'])
                            ->value('konversi');
                        if ($konversi && $konversi > 0) {
                            $jumlahKurang = $item['jumlah'] * $konversi;
                        }
                    }
                    // Kurangi stok, pastikan tidak minus
                    $produk->decrement('stok', min($jumlahKurang, $produk->stok));
                }
                // (Opsional) Simpan log retur ke tabel lain jika ingin histori retur
            }

            DB::commit();
            return response()->json(['success' => true, 'message' => 'Retur berhasil disimpan']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Gagal menyimpan retur: ' . $e->getMessage()], 500);
        }
    }
}
