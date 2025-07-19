<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <!-- CSS -->
    <link href="{{ asset('vendor/fontawesome-free/css/all.min.css') }}" rel="stylesheet">
    {{-- <link href="{{ asset('css/sb-admin-2.min.css') }}" rel="stylesheet"> --}}
    <link href="{{ asset('css/style.css') }}" rel="stylesheet">
    <link href="{{ asset('css/bootstrap.min.css') }}" rel="stylesheet">
    <title>@yield('title')</title>
</head>
<body>
    <div class="container-content">
        @include('partials.sidebar')
        @include('partials.navbar')
        <div class="main-content">
            @yield('content')
        </div>
    </div>

    <!-- Letakkan modal di luar container utama -->
    @yield('modals')

    <div id="alert-container" style="position: fixed; top: 20px; right: 20px; z-index: 9999; width: 300px;"></div>

    <!-- JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="{{ asset('vendor/jquery/jquery.min.js') }}"></script>
    <script src="{{ asset('vendor/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('vendor/jquery-easing/jquery.easing.min.js') }}"></script>
    <script src="{{ asset('js/sb-admin-2.min.js') }}"></script>

    @stack('scripts')

    {{-- <script src="{{ asset('js/modules/produk.js') }}"></script>
    <script src="{{ asset('js/modules/tracking.js') }}"></script> --}}
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</body>
</html>
