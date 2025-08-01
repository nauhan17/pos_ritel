<?php
namespace App\Http\Controllers;

use App\Models\Transaksi;
use App\Models\DetailTransaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransaksiController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'no_transaksi' => 'required|unique:transaksis',
            'tanggal' => 'required|date',
            'total' => 'required|numeric',
            'uang_customer' => 'required|numeric',
            'kembalian' => 'required|numeric',
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

        DB::transaction(function () use ($request, $no_transaksi) {
            $transaksi = Transaksi::create([
                'no_transaksi' => $no_transaksi,
                'tanggal' => $request->tanggal,
                'total' => $request->total,
                'uang_customer' => $request->uang_customer,
                'kembalian' => $request->kembalian,
                'status' => $request->status,
                'nama_pembeli' => $request->nama_pembeli,
                'no_hp' => $request->no_hp,
                'jatuh_tempo' => $request->jatuh_tempo,
            ]);
            foreach ($request->items as $item) {
                $transaksi->details()->create($item);
            }
        });

        return response()->json(['success' => true, 'no_transaksi' => $no_transaksi]);
    }

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
}
