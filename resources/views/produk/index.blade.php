@extends('layouts.app')

@section('title', 'Data Produk')

@section('content')
<div class="container-fluid py-4">
    <!-- STATISTIK -->
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-box fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalProdukCount">0</div>
                        <div class="text-muted">Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cubes fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalStokCount">0</div>
                        <div class="text-muted">Total Stok</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-money-bill-wave fa-2x text-warning"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalModalCount">0</div>
                        <div class="text-muted">Total Modal</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-chart-line fa-2x text-info"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="nilaiTotalProdukCount">0</div>
                        <div class="text-muted">Nilai Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- FILTER & AKSI -->
    <div class="row align-items-center mb-3">
        <div class="col-md-3">
            <select class="form-select" id="kategoriFilter" aria-label="Kategori Produk">
                <option selected disabled>Kategori Produk</option>
            </select>
        </div>
        <div class="col-md-3">
            <select class="form-select" id="supplierFilter" aria-label="Supplier">
                <option selected disabled>Supplier</option>
            </select>
        </div>
        <div class="col-md-3">
            <select class="form-select" id="satuanFilter" aria-label="Satuan">
                <option value="">Semua Satuan</option>
            </select>
        </div>
    </div>
    <div class="row g-3 mb-1">
        <div class="col-md-4">
            <div class="btn-group">
                <button id="baruProdukBtn" class="btn btn-primary" style="width: 120px;" data-bs-toggle="modal" data-bs-target="#baruProdukModal">
                    <span class="d-flex align-items-center justify-content-center gap-2">
                        <i class="fas fa-plus"></i>
                        <span>Baru</span>
                    </span>
                </button>
                <button id="editTableBtn" class="btn btn-warning" style="width: 120px;" data-bs-toggle="modal" data-bs-target="#editTableModal">
                    <span class="d-flex align-items-center justify-content-center gap-2">
                        <i class="fas fa-edit"></i>
                    </span>
                </button>
                <button id="aturProdukBtn" class="btn btn-secondary" style="width: 120px;" data-bs-toggle="modal" data-bs-target="#aturProdukModal">
                    <span class="d-flex align-items-center justify-content-center gap-2">
                        <i class="fas fa-cog"></i>
                        <span>Atur</span>
                    </span>
                </button>
                <button id="hapusProdukBtn" class="btn btn-danger" style="width: 120px;">
                    <span class="d-flex align-items-center justify-content-center gap-2">
                        <i class="fas fa-trash"></i>
                        <span>Hapus</span>
                    </span>
                </button>
            </div>
        </div>
        <div class="col-md-4 text-end">
            <div class="btn-group">
                <button class="btn btn-success" data-bs-toggle="tooltip" title="Export ke Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
                <button class="btn btn-danger" data-bs-toggle="tooltip" title="Export ke PDF">
                    <i class="fas fa-file-pdf"></i>
                </button>
            </div>
        </div>
        <div class="col-md-4 text-end">
            <div class="input-group" style="max-width: 320px; float: right;">
                <input type="text" id="searchProdukInput" class="form-control" placeholder="Cari produk, kategori, supplier..." aria-label="Cari produk">
                <span class="input-group-text bg-white"><i class="fas fa-search"></i></span>
            </div>
        </div>
    </div>
    <!-- TABEL PRODUK -->
    <div id="editModeBanner" class="alert alert-info py-2 mb-2 d-none">
        <i class="fas fa-edit"></i> Edit Mode Aktif — Klik sel untuk mengubah data.
        <button class="btn btn-sm btn-outline-danger float-end" id="exitEditModeBtn">Keluar Edit Mode</button>
    </div>
    <div class="table-responsive">
        <table class="table table-striped table-bordered table-hover align-middle" id="sortableTable">
            <thead class="table-light">
                <tr>
                    <th width="40px" class="text-center">
                        <input type="checkbox" id="selectAll">
                    </th>
                    <th class="sortable" data-sort="nama_produk">
                        <i class="fas fa-box me-1"></i> Nama Produk <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable" data-sort="kategori">
                        <i class="fas fa-tags me-1"></i> Kategori <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable" data-sort="supplier">
                        <i class="fas fa-truck me-1"></i> Supplier <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable text-end" data-sort="stok" title="Jumlah PCS">
                        <i class="fas fa-cubes me-1"></i> Stok <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable text-end" data-sort="harga_beli">
                        <i class="fas fa-money-bill-wave me-1"></i> Harga Beli <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable text-end" data-sort="harga_jual">
                        <i class="fas fa-cash-register me-1"></i> Harga Jual <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable" data-sort="timestamps">
                        <i class="fas fa-clock me-1"></i> Updated <i class="fas fa-sort sort-icon"></i>
                    </th>
                </tr>
            </thead>
            <tbody id="tableBody">
                {{-- Data produk diisi JS --}}
            </tbody>
        </table>
    </div>

    <!-- Modal Tambah Produk -->
    <div class="modal fade" id="baruProdukModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Tambah Produk Baru</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="formTambahProduk" class="add-produk-form w-100">
                        <div class="row g-3">
                            <div class="mb-3">
                                <label class="form-label">Nama Produk</label>
                                <input type="text" class="form-control" name="nama_produk" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Kategori</label>
                                <input type="text" class="form-control" name="kategori">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Supplier</label>
                                <input type="text" class="form-control" name="supplier">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Stok</label>
                                <input type="number" class="form-control" name="stok" value="0">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Satuan</label>
                                <input type="text" class="form-control" name="satuan">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Harga Beli</label>
                                <input type="text" class="form-control" name="harga_beli">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Harga Jual</label>
                                <input type="text" class="form-control" name="harga_jual">
                            </div>
                            <div class="mb-3">
                                <button type="button" id="btnSimpanProdukBaru" class="btn btn-primary w-100">
                                    Simpan Produk Baru
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="hapusProdukModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Hapus Produk</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="modalHapusProdukContent">
                    <!-- Konfirmasi hapus diisi JS -->
                </div>
            </div>
        </div>
    </div>
    <!-- MODAL ATUR PRODUK -->
    <div class="modal fade" id="aturProdukModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Atur Produk</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body d-flex" style="height: 70vh; overflow: hidden;">
                    <!-- Sidebar Menu -->
                    <div class="border-end pe-3" style="width:220px;">
                        <ul class="nav flex-column nav-pills" id="produkSidebarMenu">
                            <li class="nav-item mb-2">
                                <button class="nav-link w-100 btn-sidebar-modal d-flex align-items-center gap-2" id="sidebarEditProdukBtn" data-menu="edit">
                                    <i class="fas fa-edit sidebar-icon"></i>
                                    <span>Data Produk</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link w-100 btn-sidebar-modal d-flex align-items-center gap-2" id="sidebarSatuanBtn" data-menu="satuan">
                                    <i class="fas fa-balance-scale sidebar-icon"></i>
                                    <span>Satuan</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link w-100 btn-sidebar-modal d-flex align-items-center gap-2" id="sidebarBarcodeBtn" data-menu="barcode">
                                    <i class="fas fa-barcode sidebar-icon"></i>
                                    <span>Barcode</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link w-100 btn-sidebar-modal d-flex align-items-center gap-2" id="sidebarDiskonBtn" data-menu="diskon">
                                    <i class="fas fa-percent sidebar-icon"></i>
                                    <span>Diskon</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                    <!-- Konten Dinamis -->
                    <div class="flex-grow-1 ps-3" id="produkSidebarContent" style="overflow-y:auto;">
                        <!-- Konten dinamis dari JS -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="button" class="btn btn-primary" id="saveEditProdukBtn">Simpan Semua Perubahan</button>
                </div>
            </div>
        </div>
    </div>
</div>
@push('scripts')
    <script src="{{ asset('js/modules/produk.js') }}"></script>
@endpush
@endsection
