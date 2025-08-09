<?php

namespace App\Http\Controllers;

use App\Models\Pengguna;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PenggunaController extends Controller
{
    // Menampilkan halaman utama pengguna (view)
    public function index()
    {
        return view('pengguna.index');
    }

    // Mengambil semua data pengguna (API endpoint)
    public function endpoint()
    {
        try {
            $pengguna = Pengguna::all();
            // Data dikembalikan dalam bentuk JSON
            return response()->json($pengguna);
        } catch (\Exception $e) {
            Log::error('Error endpoint pengguna: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal mengambil data pengguna'], 500);
        }
    }

    // Menyimpan pengguna baru ke database
    public function store(Request $request)
    {
        // Validasi input pengguna baru
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:penggunas,email',
            'password' => 'required|string|min:6',
            'no_hp' => 'required|string|max:20',
            'akses' => 'required|array|min:1',
            'akses.*' => 'in:dashboard,produk,kasir,tracking,pengguna'
        ], [
            // Pesan validasi kustom
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

        // Jika validasi gagal, kembalikan error
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Simpan pengguna baru ke database
            $pengguna = Pengguna::create([
                'nama' => $request->nama,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'no_hp' => $request->no_hp,
                'akses' => $request->akses, // Cast otomatis array
                'is_active' => $request->input('is_active', 0) ? 1 : 0
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

    // Mengambil detail satu pengguna berdasarkan ID
    public function show($id)
    {
        try {
            $pengguna = Pengguna::findOrFail($id);

            // Pastikan akses selalu array (untuk frontend)
            if (is_string($pengguna->akses)) {
                $akses = json_decode($pengguna->akses, true);
                $pengguna->akses = is_array($akses) ? $akses : [];
            }

            // Data dikembalikan dalam bentuk JSON
            return response()->json($pengguna);
        } catch (\Exception $e) {
            Log::error('Error show pengguna: ' . $e->getMessage());
            return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
        }
    }

    // Mengupdate data pengguna berdasarkan ID
    public function update(Request $request, $id)
    {
        // Log data request untuk debugging
        Log::info('Update pengguna request:', [
            'id' => $id,
            'data' => $request->all()
        ]);

        $pengguna = Pengguna::find($id);

        if (!$pengguna) {
            return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
        }

        // Validasi input update pengguna
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:penggunas,email,' . $id,
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

        // Jika validasi gagal, kembalikan error
        if ($validator->fails()) {
            Log::error('Validasi gagal:', $validator->errors()->toArray());
            return response()->json([
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Siapkan data update
            $updateData = [
                'nama' => $request->nama,
                'email' => $request->email,
                'no_hp' => $request->no_hp,
                'akses' => $request->akses,
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

    // Menghapus pengguna berdasarkan ID
    public function destroy($id)
    {
        try {
            $pengguna = Pengguna::find($id);

            if (!$pengguna) {
                return response()->json(['message' => 'Pengguna tidak ditemukan'], 404);
            }

            // Cegah pengguna menghapus akun sendiri (yang sedang login)
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
