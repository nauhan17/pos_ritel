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
                <select class="form-select" id="kategoriFilter" aria-label="Kategori Filter">
                    <option selected disabled>Kategori Produk</option>
                </select>
            </div>
            <div class="col col-custom mt-4">
                <select class="form-select" id="supplierFilter" aria-label="Supplier Filter">
                    <option selected disabled>Supplier</option>
                </select>
            </div>
            <div class="col col-custom mt-4">
                <select class="form-select" id="satuanFilter" aria-label="Satuan Filter">
                    <option value="">Semua Satuan</option>
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
                <div class="btn-group me-3">
                    <button id="editToggleBtn" class="btn rounded-circle ms-2 btn-editable p-0"
                        data-bs-toggle="tooltip" title="Edit Table Mode">
                        <i class="fas fa-pen" style="font-size:14px;"></i>
                    </button>
                </div>
                <div class="btn-group">
                    <button id="editProdukBtn" class="btn btn-custom hover-secondary">
                        Atur
                    </button>
                    {{-- <button id="satuanBtn" class="btn btn-custom hover-secondary">
                        Satuan
                    </button>
                    <button id="barcodeBtn" class="btn btn-custom hover-secondary">
                        Barcode
                    </button>
                    <button id="restokBtn" class="btn btn-custom hover-secondary">
                        Restok
                    </button>
                    <button id="diskonBtn" class="btn btn-custom hover-secondary">
                        Diskon
                    </button>
                    <button id="deleteBtn" class="btn btn-custom hover-danger">
                        Hapus
                    </button> --}}
                </div>
                <!-- Tambahkan di atas tabel -->
                <div id="editModeBanner" class="alert alert-info py-2 mb-2 mt-2 d-none">
                    <i class="fas fa-edit"></i> Edit Mode Aktif — Klik sel untuk mengubah data.
                    <button class="btn btn-sm btn-outline-danger float-end" id="exitEditModeBtn">Keluar Edit Mode</button>
                </div>

                <table class="table table-striped table-hover" id="sortableTable">
                    <thead>
                        <tr>
                            <th width="40px">
                                <input type="checkbox" id="selectAll">
                            </th>
                            <th class="sortable" data-sort="nama_produk">Nama Produk<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="kategori">Kategori<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="supplier">Supplier<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="stok" data-bs-toggle="tooltip" title="Jumlah PCS">Stok<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="harga_beli">Harga Beli<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="harga_jual">Harga Jual<i class="fas fa-sort sort-icon"></i></th>
                            <th class="sortable" data-sort="timestamps">Updated<i class="fas fa-sort sort-icon"></i></th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        {{--  --}}
                    </tbody>
                </table>
            </div>


        </div>
    </div>
    <div class="modal fade" id="editProdukModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Atur Produk</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body d-flex" style="height: 70vh; overflow: hidden;">
                    <!-- Sidebar -->
                    <div class="border-end pe-3" style="width:200px;">
                        <ul class="nav flex-column nav-pills" id="produkSidebarMenu">
                            <li class="nav-item mb-2">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-dark" id="sidebarAddProdukBtn" data-menu="add">
                                    <span class="sidebar-icon"><i class="fas fa-plus"></i></span>
                                    <span class="sidebar-label">Produk Baru</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-dark" id="sidebarEditProdukBtn" data-menu="edit">
                                    <span class="sidebar-icon"><i class="fas fa-edit"></i></span>
                                    <span class="sidebar-label">Edit Produk</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-dark" id="sidebarSatuanBtn" data-menu="satuan">
                                    <span class="sidebar-icon"><i class="fas fa-balance-scale"></i></span>
                                    <span class="sidebar-label">Satuan</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-dark" id="sidebarBarcodeBtn" data-menu="barcode">
                                    <span class="sidebar-icon"><i class="fas fa-barcode"></i></span>
                                    <span class="sidebar-label">Barcode</span>
                                </button>
                            </li>
                            <li class="nav-item mb-2">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-dark" id="sidebarDiskonBtn" data-menu="diskon">
                                    <span class="sidebar-icon"><i class="fas fa-percent"></i></span>
                                    <span class="sidebar-label">Diskon</span>
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link btn-sidebar-modal d-flex align-items-center gap-2 text-danger" id="sidebarDeleteBtn" data-menu="delete">
                                    <span class="sidebar-icon"><i class="fas fa-trash"></i></span>
                                    <span class="sidebar-label">Hapus</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                    <!-- Content -->
                    <div class="flex-grow-1 ps-3" id="produkSidebarContent" style="flex:1; overflow-y:auto;">
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
@endsection
