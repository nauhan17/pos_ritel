{{-- filepath: resources/views/pengguna/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Daftar Pengguna')

@section('content')
    <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="mb-0">Kelola Data Pengguna</h3>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalTambahPengguna">
                <i class="fas fa-user-plus"></i> Register Pengguna
            </button>
        </div>
        <div class="card shadow-sm rounded-4">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-bordered table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>#</th>
                                <th>Nama</th>
                                <th>No. HP</th>
                                <th>Hak Akses</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="penggunaTableBody">
                            <!-- Data pengguna akan diisi oleh JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Register Pengguna -->
    <div class="modal fade" id="modalTambahPengguna" tabindex="-1" aria-labelledby="modalTambahLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <form method="POST" autocomplete="off" id="formTambahPengguna">
                @csrf
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalTambahLabel">Register Pengguna Baru</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                    </div>
                    <div class="modal-body" style="max-height:70vh; overflow-y:auto;">
                        <div class="row g-3">
                            <div class="mb-3">
                                <label class="form-label">Nama</label>
                                <input type="text" name="nama" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">No. HP</label>
                                <input type="text" name="no_hp" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Hak Akses Per Halaman</label>
                                <div class="d-flex flex-wrap gap-2">
                                    @foreach (['dashboard', 'produk', 'kasir', 'tracking', 'pengguna'] as $akses)
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="akses[]"
                                                value="{{ $akses }}" id="akses{{ ucfirst($akses) }}">
                                            <label class="form-check-label"
                                                for="akses{{ ucfirst($akses) }}">{{ ucfirst($akses) }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select name="is_active" class="form-select" required>
                                    <option value="1">Aktif</option>
                                    <option value="0">Nonaktif</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" name="password" class="form-control" required
                                    autocomplete="new-password">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Register</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    <!-- Modal Edit Pengguna -->
    <div class="modal fade" id="modalEditPengguna" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Pengguna</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form method="POST" id="formEditPengguna">
                    <div class="modal-body">
                        <div class="row g">
                            <input type="hidden" id="editPenggunaId" name="id">

                            <div class="mb-3">
                                <label for="editNama" class="form-label">Nama</label>
                                <input type="text" class="form-control" id="editNama" name="nama" required>
                            </div>

                            <div class="mb-3">
                                <label for="editEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="editEmail" name="email" required>
                            </div>

                            <div class="mb-3">
                                <label for="editNoHp" class="form-label">No HP</label>
                                <input type="text" class="form-control" id="editNoHp" name="no_hp" required>
                            </div>
                            <div class="mb-3">
                                <label for="editPassword" class="form-label">Password Baru</label>
                                <input type="password" class="form-control" id="editPassword" name="password" autocomplete="new-password">
                                <small class="text-muted">Kosongkan jika tidak ingin mengubah password</small>
                            </div>
                            <!-- Perbaiki checkbox style agar konsisten -->
                            <div class="mb-3">
                                <label class="form-label">Hak Akses</label>
                                <div class="d-flex flex-wrap gap-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="akses[]" value="dashboard" id="editDashboard">
                                        <label class="form-check-label" for="editDashboard">Dashboard</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="akses[]" value="produk" id="editProduk">
                                        <label class="form-check-label" for="editProduk">Produk</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="akses[]" value="kasir" id="editKasir">
                                        <label class="form-check-label" for="editKasir">Kasir</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="akses[]" value="tracking" id="editTracking">
                                        <label class="form-check-label" for="editTracking">Tracking</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="akses[]" value="pengguna" id="editPengguna">
                                        <label class="form-check-label" for="editPengguna">Pengguna</label>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input type="checkbox" class="form-check-input" id="editIsActive" name="is_active" value="1">
                                    <label class="form-check-label" for="editIsActive">Status Aktif</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="submit" class="btn btn-primary">Update</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    @push('scripts')
        <script src="{{ asset('js/modules/pengguna.js') }}"></script>
    @endpush
@endsection
