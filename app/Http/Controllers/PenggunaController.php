<?php

namespace App\Http\Controllers;
use App\Models\Pengguna;

use Illuminate\Http\Request;

class PenggunaController extends Controller
{
    //
    public function index()
    {
        return view('pengguna.index'); // Pastikan nama view sesuai
    }

    public function endpoint()
    {
        $penggunas = Pengguna::all();
        return response()->json($penggunas);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:penggunas,email',
            'no_hp' => 'required|string|max:20',
            'akses' => 'required|array',
            'is_active' => 'required|boolean',
            'password' => 'required|string|min:6',
        ]);

        $pengguna = new Pengguna();
        $pengguna->nama = $request->nama;
        $pengguna->email = $request->email;
        $pengguna->no_hp = $request->no_hp;
        $pengguna->akses = $request->akses; // Simpan sebagai array/JSON
        $pengguna->is_active = $request->is_active;
        $pengguna->password = bcrypt($request->password);
        $pengguna->save();

        return redirect()->route('pengguna.index')->with('success', 'Pengguna berhasil didaftarkan!');
    }
}
