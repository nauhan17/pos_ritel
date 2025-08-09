{{-- filepath: resources/views/partials/sidebar.blade.php --}}
<div class="">
    <nav class="sidebar d-flex flex-column flex-shrink-0 position-fixed" id="mainSidebar">
        <div class="p-4 d-flex justify-content-center align-items-center position-relative">
            <img class="img-logo" src="img/logo.png" alt="">
            <button id="sidebarToggle" class="btn btn-sm btn-toggle-collapse position-absolute end-0 top-0 mt-2 me-2"
                title="Kecilkan Sidebar">
                <i class="fas fa-angle-double-left"></i>
            </button>
        </div>
        <div class="nav flex-column">
            <a href="{{ route('dashboard.index') }}"
                class="sidebar-link {{ request()->routeIs('dashboard.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-tachometer-alt me-1"></i>
                <span class="px-2">Dashboard</span>
            </a>
            <a href="{{ route('produk.index') }}"
                class="sidebar-link {{ request()->routeIs('produk.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-box-open me-1"></i>
                <span class="px-2">Master Data</span>
            </a>
            <a href="{{ route('kasir.index') }}"
                class="sidebar-link {{ request()->routeIs('kasir.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-receipt me-1"></i>
                <span class="px-2">Kasir</span>
            </a>
            <a href="{{ route('tracking.index') }}"
                class="sidebar-link {{ request()->routeIs('tracking.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-chart-line me-1"></i>
                <span class="px-2">Tracking</span>
            </a>
            <a href="{{ route('pengguna.index') }}"
                class="sidebar-link {{ request()->routeIs('pengguna.index') ? 'active' : '' }} text-decoration-none p-3">
                <i class="fas fa-users me-1"></i>
                <span class="px-2">Daftar Pengguna</span>
            </a>

            <div class="dropdown w-100">
                <a href="#"
                    class="sidebar-link text-decoration-none p-3 dropdown-toggle d-flex align-items-center"
                    id="sidebarUserDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-user-circle me-1"></i>
                    <span class="px-2">{{ session('pengguna.nama') ?? 'User' }}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow" aria-labelledby="sidebarUserDropdown">
                    <li>
                        <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#logoutModal">
                            <i class="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>
                            Logout
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</div>
<!-- Modal Logout -->
<div class="modal fade" id="logoutModal" tabindex="-1" aria-labelledby="logoutModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="logoutModalLabel">Konfirmasi Logout</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                Anda yakin ingin logout?
            </div>
            <div class="modal-footer">
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="btn btn-danger">Logout</button>
                </form>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            </div>
        </div>
    </div>
</div>
@push('scripts')
<script src="{{ asset('js/modules/sidebar.js') }}"></script>
@endpush
