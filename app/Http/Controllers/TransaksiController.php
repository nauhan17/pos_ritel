<?php
namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\DetailTransaksi;
use Illuminate\Http\Request;
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

        // Simpan transaksi dan detailnya dalam satu transaksi database (atomic)
        DB::transaction(function () use ($request, $no_transaksi, &$transaksi) {
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
        ]);
    }

    // Membuat nomor transaksi baru secara otomatis berdasarkan tanggal dan urutan terakhir hari ini.
    public static function generateNoTransaksi()
    {
        $prefix = 'TRX' . date('Ymd');
        $last = Transaksi::whereDate('tanggal', date('Y-m-d'))
            ->orderByDesc('no_transaksi')
            ->first();

        if ($last && preg_match('/\-(\d+)$/', $last->no_transaksi, $m)) {
            $next = str_pad($m[1] + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $next = '001';
        }
        return $prefix . '-' . $next;
    }

    // Mengambil nomor transaksi baru (tanpa menyimpan transaksi), biasanya untuk kebutuhan frontend.
    public function getNoTransaksiBaru()
    {
        $prefix = 'TRX' . date('Ymd');
        $last = Transaksi::whereDate('tanggal', date('Y-m-d'))
            ->orderByDesc('no_transaksi')
            ->first();

        if ($last && preg_match('/\-(\d+)$/', $last->no_transaksi, $m)) {
            $next = str_pad($m[1] + 1, 3, '0', STR_PAD_LEFT);
        } else {
            $next = '001';
        }
        return response()->json(['no_transaksi' => $prefix . '-' . $next]);
    }

    // Mengambil detail transaksi berdasarkan ID, termasuk detail itemnya.
    // Data dikembalikan dalam bentuk JSON, cocok untuk kebutuhan API/frontend.
    public function show($id)
    {
        $transaksi = Transaksi::with('details')->findOrFail($id);
        return response()->json([
            'id' => $transaksi->id,
            'no_transaksi' => $transaksi->no_transaksi,
            'tanggal' => $transaksi->tanggal,
            'total' => $transaksi->total,
            'hutang' => $transaksi->hutang,
            'status' => $transaksi->status,
            'nama_pembeli' => $transaksi->nama_pembeli,
            'no_hp' => $transaksi->no_hp,
            'jatuh_tempo' => $transaksi->jatuh_tempo,
            'details' => $transaksi->details->map(function($d) {
                return [
                    'nama_produk' => $d->nama_produk,
                    'qty' => $d->qty,
                    'harga' => $d->harga,
                    'subtotal' => $d->subtotal,
                ];
            })
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
}
