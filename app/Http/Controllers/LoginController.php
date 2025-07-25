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
            // Pastikan akses selalu array
            $akses = $pengguna->akses;
            if (is_string($akses)) {
                $aksesArr = json_decode($akses, true);
                if (json_last_error() !== JSON_ERROR_NONE || !$aksesArr) {
                    // Jika gagal decode, jadikan array dari string
                    $aksesArr = [$akses];
                }
            } else {
                $aksesArr = (array) $akses;
            }

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
                'pengguna' => session('pengguna')
            ]);
        }
    }
}
