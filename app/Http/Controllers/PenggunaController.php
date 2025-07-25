<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PenggunaController extends Controller
{
    // Menampilkan halaman pengguna
    public function index()
    {
        return view('pengguna.index');
    }

    // API endpoint untuk mengambil semua data pengguna
    public function endpoint()
    {
        try {
            $pengguna = Pengguna::all();
            // HAPUS manual decode - cast sudah handle otomatis
            return response()->json($pengguna);
        } catch (\Exception $e) {
            Log::error('Error endpoint pengguna: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengambil data pengguna'], 500);
        }
    }

    // Menyimpan pengguna baru
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:penggunas,email', // PERBAIKI: penggunas
            'password' => 'required|string|min:6',
            'no_hp' => 'required|string|max:20',
            'akses' => 'required|array|min:1',
            'akses.*' => 'in:dashboard,produk,kasir,tracking,pengguna'
        ], [
            'nama.required' => 'Nama wajib diisi',
            'email.required' => 'Email wajib diisi',
            'email.email' => 'Format email tidak valid',
            'email.unique' => 'Email sudah digunakan',
            'password.required' => 'Password wajib diisi',
            'password.min' => 'Password minimal 6 karakter',
            'no_hp.required' => 'No HP wajib diisi',
            'akses.required' => 'Pilih minimal satu hak akses',
            'akses.min' => 'Pilih minimal satu hak akses'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $pengguna = Pengguna::create([
                'nama' => $request->nama,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'no_hp' => $request->no_hp,
                'akses' => $request->akses, // HAPUS json_encode - cast sudah handle
                'is_active' => $request->has('is_active') ? 1 : 0
            ]);

            return response()->json([
                'message' => 'Pengguna berhasil ditambahkan',
                'data' => $pengguna
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error create pengguna: ' . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menambahkan pengguna: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $pengguna = Pengguna::findOrFail($id);
            // HAPUS manual decode - cast sudah handle otomatis
            return response()->json($pengguna);
        } catch (\Exception $e) {
            Log::error('Error show pengguna: ' . $e->getMessage());
            return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
        }
    }

    public function update(Request $request, $id)
    {
        // Debug request
        Log::info('Update pengguna request:', [
            'id' => $id,
            'data' => $request->all()
        ]);

        $pengguna = Pengguna::find($id);

        if (!$pengguna) {
            return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:penggunas,email,' . $id, // PERBAIKI: penggunas
            'password' => 'nullable|string|min:6',
            'no_hp' => 'required|string|max:20',
            'akses' => 'required|array|min:1',
            'akses.*' => 'in:dashboard,produk,kasir,tracking,pengguna'
        ], [
            'nama.required' => 'Nama wajib diisi',
            'email.required' => 'Email wajib diisi',
            'email.email' => 'Format email tidak valid',
            'email.unique' => 'Email sudah digunakan',
            'password.min' => 'Password minimal 6 karakter',
            'no_hp.required' => 'No HP wajib diisi',
            'akses.required' => 'Pilih minimal satu hak akses',
            'akses.min' => 'Pilih minimal satu hak akses'
        ]);

        if ($validator->fails()) {
            Log::error('Validasi gagal:', $validator->errors()->toArray());
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updateData = [
                'nama' => $request->nama,
                'email' => $request->email,
                'no_hp' => $request->no_hp,
                'akses' => $request->akses, // HAPUS json_encode - cast sudah handle
                'is_active' => $request->has('is_active') ? 1 : 0
            ];

            // Update password hanya jika diisi
            if ($request->filled('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            Log::info('Data yang akan diupdate:', $updateData);

            $pengguna->update($updateData);

            Log::info('Update berhasil');

            return response()->json([
                'message' => 'Data pengguna berhasil diupdate',
                'data' => $pengguna->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Error update pengguna:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Gagal mengupdate pengguna: ' . $e->getMessage()
            ], 500);
        }
    }

    // Hapus pengguna
    public function destroy($id)
    {
        try {
            $pengguna = Pengguna::find($id);

            if (!$pengguna) {
                return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
            }

            // Cek apakah pengguna yang akan dihapus adalah pengguna yang sedang login
            $penggunaLogin = session('pengguna');
            if ($penggunaLogin && $penggunaLogin['id'] == $id) {
                return response()->json([
                    'message' => 'Tidak dapat menghapus akun yang sedang digunakan'
                ], 422);
            }

            $pengguna->delete();

            return response()->json([
                'message' => 'Pengguna berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            Log::error('Error delete pengguna: ' . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menghapus pengguna: ' . $e->getMessage()
            ], 500);
        }
    }
}
