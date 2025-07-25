<?php

namespace App\Http\Middleware;

use Illuminate\Support\Facades\Log;
use Closure;
use Illuminate\Http\Request;

class CekHakAkses
{
    public function handle(Request $request, Closure $next, $akses)
    {
        // Logging session pengguna untuk debug
        Log::info('Session pengguna:', ['pengguna' => session('pengguna')]);
        $pengguna = session('pengguna');

        // Jika belum login
        if (!$pengguna) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Silakan login terlebih dahulu!'], 401);
            }
            return redirect('/login')->with('error', 'Silakan login terlebih dahulu!');
        }

        // Parsing akses dari session, pastikan selalu array
        $aksesArr = is_array($pengguna['akses'])
            ? $pengguna['akses']
            : json_decode($pengguna['akses'] ?? '[]', true);
        $aksesArr = $aksesArr ?: [];

        // Pecah akses dari parameter middleware (misal: 'produk,kasir')
        $aksesList = is_array($akses) ? $akses : explode(',', $akses);

        // Logging untuk debug
        Log::info('AksesArr:', ['aksesArr' => $aksesArr]);
        Log::info('AksesList:', ['aksesList' => $aksesList]);

        // Cek apakah user punya minimal satu akses yang dibutuhkan
        foreach ($aksesList as $hak) {
            if (in_array(trim($hak), $aksesArr)) {
                return $next($request);
            }
        }

        // Jika tidak punya akses
        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses!'], 403);
        }
        return response()->view('errors.forbidden', [], 403);
    }
}
