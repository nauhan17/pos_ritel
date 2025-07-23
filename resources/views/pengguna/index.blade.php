{{-- resources/views/pengguna/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Data Pengguna')

@section('content')
<div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">Kelola Data Pengguna</h3>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalTambahPengguna">
            <i class="fas fa-user-plus"></i> Tambah Pengguna
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
                            <th>Email</th>
                            <th>Role/Hak Akses</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>Nama Contoh</td>
                            <td>contoh@email.com</td>
                            <td><span class="badge bg-info">Admin</span></td>
                            <td><span class="badge bg-success">Aktif</span></td>
                            <td>
                                <button class="btn btn-sm btn-warning" data-bs-toggle="modal" data-bs-target="#modalEditPengguna1"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                        <!-- Tambahkan baris contoh lain jika perlu -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Modal Tambah Pengguna -->
<div class="modal fade" id="modalTambahPengguna" tabindex="-1" aria-labelledby="modalTambahLabel" aria-hidden="true">
  <div class="modal-dialog">
    <form autocomplete="off">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTambahLabel">Tambah Pengguna</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Nama</label>
            <input type="text" name="nama" class="form-control" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form-control" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Role/Hak Akses</label>
            <select name="role" class="form-select" required>
              <option value="admin">Admin</option>
              <option value="kasir">Kasir</option>
            </select>
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
            <input type="password" name="password" class="form-control" required autocomplete="new-password">
          </div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-primary">Simpan</button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Modal Edit Pengguna (Contoh Satu Saja) -->
<div class="modal fade" id="modalEditPengguna1" tabindex="-1" aria-labelledby="modalEditLabel1" aria-hidden="true">
  <div class="modal-dialog">
    <form autocomplete="off">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalEditLabel1">Edit Pengguna</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Nama</label>
            <input type="text" name="nama" class="form-control" value="Nama Contoh" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form-control" value="contoh@email.com" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Role/Hak Akses</label>
            <select name="role" class="form-select" required>
              <option value="admin" selected>Admin</option>
              <option value="kasir">Kasir</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Status</label>
            <select name="is_active" class="form-select" required>
              <option value="1" selected>Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Password <small class="text-muted">(Kosongkan jika tidak diubah)</small></label>
            <input type="password" name="password" class="form-control" autocomplete="new-password">
          </div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-success">Simpan Perubahan</button>
        </div>
      </div>
    </form>
  </div>
</div>
@endsection
