<?php

namespace App\Http\Controllers;
use App\Models\Pengguna;
use Illuminate\Support\Facades\Hash;

use Illuminate\Http\Request;

class LoginController extends Controller
{
    //
    public function index(){
        return view('login.index');
    }

    public function proses(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'password' => 'required'
        ]);

        $pengguna = Pengguna::where('email', $request->email)->first();

        if ($pengguna && Hash::check($request->password, $pengguna->password) && $pengguna->is_active) {
            // Simpan data pengguna ke session
            session(['pengguna' => [
                'id' => $pengguna->id,
                'nama' => $pengguna->nama,
                'email' => $pengguna->email,
                'no_hp' => $pengguna->no_hp,
                'akses' => $pengguna->akses,
                'is_active' => $pengguna->is_active
            ]]);
            return response()->json([
                'success' => true,
                'pengguna' => session('pengguna')
            ]);
        }
        return response()->json([
            'success' => false,
            'message' => 'Email atau password salah, atau akun nonaktif!'
        ]);
    }
}
