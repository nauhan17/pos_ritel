<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'POS Ritel')</title>

    <!-- CSS -->
    <link href="{{ asset('vendor/fontawesome-free/css/all.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/bootstrap.min.css') }}" rel="stylesheet">
    <link href="{{ asset('css/style.css') }}" rel="stylesheet">

    @stack('styles')
</head>

<body>
    <div class="container-content d-flex">
        @include('partials.sidebar')
        <div class="main-content flex-grow-1">
            <div class="container-fluid py-2">
                @yield('content')
            </div>
        </div>
    </div>

    <!-- Modals -->
    @yield('modals')

    <!-- Alert Container -->
    <div id="alert-container" style="position: fixed; top: 20px; right: 20px; z-index: 9999; width: 300px;"></div>

    <script>
        window.currentUserName = @json(Auth::user()->nama ?? 'Guest');
    </script>
    <!-- Core JS Libraries -->
    <script src="{{ asset('vendor/jquery/jquery.min.js') }}"></script>
    <script src="{{ asset('vendor/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('vendor/jquery-easing/jquery.easing.min.js') }}"></script>
    <script src="{{ asset('js/sb-admin-2.min.js') }}"></script>

    <!-- Utility Libraries -->
    <script src="{{ asset('vendor/chart.js/Chart.js') }}"></script>
    <script src="{{ asset('vendor/libs/sweetalert2.js') }}"></script>
    <script src="{{ asset('vendor/libs/JsBarcode.all.min.js') }}"></script>

    <!-- Export Libraries -->
    <script src="{{ asset('vendor/libs/xlsx.full.min.js') }}"></script>
    <script src="{{ asset('vendor/libs/jspdf.umd.min.js') }}"></script>
    <script src="{{ asset('vendor/libs/jspdf.plugin.autotable.min.js') }}"></script>

    @stack('scripts')
</body>

</html>
