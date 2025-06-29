{{-- <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" rel="stylesheet"> --}}
<div class="">
    <nav class="sidebar d-flex flex-column flex-shrink-0 position-fixed">
        <div class="p-4 d-flex justify-content-center align-items-center">
            <img class="img-logo" src="img/logo.png" alt="">
        </div>
        <div class="nav flex-column">
            <a href="{{  route('dashboard.index') }}" class="sidebar-link {{ request()->routeIs('dashboard.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-tachometer-alt me-1"></i>
                <span class="px-2">Dashboard</span>
            </a>
            <a href="{{ route('produk.index') }}" class="sidebar-link {{ request()->routeIs('produk.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-box-open me-1"></i>
                <span class="px-2">Data Produk</span>
            </a>
            <a href="{{  route('kasir.index') }}" class="sidebar-link {{ request()->routeIs('kasir.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-calculator me-1"></i>
                <span class="px-2">Kasir</span>
            </a>
            <a href="{{  route('penjualan.index') }}" class="sidebar-link {{ request()->routeIs('penjualan.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-chart-line me-1"></i>
                <span class="px-2">Tracking Penjualan</span>
            </a>
            <a href="{{  route('aktivitas.index') }}" class="sidebar-link {{ request()->routeIs('aktivitas.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-history me-1"></i>
                <span class="px-2">Aktivitas</span>
            </a>
            <a href="{{  route('pengguna.index') }}" class="sidebar-link {{ request()->routeIs('pengguna.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-users me-1"></i>
                <span class="px-2">Data Pengguna</span>
            </a>
        </div>
    </nav>

</div>
