@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="container-fluid py-4">
    <div class="row g-3 mb-4">
        <!-- Total Produk -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-box fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalProdukCountDashboard">0</div>
                        <div class="text-muted">Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Total Stok -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cubes fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalStokCountDashboard">0</div>
                        <div class="text-muted">Total Stok</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Total Modal -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-money-bill-wave fa-2x text-warning"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalModalCountDashboard">0</div>
                        <div class="text-muted">Total Modal</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Nilai Total Produk -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-chart-line fa-2x text-info"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="nilaiTotalProdukCountDashboard">0</div>
                        <div class="text-muted">Nilai Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Tambahan: Total Penjualan Hari Ini -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cash-register fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="penjualanHariIniCount">0</div>
                        <div class="text-muted">Penjualan Hari Ini</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Tambahan: Total Transaksi -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-receipt fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalTransaksiCount">0</div>
                        <div class="text-muted">Total Transaksi</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Tambahan: Produk Hampir Habis -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="produkHampirHabisCount">0</div>
                        <div class="text-muted">Produk Hampir Habis</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Tambahan: Supplier Aktif -->
        <div class="col-md-3">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-truck fa-2x text-secondary"></i>
                    </div>
                    <div>
                        <div class="fs-3 fw-bold" id="totalSupplierCount">0</div>
                        <div class="text-muted">Supplier Aktif</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
