<?php
namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\Produk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class TransaksiController extends Controller
{
    // Menyimpan transaksi baru ke database beserta detail itemnya.
    // Melakukan validasi data, generate nomor transaksi otomatis, dan simpan transaksi serta detailnya dalam transaksi database.
    public function store(Request $request)
    {
        $request->validate([
            'no_transaksi' => 'required|unique:transaksis',
            'tanggal' => 'required|date',
            'total' => 'required|numeric',
            'uang_customer' => 'required|numeric',
            'kembalian' => 'required|numeric',
            'hutang' => 'nullable|numeric',
            'status' => 'required|in:lunas,hutang',
            'nama_pembeli' => 'nullable|string|max:100',
            'no_hp' => 'nullable|string|max:20',
            'jatuh_tempo' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.produk_id' => 'required|exists:produks,id',
            'items.*.nama_produk' => 'required|string',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.satuan' => 'required|string',
            'items.*.harga' => 'required|numeric',
            'items.*.subtotal' => 'required|numeric',
        ]);

        $no_transaksi = self::generateNoTransaksi();
        $transaksi = null;
        $updatedStok = [];

        // Simpan transaksi dan detailnya dalam satu transaksi database (atomic)
        DB::transaction(function () use ($request, $no_transaksi, &$transaksi, &$updatedStok) {
            $transaksi = Transaksi::create([
                'no_transaksi' => $no_transaksi,
                'tanggal' => $request->tanggal,
                'total' => $request->total,
                'uang_customer' => $request->uang_customer,
                'kembalian' => $request->kembalian,
                'hutang' => $request->hutang,
                'status' => $request->status,
                'nama_pembeli' => $request->nama_pembeli,
                'no_hp' => $request->no_hp,
                'jatuh_tempo' => $request->jatuh_tempo,
            ]);

            foreach ($request->items as $item) {
                $transaksi->details()->create($item);

                // Kurangi stok produk secara atomik
                $produkId = (int)($item['produk_id'] ?? 0);
                $qty = (int)($item['qty'] ?? 0);
                $satuan = $item['satuan'] ?? null;
                if ($produkId > 0 && $qty > 0) {
                    $produk = Produk::lockForUpdate()->find($produkId);
                    if ($produk) {
                        // Hitung qty dalam satuan dasar (pcs)
                        $qtyPcs = $qty;
                        if ($satuan && $satuan !== $produk->satuan) {
                            // Coba cari konversi di tabel konversi_satuans (fallback konversi_satuan)
                            $konv = DB::table('konversi_satuans')
                                ->where('produk_id', $produk->id)
                                ->where('satuan_besar', $satuan)
                                ->value('konversi');
                            if ($konv === null) {
                                $konv = DB::table('konversi_satuan')
                                    ->where('produk_id', $produk->id)
                                    ->where('satuan_besar', $satuan)
                                    ->value('konversi');
                            }
                            $k = (int)($konv ?? 0);
                            $qtyPcs = $k > 0 ? $qty * $k : $qty;
                        }
                        $produk->stok = max(0, (int)$produk->stok - (int)$qtyPcs);
                        $produk->save();
                        $updatedStok[] = ['produk_id' => $produk->id, 'stok' => (int)$produk->stok];
                    }
                }
            }
        });

        if (!$transaksi) {
            return response()->json([
                'success' => false,
                'message' => 'Transaksi gagal disimpan'
            ], 500);
        }

        return response()->json([
            'success' => true,
            'no_transaksi' => $no_transaksi,
            'id' => $transaksi->id,
            'updated_stok' => $updatedStok,
        ]);
    }

    public function noBaru()
    {
        $no = $this->generateNoTransaksi();
        return response()->json(['no_transaksi' => $no], 200, ['Cache-Control' => 'no-store']);
    }

    private function generateNoTransaksi(): string
    {
        $prefix = 'TRX' . now()->format('Ymd') . '-';
        $last = Transaksi::where('no_transaksi', 'like', $prefix . '%')
            ->orderBy('no_transaksi', 'desc')
            ->value('no_transaksi');

        $seq = 0;
        if ($last && preg_match('/(\d+)$/', $last, $m)) {
            $seq = (int)$m[1];
        }
        return $prefix . str_pad((string)($seq + 1), 4, '0', STR_PAD_LEFT);
    }

    public function show($id)
    {
        $trx = \App\Models\Transaksi::findOrFail($id);
        // Ambil detail tanpa bergantung relasi
        $details = DB::table('detail_transaksis')
            ->select('transaksi_id','nama_produk','qty','harga','subtotal')
            ->where('transaksi_id', $trx->id)->get();
        return response()->json([
            'id' => $trx->id,
            'no_transaksi' => $trx->no_transaksi,
            'tanggal' => $trx->tanggal,
            'status' => $trx->status,
            'hutang' => $trx->hutang,
            'total' => $trx->total,
            'nama_pembeli' => $trx->nama_pembeli,
            'no_hp' => $trx->no_hp,
            'jatuh_tempo' => $trx->jatuh_tempo,
            'details' => $details,
        ]);
    }

    // Melunasi transaksi yang statusnya hutang.
    public function lunas($id)
    {
        try {
            $transaksi = Transaksi::findOrFail($id);
            if ($transaksi->status !== 'hutang') {
                return response()->json(['success' => false, 'message' => 'Transaksi bukan hutang'], 400);
            }
            $transaksi->status = 'lunas';
            $transaksi->save();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal melunasi hutang'], 500);
        }
    }

    public function markAsLunas($id, Request $request)
    {
        try {
            DB::transaction(function () use ($id) {
                $trx = Transaksi::lockForUpdate()->findOrFail($id);
                if ($trx->status !== 'lunas') {
                    $trx->status = 'lunas';
                    $trx->hutang = 0;
                    if (Schema::hasColumn($trx->getTable(), 'tanggal_lunas')) {
                        $trx->tanggal_lunas = now();
                    }
                    $trx->save();
                }
            });
            return response()->json(['success' => true, 'id' => (int)$id, 'status' => 'lunas']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
