@extends('layouts.app')

@section('title', 'Data Produk')

@section('content')
    <div class="container">
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card bg-light">
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            <i class="fas fa-solid fa-folder stat-icon me-3"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="totalProdukCount">0</div>
                            <div class="stat-desc">Total Produk</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mt-4 mt-md-0">
                <div class="stat-card bg-light">
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            <i class="fas fa-solid fa-folder stat-icon me-3"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="totalStokCount">0</div>
                            <div class="stat-desc">Total Stok</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mt-4 mt-md-0">
                <div class="stat-card bg-light">
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            <i class="fas fa-solid fa-folder stat-icon me-3"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="totalModalCount">0</div>
                            <div class="stat-desc">Total Modal</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mt-4 mt-md-0">
                <div class="stat-card bg-light">
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            <i class="fas fa-solid fa-folder stat-icon me-3"></i>
                        </div>
                        <div>
                            <div class="stat-value" id="nilaiTotalProdukCount">0</div>
                            <div class="stat-desc">Nilai Total Produk</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col col-custom mt-4">
                <select class="form-select" id="supplierFilter" aria-label="Filter Supplier">
                    <option selected disabled>Supplier Produk</option>
                </select>
            </div>
            <div class="col col-custom mt-4">
                <select class="form-select" id="kategoriFilter" aria-label="Kategori Filter">
                    <option selected disabled>Kategori Produk</option>
                </select>
            </div>
            <div class="col col-custom mt-4">
                <select class="form-select" id="rakFilter" aria-label="Rak Filter">
                    <option selected disabled>Rak Produk</option>
                </select>
            </div>
            <div class="col col-custom mt-4">
                <select class="form-select" aria-label="Default select example">
                    <option selected disabled>Satuan</option>
                    <option value="1">PCS</option>
                </select>
            </div>
            <div class="col col-custom mt-4 d-flex justify-content-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-success" data-bs-toggle="tooltip" title="Export to Excel">
                        <i class="fas fa-file-excel"></i>
                    </button>

                    <button class="btn btn-danger" data-bs-toggle="tooltip" title="Export to PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="container mt-4">
                <div class="btn-group">
                    <button id="addRowBtn" class="btn btn-custom hover-primary">
                        Baru
                    </button>
                    <button id="editToggleBtn" class="btn btn-custom hover-secondary">
                        Edit
                    </button>
                    <button id="diskonBtn" class="btn btn-custom hover-secondary">
                        Diskon
                    </button>
                    <button id="" class="btn btn-custom hover-secondary">
                        Restok
                    </button>
                    <button id="" class="btn btn-custom hover-secondary">
                        Retur
                    </button>
                    <button id="deleteBtn" class="btn btn-custom hover-danger">
                        Hapus
                    </button>
                </div>
                <table class="table table-striped table-hover" id="sortableTable">
                    <thead>
                        <tr>
                            {{-- <th width="40px">
                                <input type="checkbox" id="selectAll">
                            </th> --}}
                            <th>pilih</th>
                            <th class="sortable" data-sort="nama_produk">Nama Produk<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="barcode">Barcode<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="stok" data-bs-toggle="tooltip" title="Jumlah PCS">Stok<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="harga_beli">Harga Beli<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="harga_jual">Harga Jual<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="diskon">Diskon<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="kadaluwarsa">Kadaluwarsa<i class="fas fa-sort sort-icon"></i></th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        <!-- Data akan diisi oleh JavaScript -->
                    </tbody>
                </table>
            </div>


        </div>
    </div>

    <!-- Modal untuk Tambah Data -->
    <div class="modal fade" id="addModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Baru</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="addForm" class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Nama Produk</label>
                                <input type="text" class="form-control" name="nama_produk" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Supplier</label>
                                <input type="text" class="form-control" name="supplier">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Rak</label>
                                <input type="text" class="form-control" name="rak">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Harga Beli</label>
                                <input type="number" class="form-control" name="harga_beli">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Diskon</label>
                                <input type="number" class="form-control" name="diskon">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Kategori</label>
                                <input type="text" class="form-control" name="kategori">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Barcode</label>
                                <input type="text" class="form-control" name="barcode">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Stok</label>
                                <input type="number" class="form-control" name="stok">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Harga Jual</label>
                                <input type="number" class="form-control" name="harga_jual">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Kadaluwarsa</label>
                                <input type="date" class="form-control" name="kadaluwarsa">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="button" class="btn btn-primary" id="saveNewBtn">Simpan</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal untuk Tambah Diskon -->
    <div class="modal fade" id="diskonModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Tambah Diskon Produk</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="diskonForm">
                        <input type="hidden" id="produk_id_diskon" name="produk_id">
                        <div class="mb-3">
                            <label class="form-label">Jumlah Minimum</label>
                            <input type="number" class="form-control" name="jumlah_minimum" required min="1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Diskon (%)</label>
                            <input type="number" class="form-control" name="diskon" required min="0" max="100" step="0.01">
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="is_tanpa_waktu" name="is_tanpa_waktu">
                            <label class="form-check-label" for="is_tanpa_waktu">Diskon Tanpa Batas Waktu</label>
                        </div>
                        <div id="waktuDiskonContainer">
                            <div class="mb-3">
                                <label class="form-label">Tanggal Mulai</label>
                                <input type="date" class="form-control" name="tanggal_mulai" id="tanggal_mulai">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Tanggal Berakhir</label>
                                <input type="date" class="form-control" name="tanggal_berakhir" id="tanggal_berakhir">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="button" class="btn btn-primary" id="saveDiskonBtn">Simpan Diskon</button>
                </div>
            </div>
        </div>
    </div>
@endsection
