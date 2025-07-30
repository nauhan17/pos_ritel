{{-- filepath: resources/views/login/index.blade.php --}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Login | POS Ritel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
</head>
<body>
<div class="container">
    <div class="row min-vh-100 justify-content-center align-items-center">
        <div class="col-md-5 col-lg-4">
            <div class="card shadow border-0">
                <div class="card-header bg-white text-center fw-bold fs-4">
                    <i class="fas fa-store text-primary me-2"></i>POS Ritel Login
                </div>
                <div class="card-body">
                    <div id="loginError"></div>
                    <form id="loginForm" autocomplete="off">
                        <div class="mb-3">
                            <label class="form-label">Nama</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user"></i></span>
                                <input type="text" name="nama" class="form-control" required autofocus>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                <input type="password" name="password" class="form-control" required autocomplete="current-password">
                            </div>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" name="remember" class="form-check-input" id="rememberMe">
                            <label class="form-check-label" for="rememberMe">Ingat Saya</label>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                    </form>
                </div>
                <div class="card-footer bg-white text-center">
                    <small class="text-muted">Belum punya akun? Hubungi supervisor Anda.</small>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="aksesContainer" class="container mt-4" style="display:none;">
    <div class="row justify-content-center">
        <div class="col-md-5">
            <div class="card border-0 shadow rounded">
                <div class="card-header bg-white fw-bold">
                    <i class="fas fa-user-shield me-2 text-primary"></i>Hak Akses Anda
                </div>
                <div class="card-body" id="aksesBody">
                    <!-- Data pengguna dan hak akses akan diisi JS -->
                </div>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="{{ asset('js/modules/login.js') }}"></script>
