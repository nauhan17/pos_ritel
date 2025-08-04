@extends('layouts.app')

@section('title', 'Tracking Penjualan')

@section('content')
    <div class="container">
        <div class="row mt-4">
            <div class="row mb-3">
            <div class="col-md-3 mt-2">
                <input type="date" class="form-control" id="filterStartDate" placeholder="Tanggal Awal">
            </div>
            <div class="col-md-3 mt-2">
                <input type="date" class="form-control" id="filterEndDate" placeholder="Tanggal Akhir">
            </div>
            <div class="col-md-3 mt-2">
                <select class="form-select" id="filterAksi">
                    <option value="">Semua Tipe</option>
                </select>
            </div>
            <div class="col-md-3 mt-2">
                <input type="text" class="form-control" id="searchTrackingInput" placeholder="Cari No Transaksi / Pengguna / Keterangan">
            </div>
        </div>
        <div class="row mb-3">
            <div class="container">
                <div class="table-responsive">
                    <table class="table table-striped table-bordered table-hover align-middle rounded" id="trackingTable">
                        <thead class="table-light align-middle fw-semibold border-bottom">
                            <tr>
                                <th class="sortable" data-sort="created_at">
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-clock"></i>
                                        Waktu
                                        <i class="fas fa-sort sort-icon2 ms-1"></i>
                                    </span>
                                </th>
                                <th class="sortable" data-sort="tipe">
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-tag"></i>
                                        Tipe
                                        <i class="fas fa-sort sort-icon2 ms-1"></i>
                                    </span>
                                </th>
                                <th class="sortable" data-sort="pengguna">
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-user"></i>
                                        Pengguna
                                        <i class="fas fa-sort sort-icon2 ms-1"></i>
                                    </span>
                                </th>
                                <th class="sortable" data-sort="keterangan">
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-info-circle"></i>
                                        Deskripsi
                                        <i class="fas fa-sort sort-icon2 ms-1"></i>
                                    </span>
                                </th>
                                <th class="sortable" data-sort="aksi">
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-tasks"></i>
                                        Aksi
                                        <i class="fas fa-sort sort-icon2 ms-1"></i>
                                    </span>
                                </th>
                                <th>
                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="fas fa-flag"></i>
                                        Status
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody id="trackingTableBody">
                            {{-- Data tracking diisi JS --}}
                        </tbody>
                    </table>
                    <!-- Pagination Controls -->
                    <div class="d-flex justify-content-between align-items-center mt-3 mb-3">
                        <div>
                            <label class="me-2">Tampilkan</label>
                            <select id="trackingPageSize" class="form-select d-inline-block" style="width: 80px;">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span class="ms-2">data per halaman</span>
                        </div>
                        <nav>
                            <ul class="pagination mb-0" id="trackingPagination"></ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal fade" id="modalDetailTransaksi" tabindex="-1" aria-labelledby="modalDetailTransaksiLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="modalDetailTransaksiLabel">
                        <i class="fas fa-receipt me-2"></i>Detail Transaksi
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <div class="modal-body p-4" id="modalDetailTransaksiBody">
                    <!-- Konten detail transaksi akan diisi oleh JS -->
                </div>
                <div class="modal-footer bg-light gap-2" id="modalDetailTransaksiFooter">
                    <!-- Tombol aksi akan diisi oleh JS -->
                </div>
            </div>
        </div>
    </div>
    @push('scripts')
        <script src="{{ asset('js/modules/tracking.js') }}"></script>
    @endpush
@endsection
