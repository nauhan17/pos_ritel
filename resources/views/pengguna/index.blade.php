@extends('layouts.app')

@section('title', 'Data Pengguna')

@section('content')
<div class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">Kelola Data Pengguna</h3>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalTambahPengguna">
            <i class="fas fa-user-plus"></i> Register Pengguna
        </button>
    </div>
    <div class="table-responsive">
        <table class="table table-striped table-bordered table-hover align-middle rounded" id="penggunaTable">
            <thead class="table-light align-middle fw-semibold border-bottom">
                <tr>
                    <th width="40" class="text-center">
                        <input type="checkbox" id="selectAllPengguna">
                    </th>
                    <th>
                        <span class="d-inline-flex align-items-center gap-1">
                            <i class="fas fa-user"></i>
                            Nama
                        </span>
                    </th>
                    <th>
                        <span class="d-inline-flex align-items-center gap-1">
                            <i class="fas fa-phone"></i>
                            No. HP
                        </span>
                    </th>
                    <th>
                        <span class="d-inline-flex align-items-center gap-1">
                            <i class="fas fa-key"></i>
                            Hak Akses
                        </span>
                    </th>
                    <th>
                        <span class="d-inline-flex align-items-center gap-1">
                            <i class="fas fa-toggle-on"></i>
                            Status
                        </span>
                    </th>
                    <th class="text-center" width="120">
                        <span class="d-inline-flex align-items-center gap-1">
                            <i class="fas fa-cogs"></i>
                            Aksi
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody id="penggunaTableBody">
                {{-- Data pengguna diisi oleh JS --}}
            </tbody>
        </table>
    </div>
</div>

<!-- Modal Tambah Pengguna -->
<div class="modal fade" id="modalTambahPengguna" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="formTambahPengguna" autocomplete="off">
                <div class="modal-header">
                    <h5 class="modal-title">Register Pengguna</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="nama" class="form-label">Nama</label>
                        <input type="text" name="nama" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="no_hp" class="form-label">No HP</label>
                        <input type="text" name="no_hp" class="form-control">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Hak Akses</label>
                        <div>
                            <input type="checkbox" name="akses[]" value="dashboard"> Dashboard
                            <input type="checkbox" name="akses[]" value="produk"> Produk
                            <input type="checkbox" name="akses[]" value="kasir"> Kasir
                            <input type="checkbox" name="akses[]" value="tracking"> Tracking
                            <input type="checkbox" name="akses[]" value="pengguna"> Pengguna
                        </div>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" name="is_active" class="form-check-input" id="isActiveTambah" checked>
                        <label class="form-check-label" for="isActiveTambah">Aktif</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Simpan</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        </div>
    </div>
</div>
<div class="modal fade" id="modalEditPengguna" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="formEditPengguna" autocomplete="off">
                <input type="hidden" id="editPenggunaId">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Pengguna</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="editNama" class="form-label">Nama</label>
                        <input type="text" id="editNama" name="nama" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="editEmail" class="form-label">Email</label>
                        <input type="email" id="editEmail" name="email" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="editPassword" class="form-label">Password (kosongkan jika tidak diubah)</label>
                        <input type="password" id="editPassword" name="password" class="form-control">
                    </div>
                    <div class="mb-3">
                        <label for="editNoHp" class="form-label">No HP</label>
                        <input type="text" id="editNoHp" name="no_hp" class="form-control">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Hak Akses</label>
                        <div>
                            <input type="checkbox" name="akses[]" value="dashboard"> Dashboard
                            <input type="checkbox" name="akses[]" value="produk"> Produk
                            <input type="checkbox" name="akses[]" value="kasir"> Kasir
                            <input type="checkbox" name="akses[]" value="tracking"> Tracking
                            <input type="checkbox" name="akses[]" value="pengguna"> Pengguna
                        </div>
                    </div>
                    <div class="mb-3 form-check">
                        <input type="checkbox" id="editIsActive" name="is_active" class="form-check-input">
                        <label class="form-check-label" for="editIsActive">Aktif</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Simpan</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script src="{{ asset('js/modules/pengguna.js') }}"></script>
@endpush
