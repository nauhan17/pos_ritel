<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'POS Ritel')</title>

    @stack('styles')

    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <link rel="icon" type="image/png" href="{{ asset('img/favicon.png') }}">
    <link rel="shortcut icon" href="{{ asset('img/favicon.ico') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('img/favicon.png') }}">

    <script>try{if(localStorage.getItem('sidebar-mini')==='1'){document.documentElement.classList.add('sidebar-mini');document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('sidebar-mini'))}}catch{};</script>
</head>

<body data-page="{{ $page ?? request()->segment(1) ?: 'dashboard' }}">
    <div class="container-content d-flex">
        @include('partials.sidebar')
        <div class="main-content flex-grow-1">
            <div class="container-fluid py-2">
                @yield('content')
            </div>
        </div>
    </div>

</body>

</html>
