{{-- filepath: resources/views/dashboard/index.blade.php --}}
@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="container-fluid py-4">
    <div class="row g-3 mb-4">
        <!-- Insight Cards -->
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-box fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalProdukCountDashboard">0</div>
                        <div class="text-muted">Total Produk</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cubes fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalStokCountDashboard">0</div>
                        <div class="text-muted">Total Stok</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-money-bill-wave fa-2x text-warning"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalModalCountDashboard">0</div>
                        <div class="text-muted">Total Modal</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-chart-line fa-2x text-info"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="nilaiTotalProdukCountDashboard">0</div>
                        <div class="text-muted">Nilai Produk</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-cash-register fa-2x text-success"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="penjualanHariIniCount">0</div>
                        <div class="text-muted">Penjualan Hari Ini</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-truck fa-2x text-secondary"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalSupplierCount">0</div>
                        <div class="text-muted">Supplier Aktif</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Grafik Penjualan & Stok -->
    <div class="row g-3 mb-4">
        <div class="col-lg-8">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white fw-bold">
                    Grafik Penjualan Mingguan
                </div>
                <div class="card-body">
                    <canvas id="chartPenjualanMingguan" height="120"></canvas>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white fw-bold">
                    Produk Hampir Habis
                </div>
                <div class="card-body">
                    <canvas id="chartProdukHampirHabis" height="120"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Insight Transaksi -->
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-receipt fa-2x text-primary"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalTransaksiCount">0</div>
                        <div class="text-muted">Total Transaksi</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="produkHampirHabisCount">0</div>
                        <div class="text-muted">Produk Hampir Habis</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-user fa-2x text-info"></i>
                    </div>
                    <div>
                        <div class="fs-4 fw-bold" id="totalUserCount">0</div>
                        <div class="text-muted">Pengguna Aktif</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Chart.js CDN -->
@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
    // Dummy data, ganti dengan data dari backend
    const penjualanLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const penjualanData = [12, 19, 3, 5, 2, 3, 7];
    const produkHampirHabisLabels = ['Beras', 'Gula', 'Minyak', 'Tepung'];
    const produkHampirHabisData = [2, 5, 1, 3];

    // Grafik Penjualan Mingguan
    new Chart(document.getElementById('chartPenjualanMingguan'), {
        type: 'bar',
        data: {
            labels: penjualanLabels,
            datasets: [{
                label: 'Penjualan',
                data: penjualanData,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Grafik Produk Hampir Habis
    new Chart(document.getElementById('chartProdukHampirHabis'), {
        type: 'doughnut',
        data: {
            labels: produkHampirHabisLabels,
            datasets: [{
                label: 'Stok Hampir Habis',
                data: produkHampirHabisData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
});
</script>
@endpush
@endsection
