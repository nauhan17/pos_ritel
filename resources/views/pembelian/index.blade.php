{{-- filepath: resources/views/pembelian/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Pembelian')

@section('content')
<div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">Pembelian / Restok Produk</h3>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalTambahPembelian">
            <i class="fas fa-plus"></i> Tambah Pembelian
        </button>
    </div>
    <div class="card shadow-sm rounded-4 mb-4">
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>#</th>
                            <th>No. Nota</th>
                            <th>Tanggal</th>
                            <th>Supplier</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{-- Contoh data statis, ganti dengan @foreach($pembelians as $pembelian) pada implementasi --}}
                        <tr>
                            <td>1</td>
                            <td>PB-20250722-001</td>
                            <td>22-07-2025</td>
                            <td>PT Sumber Makmur</td>
                            <td>Rp2.500.000</td>
                            <td><span class="badge bg-success">Selesai</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" title="Detail"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-warning" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger" title="Hapus"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>PB-20250722-002</td>
                            <td>22-07-2025</td>
                            <td>CV Maju Jaya</td>
                            <td>Rp1.200.000</td>
                            <td><span class="badge bg-warning text-dark">Proses</span></td>
                            <td>
                                <button class="btn btn-sm btn-info" title="Detail"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-warning" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger" title="Hapus"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                        {{-- End contoh --}}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Modal Tambah Pembelian -->
<div class="modal fade" id="modalTambahPembelian" tabindex="-1" aria-labelledby="modalTambahPembelianLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <form autocomplete="off">
      <div class="modal-content rounded-4 shadow">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTambahPembelianLabel">
            <i class="fas fa-cart-plus me-2"></i>Tambah Pembelian / Restok Produk
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">No. Nota</label>
              <input type="text" class="form-control" placeholder="Otomatis / Manual">
            </div>
            <div class="col-md-6">
              <label class="form-label">Tanggal</label>
              <input type="date" class="form-control" value="{{ date('Y-m-d') }}">
            </div>
            <div class="col-md-6">
              <label class="form-label">Supplier</label>
              <input type="text" class="form-control" placeholder="Nama Supplier">
            </div>
            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select class="form-select">
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
          </div>
          <hr>
          <div>
            <label class="form-label">Daftar Produk</label>
            <button type="button" class="btn btn-sm btn-success ms-2" data-bs-toggle="modal" data-bs-target="#modalTambahProduk">
              <i class="fas fa-plus"></i> Tambah Produk
            </button>
            <div class="table-responsive mt-2">
              <table class="table table-bordered table-sm align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Produk</th>
                    <th>Qty</th>
                    <th>Satuan</th>
                    <th>Harga Beli</th>
                    <th>Subtotal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {{-- Contoh baris produk --}}
                  <tr>
                    <td>Beras 5kg</td>
                    <td>10</td>
                    <td>Sak</td>
                    <td>Rp120.000</td>
                    <td>Rp1.200.000</td>
                    <td>
                      <button class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                    </td>
                  </tr>
                  {{-- End contoh --}}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="me-auto fw-bold">Total: <span class="text-primary">Rp1.200.000</span></div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Simpan Pembelian
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Modal Tambah Produk ke Pembelian -->
<div class="modal fade" id="modalTambahProduk" tabindex="-1" aria-labelledby="modalTambahProdukLabel" aria-hidden="true">
  <div class="modal-dialog">
    <form autocomplete="off">
      <div class="modal-content rounded-4 shadow">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTambahProdukLabel">
            <i class="fas fa-plus me-2"></i>Tambah Produk ke Pembelian
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Produk</label>
            <input type="text" class="form-control" placeholder="Cari / Pilih Produk">
          </div>
          <div class="mb-3">
            <label class="form-label">Qty</label>
            <input type="number" class="form-control" min="1" value="1">
          </div>
          <div class="mb-3">
            <label class="form-label">Satuan</label>
            <input type="text" class="form-control" placeholder="Satuan">
          </div>
          <div class="mb-3">
            <label class="form-label">Harga Beli</label>
            <input type="number" class="form-control" min="0" value="0">
          </div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-success">
            <i class="fas fa-plus"></i> Tambah ke Daftar
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
@endsection
