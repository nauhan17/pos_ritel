@extends('layouts.app')

@section('title', 'Tracking Penjualan')

@section('content')
    <div class="container">
        <div class="row mb-3">
            <div class="col-md-3 mt-2">
                <input type="date" class="form-control" id="filterStartDate" placeholder="Tanggal Awal">
            </div>
            <div class="col-md-3 mt-2">
                <input type="date" class="form-control" id="filterEndDate" placeholder="Tanggal Akhir">
            </div>
            <div class="col-md-3 mt-2">
                <select class="form-select" id="filterAksi">
                    <option value="">Semua Aksi</option>
                    {{-- Opsi aksi akan diisi dinamis dari JS --}}
                </select>
            </div>
        </div>
        <div class="row mb-3">
            <div class="container mt-4">
                <div class="table-responsive">
                    <table class="table table-striped table-bordered table-hover align-middle rounded" id="trackingTable">
                        <thead class="table-light align-middle fw-semibold border-bottom">
                            <tr>
                                <th class="sortable" data-sort="produk">
                                    <i class="fas fa-box me-1"></i> Produk <i class="fas fa-sort sort-icon2"></i>
                                </th>
                                <th class="sortable" data-sort="aksi">
                                    <i class="fas fa-tasks me-1"></i> Aksi <i class="fas fa-sort sort-icon2"></i>
                                </th>
                                <th class="sortable" data-sort="keterangan">
                                    <i class="fas fa-info-circle me-1"></i> Keterangan <i class="fas fa-sort sort-icon2"></i>
                                </th>
                                <th class="sortable" data-sort="pengguna">
                                    <i class="fas fa-user me-1"></i> Pengguna <i class="fas fa-sort sort-icon2"></i>
                                </th>
                                <th class="sortable" data-sort="created_at">
                                    <i class="fas fa-clock me-1"></i> Waktu <i class="fas fa-sort sort-icon2"></i>
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
    @push('scripts')
        <script src="{{ asset('js/modules/tracking.js') }}"></script>
    @endpush
@endsection
