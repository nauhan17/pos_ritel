<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CekHakAkses
{
    public function handle(Request $request, Closure $next, $akses)
    {
        $pengguna = session('pengguna');
        $aksesArr = is_array($pengguna['akses']) ? $pengguna['akses'] : json_decode($pengguna['akses'] ?? '[]', true);

        if (!$pengguna || !in_array($akses, $aksesArr ?? [])) {
            return redirect('/login')->with('error', 'Anda tidak memiliki hak akses!');
        }
        return $next($request);
    }
}
