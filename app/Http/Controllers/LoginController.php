<?php

namespace App\Http\Controllers;
use App\Models\Pengguna;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

use Illuminate\Http\Request;

class LoginController extends Controller
{
    // Menampilkan halaman login ke user
    public function index(){
        return view('login.index');
    }

    // Memproses login user berdasarkan nama dan password
    // Validasi input, cek kecocokan password, cek status aktif, dan login menggunakan Auth Laravel
    // Jika berhasil, simpan data pengguna ke session dan kembalikan response JSON sukses
    // Jika gagal, kembalikan response JSON error
    public function proses(Request $request)
    {
        // Validasi input login
        $request->validate([
            'nama' => 'required',
            'password' => 'required'
        ]);

        // Cari pengguna berdasarkan nama
        $pengguna = Pengguna::where('nama', $request->nama)->first();

        // Cek password dan status aktif
        if ($pengguna && Hash::check($request->password, $pengguna->password) && (int)$pengguna->is_active === 1) {
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

            // Response sukses login
            return response()->json([
                'success' => true,
                'pengguna' => $pengguna,
                'akses' => $aksesArr
            ]);
        } else {
            // Pesan error jika gagal login
            return response()->json([
                'success' => false,
                'message' => 'Nama atau password salah atau akun tidak aktif'
            ]);
        }
    }
}
