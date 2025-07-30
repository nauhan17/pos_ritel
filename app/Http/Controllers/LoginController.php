<?php

namespace App\Http\Controllers;
use App\Models\Pengguna;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

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
            'nama' => 'required',
            'password' => 'required'
        ]);

        $pengguna = Pengguna::where('nama', $request->nama)->first();

        if ($pengguna && Hash::check($request->password, $pengguna->password) && $pengguna->is_active) {
            // Login dengan Laravel Auth
            Auth::login($pengguna);

            // Pastikan akses selalu array
            $akses = $pengguna->akses;
            if (is_string($akses)) {
                $aksesArr = json_decode($akses, true);
                if (json_last_error() !== JSON_ERROR_NONE || !$aksesArr) {
                    $aksesArr = [$akses];
                }
            } else {
                $aksesArr = (array) $akses;
            }

            // (Opsional) Simpan ke session manual jika memang dibutuhkan oleh kode lama
            session(['pengguna' => [
                'id' => $pengguna->id,
                'nama' => $pengguna->nama,
                'email' => $pengguna->email,
                'no_hp' => $pengguna->no_hp,
                'akses' => $aksesArr,
                'is_active' => $pengguna->is_active
            ]]);

            return response()->json([
                'success' => true,
                'pengguna' => [
                    'id' => $pengguna->id,
                    'nama' => $pengguna->nama,
                    'email' => $pengguna->email,
                    'no_hp' => $pengguna->no_hp,
                    'akses' => $aksesArr,
                    'is_active' => $pengguna->is_active
                ]
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah, atau akun tidak aktif.'
            ]);
        }
    }
}
