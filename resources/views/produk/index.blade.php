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
                        <div class="fs-5 fw-bold" id="totalProdukCount">0</div>
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
                        <div class="fs-5 fw-bold" id="totalStokCount">0</div>
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
                        <!-- SIZE fs-4 untuk konsistensi, nilai penuh tanpa singkatan -->
                        <div class="fs-5 fw-bold" id="totalModalCount">Rp 0</div>
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
                        <!-- SIZE fs-4 untuk konsistensi, nilai penuh tanpa singkatan -->
                        <div class="fs-5 fw-bold" id="nilaiTotalProdukCount">Rp 0</div>
                        <div class="text-muted">Nilai Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- FILTER & AKSI -->
    <div class="row align-items-center mb-3">
        <div class="col-md-6">
            <select class="form-select" id="kategoriFilter" aria-label="Kategori Produk">
                <option selected disabled>Kategori Produk</option>
            </select>
        </div>
        <div class="col-md-6">
            <select class="form-select" id="supplierFilter" aria-label="Supplier">
                <option selected disabled>Supplier</option>
            </select>
        </div>
    </div>
    <div class="row g-3 mb-1">
        <div class="col-md-4 d-flex align-items-center gap-2">
            <button id="editTableBtn" class="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
                style="width: 40px; height: 40px;" data-bs-toggle="modal" data-bs-target="#editTableModal" title="Edit Mode">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <div class="btn-group ms-2">
                <button id="baruProdukBtn" class="btn btn-primary" style="width: 120px;" data-bs-toggle="modal" data-bs-target="#baruProdukModal">
                    <span class="d-flex align-items-center justify-content-center gap-2">
                        <i class="fas fa-plus"></i>
                        <span>Baru</span>
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
                <button class="btn btn-success" id="exportExcelBtn" data-bs-toggle="tooltip" title="Export ke Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
                <button class="btn btn-danger" id="exportPdfBtn" data-bs-toggle="tooltip" title="Export ke PDF">
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
                    <th class="sortable" data-sort="satuan">
                        <i class="fas fa-truck me-1"></i> Satuan <i class="fas fa-sort sort-icon"></i>
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
        <!-- Pagination Controls -->
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="d-flex align-items-center gap-3">
                <div>
                    <label class="me-2">Tampilkan</label>
                    <select id="produkPageSize" class="form-select d-inline-block" style="width: 80px;">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span class="ms-2">data per halaman</span>
                </div>
                <div class="text-muted">
                    <small id="paginationInfo">Menampilkan 0-0 dari 0 data</small>
                </div>
            </div>
            <nav>
                <ul class="pagination mb-0" id="produkPagination"></ul>
            </nav>
        </div>
    </div>

    <div class="modal fade" id="baruProdukModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-plus-circle me-2"></i>
                        Tambah Produk Baru
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body p-0">
                    <!-- Tab Navigation -->
                    <div class="bg-light border-bottom">
                        <ul class="nav nav-tabs border-0 px-3" id="tambahProdukTabs">
                            <li class="nav-item">
                                <button class="nav-link active" id="step1-tab" data-bs-toggle="tab"
                                        data-bs-target="#step1" data-step="1">
                                    <i class="fas fa-info-circle me-2"></i>Data Dasar
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" id="step2-tab" data-bs-toggle="tab"
                                        data-bs-target="#step2" data-step="2">
                                    <i class="fas fa-balance-scale me-2"></i>Satuan
                                    <span class="badge bg-secondary ms-1" style="display: none;">0</span>
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" id="step3-tab" data-bs-toggle="tab"
                                        data-bs-target="#step3" data-step="3">
                                    <i class="fas fa-barcode me-2"></i>Barcode
                                    <span class="badge bg-secondary ms-1" style="display: none;">0</span>
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" id="step4-tab" data-bs-toggle="tab"
                                        data-bs-target="#step4" data-step="4">
                                    <i class="fas fa-percent me-2"></i>Diskon
                                    <span class="badge bg-secondary ms-1" style="display: none;">0</span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <!-- Tab Content -->
                    <div class="p-4">
                        <form id="formTambahProduk" class="add-produk-form">
                            <div class="tab-content" id="tambahProdukTabContent">

                                <!-- STEP 1: DATA DASAR -->
                                <div class="tab-pane fade show active" id="step1">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Nama Produk <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" name="nama_produk"
                                                    placeholder="Masukkan nama produk" autocomplete="off" required>
                                            </div>

                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Kategori</label>
                                                <input type="text" class="form-control" name="kategori"
                                                    placeholder="Masukkan kategori" autocomplete="off">
                                            </div>

                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Supplier</label>
                                                <input type="text" class="form-control" name="supplier"
                                                    placeholder="Masukkan nama supplier" autocomplete="off">
                                            </div>
                                        </div>

                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Satuan <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" name="satuan"
                                                    placeholder="pcs, kg, liter, dll" autocomplete="off" required>
                                            </div>

                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Stok Awal</label>
                                                <input type="number" class="form-control" name="stok"
                                                    placeholder="0" min="0" autocomplete="off">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Harga Beli</label>
                                                <input type="text" class="form-control currency-input" name="harga_beli"
                                                    placeholder="0" autocomplete="off">
                                            </div>
                                        </div>

                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Harga Jual</label>
                                                <input type="text" class="form-control currency-input" name="harga_jual"
                                                    placeholder="0" autocomplete="off">
                                            </div>
                                        </div>

                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label fw-bold">Margin</label>
                                                <div class="form-control bg-light" id="marginPreview">0%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- STEP 2: KONVERSI SATUAN -->
                                <div class="tab-pane fade" id="step2">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="fas fa-balance-scale me-2"></i>Konversi Satuan</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row align-items-end">
                                                <div class="col-md-3">
                                                    <label class="form-label">Jumlah</label>
                                                    <input type="number" class="form-control" id="newJumlahSatuan"
                                                        placeholder="1" min="1" step="0.01">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">Satuan Besar</label>
                                                    <input type="text" class="form-control" id="newSatuanBesar"
                                                        placeholder="kardus, pak, dll">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">= <span id="konversiUnit">pcs</span></label>
                                                    <input type="number" class="form-control" id="newKonversiSatuan"
                                                        placeholder="12" min="1" step="0.01">
                                                </div>
                                                <div class="col-md-3">
                                                    <button type="button" class="btn btn-primary" onclick="tambahKonversiSatuan()">
                                                        <i class="fas fa-plus"></i> Tambah
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-3">
                                        <h6>Daftar Konversi Satuan <span class="badge bg-primary" id="satuanCount">0</span></h6>
                                        <div id="konversiSatuanList">
                                            <!-- List konversi akan dirender di sini -->
                                        </div>
                                    </div>
                                </div>

                                <!-- STEP 3: BARCODE -->
                                <div class="tab-pane fade" id="step3">
                                    <div class="row">
                                        <div class="col-md-8">
                                            <div class="card">
                                                <div class="card-header">
                                                    <h6 class="mb-0"><i class="fas fa-barcode me-2"></i>Input Barcode</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="row align-items-end">
                                                        <div class="col-md-6">
                                                            <label class="form-label">Kode Barcode</label>
                                                            <input type="text" class="form-control" id="newBarcodeInput"
                                                                placeholder="Scan atau ketik barcode">
                                                        </div>
                                                        <div class="col-md-3">
                                                            <div class="form-check">
                                                                <input class="form-check-input" type="checkbox" id="newBarcodeUtama">
                                                                <label class="form-check-label" for="newBarcodeUtama">
                                                                    Barcode Utama
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <div class="col-md-3">
                                                            <button type="button" class="btn btn-primary me-2" onclick="tambahBarcodeBaru()">
                                                                <i class="fas fa-plus"></i> Tambah
                                                            </button>
                                                            <button type="button" class="btn btn-outline-secondary" onclick="generateRandomBarcode()">
                                                                <i class="fas fa-random"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="mt-3">
                                                <h6>Daftar Barcode <span class="badge bg-primary" id="barcodeCount">0</span></h6>
                                                <div id="barcodeListContainer">
                                                    <!-- List barcode akan dirender di sini -->
                                                </div>
                                            </div>
                                        </div>

                                        <div class="col-md-4">
                                            <div class="card">
                                                <div class="card-header">
                                                    <h6 class="mb-0"><i class="fas fa-eye me-2"></i>Preview Barcode</h6>
                                                </div>
                                                <div class="card-body text-center">
                                                    <div id="barcodePreviewContainer">
                                                        <span class="text-muted">Preview akan muncul di sini</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- STEP 4: DISKON -->
                                <div class="tab-pane fade" id="step4">
                                    <div class="card">
                                        <div class="card-header">
                                            <h6 class="mb-0"><i class="fas fa-percent me-2"></i>Atur Diskon</h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <label class="form-label">Minimum <span id="diskonUnit">pcs</span></label>
                                                    <input type="number" class="form-control" id="newDiskonMinimum"
                                                        placeholder="1" min="1">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">Diskon (%)</label>
                                                    <input type="number" class="form-control" id="newDiskonPersen"
                                                        placeholder="10" min="0.01" max="100" step="0.01">
                                                </div>
                                                <div class="col-md-6">
                                                    <div class="form-check mb-2">
                                                        <input class="form-check-input" type="checkbox" id="diskonTanpaWaktu" checked>
                                                        <label class="form-check-label" for="diskonTanpaWaktu">
                                                            Diskon Permanen (Tanpa Batas Waktu)
                                                        </label>
                                                    </div>

                                                    <div id="waktuDiskonContainer" style="display: none;">
                                                        <div class="row">
                                                            <div class="col-md-6">
                                                                <label class="form-label small">Tanggal Mulai</label>
                                                                <input type="date" class="form-control form-control-sm" id="diskonMulai">
                                                            </div>
                                                            <div class="col-md-6">
                                                                <label class="form-label small">Tanggal Berakhir</label>
                                                                <input type="date" class="form-control form-control-sm" id="diskonBerakhir">
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="text-end mt-3">
                                                <button type="button" class="btn btn-primary" onclick="tambahDiskonBaru()">
                                                    <i class="fas fa-plus"></i> Tambah Diskon
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-3">
                                        <h6>Daftar Diskon <span class="badge bg-primary" id="diskonCount">0</span></h6>
                                        <div id="diskonListContainer">
                                            <!-- List diskon akan dirender di sini -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="modal-footer bg-light">
                    <div class="d-flex justify-content-between w-100">
                        <div></div> <!-- Empty div untuk spacing -->

                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Batal
                            </button>
                            <button type="button" class="btn btn-success" id="saveProductBtn">
                                <i class="fas fa-save me-2"></i>Simpan Produk
                            </button>
                        </div>
                    </div>
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
</div>
@push('scripts')
    <script src="{{ asset('js/modules/produk.js') }}"></script>
@endpush
@endsection
