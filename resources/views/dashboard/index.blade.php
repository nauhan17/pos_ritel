{{-- filepath: resources/views/dashboard/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="container-fluid py-4">
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-box fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-5 fw-bold" id="totalProdukCountDashboard">0</div>
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
                        <div class="fs-5 fw-bold" id="totalStokCountDashboard">0</div>
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
                        <div class="fs-5 fw-bold" id="totalModalCountDashboard">0</div>
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
                        <div class="fs-5 fw-bold" id="nilaiTotalProdukCountDashboard">0</div>
                        <div class="text-muted">Total Nilai Produk</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-12">
            <h5 class="fw-bold mb-3">
                Data {{ \Carbon\Carbon::now()->translatedFormat('d F Y') }}
            </h5>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cash-register fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-5 fw-bold" id="totalPenjualanHariIni">0</div>
                        <div class="text-muted">Total Penjualan</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-boxes fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-5 fw-bold" id="totalProdukTerjual">0</div>
                        <div class="text-muted">Total Produk Terjual</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-coins fa-2x text-info"></i>
                    </div>
                    <div>
                        <div class="fs-5 fw-bold" id="keuntunganHariIni">0</div>
                        <div class="text-muted">Keuntungan</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-percentage fa-2x text-warning"></i>
                    </div>
                    <div>
                        <div class="fs-5 fw-bold" id="rataRataPenjualan">0</div>
                        <div class="text-muted">Rata-rata Penjualan</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Grafik Penjualan & Produk Hampir Habis -->
    <div class="row g-3 mb-4">
        <div class="col-lg-8">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                    <span>GRAFIK PENJUALAN</span>
                    <select id="penjualanRange" class="form-select form-select-sm w-auto">
                        <option value="minggu">Minggu</option>
                        <option value="bulan">Bulan</option>
                        <option value="tahun">Tahun</option>
                    </select>
                </div>
                <div class="card-body">
                    <canvas id="chartPenjualan" height="120"></canvas>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white fw-bold">
                    PRODUK HAMPIR HABIS
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm mb-0" id="tableProdukHampirHabis">
                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>Sisa Stok</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{-- Data diisi via JS --}}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script src="{{ asset('js/modules/dashboard.js') }}"></script>
@endpush
@endsection
