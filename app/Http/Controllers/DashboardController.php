<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Produk;
use App\Models\Transaksi;
use App\Models\DetailTransaksi;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function index(){
        return view('dashboard.index');
    }

    public function insight()
    {
        $total_produk = Produk::count();
        $total_stok = Produk::sum('stok');
        $total_modal = Produk::sum(DB::raw('stok * harga_beli'));
        $nilai_total_produk = Produk::sum(DB::raw('stok * harga_jual'));

        $today = now()->toDateString();
        $total_penjualan_hari_ini = Transaksi::whereDate('tanggal', $today)->sum('total');
        $total_produk_terjual = DetailTransaksi::whereHas('transaksi', function($q) use ($today) {
            $q->whereDate('tanggal', $today);
        })->sum('qty');
        // Hitung keuntungan hari ini
        $keuntungan_hari_ini = Transaksi::whereDate('tanggal', $today)->get()->sum(function($t) {
            return $t->details->sum(function($d) {
                return ($d->harga - ($d->produk->harga_beli ?? 0)) * $d->qty;
            });
        });
        $rata_rata_penjualan = $total_penjualan_hari_ini > 0 && $total_produk_terjual > 0
            ? ($total_penjualan_hari_ini / $total_produk_terjual)
            : 0;

        return response()->json([
            'total_produk' => $total_produk,
            'total_stok' => $total_stok,
            'total_modal' => $total_modal,
            'nilai_total_produk' => $nilai_total_produk,
            'total_penjualan_hari_ini' => $total_penjualan_hari_ini,
            'total_produk_terjual' => $total_produk_terjual,
            'keuntungan_hari_ini' => $keuntungan_hari_ini,
            'rata_rata_penjualan' => $rata_rata_penjualan,
        ]);
    }

    public function penjualan(Request $request)
    {
        $range = $request->get('range', 'minggu');
        $labels = [];
        $penjualan = [];
        $keuntungan = [];

        if ($range === 'minggu') {
            $labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
            for ($i = 0; $i < 7; $i++) {
                $date = now()->startOfWeek()->addDays($i)->toDateString();
                $trx = Transaksi::whereDate('tanggal', $date)->get();
                $penjualan[] = $trx->count() ? $trx->sum('total') : 0;
                $keuntungan[] = $trx->count() ? $trx->sum(function($t) {
                    return $t->details->sum(function($d) {
                        return ($d->harga - ($d->produk->harga_beli ?? 0)) * $d->qty;
                    });
                }) : 0;
            }
        } elseif ($range === 'bulan') {
            $labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
            $start = now()->startOfMonth()->startOfDay();
            $endOfMonth = now()->endOfMonth()->endOfDay();
            for ($i = 0; $i < 4; $i++) {
                $weekStart = $start->copy()->addDays($i * 7);
                // Minggu terakhir: sampai akhir bulan
                if ($i === 3) {
                    $weekEnd = $endOfMonth;
                } else {
                    $weekEnd = $weekStart->copy()->addDays(6)->endOfDay();
                    if ($weekEnd > $endOfMonth) {
                        $weekEnd = $endOfMonth;
                    }
                }
                $trx = Transaksi::whereBetween('tanggal', [$weekStart, $weekEnd])->get();
                $penjualan[] = $trx->sum('total');
                $keuntungan[] = $trx->sum(function($t) {
                    return $t->details->sum(function($d) {
                        return ($d->harga - ($d->produk->harga_beli ?? 0)) * $d->qty;
                    });
                });
            }
        } elseif ($range === 'tahun') {
            $labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            for ($i = 1; $i <= 12; $i++) {
                $trx = Transaksi::whereMonth('tanggal', $i)->whereYear('tanggal', now()->year)->get();
                $penjualan[] = $trx->count() ? $trx->sum('total') : 0;
                $keuntungan[] = $trx->count() ? $trx->sum(function($t) {
                    return $t->details->sum(function($d) {
                        return ($d->harga - ($d->produk->harga_beli ?? 0)) * $d->qty;
                    });
                }) : 0;
            }
        }

        return response()->json([
            'labels' => $labels,
            'penjualan' => $penjualan,
            'keuntungan' => $keuntungan,
        ]);
    }

    public function produkHampirHabis()
    {
        $produk = Produk::where('stok', '<=', 5)
            ->orderBy('stok')
            ->limit(10)
            ->get(['nama_produk', 'stok']);
        return response()->json($produk);
    }
}
