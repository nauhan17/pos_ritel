<!-- Topbar -->
<nav class="navbar navbar-expand navbar-light navbar-partials topbar mb-4 static-top shadow">

    <!-- Sidebar Toggle (Topbar) -->
    <form class="form-inline">
        <button id="sidebarToggleTop" class="btn btn-link d-md-none rounded-circle me-3">
            <i class="fas fa-bars"></i>
        </button>
    </form>

    <div class="title-custom">
        @php
            $routeName = Request::route()->getName();
            $activeGroup = explode('.', $routeName)[0];
        @endphp
        <div class="navbar-submenu">
            @if ($activeGroup === 'produk')
                <div class="btn-group">
                    <a href="{{ route('produk.index') }}" class="btn btn-outline-secondary {{ $routeName == 'produk.index' ? 'active' : '' }}">Data Produk</a>
                </div>
            @elseif($activeGroup == 'penjualan')
                <a href="{{ route('penjualan.index') }}" class="btn btn-sm btn-outline-secondary {{ $routeName == 'penjualan.index' ? 'active' : '' }}">Transaksi</a>
            @endif
        </div>
    </div>

    <!-- Topbar Navbar -->
    <ul class="navbar-nav ms-auto pe-4">
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button"
                data-bs-toggle="dropdown" aria-expanded="false">
                <span class="me-2 d-none d-lg-inline text-gray-600 small">Lulusuvi</span>
                <img class="img-profile rounded-circle"
                    src="img/undraw_profile.svg">
            </a>
            <!-- Dropdown - User Information -->
            <div class="dropdown-menu dropdown-menu-end shadow animated--grow-in"
                aria-labelledby="userDropdown">
                <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#logoutModal">
                    <i class="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>
                    Logout
                </a>
            </div>
        </li>
    </ul>

</nav>
<!-- End of Topbar -->
