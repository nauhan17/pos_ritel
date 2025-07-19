@extends('layouts.app')

@section('title', 'Kasir')

@section('content')
<div class="container py-4">
    <div class="row mb-4 align-items-center">
        <div class="col-md-8">
            <div class="input-group input-group-lg shadow-sm">
                <span class="input-group-text bg-white"><i class="fas fa-barcode"></i></span>
                <input type="text" class="form-control" id="barcodeInput" placeholder="Scan barcode atau cari produk..." autofocus>
                <button class="btn btn-primary" id="searchBtn"><i class="fas fa-search"></i></button>
            </div>
        </div>
        <div class="col-md-4 text-end">
            <h4 class="mb-0 fw-bold">Kasir</h4>
            <div id="jamKasir" class="text-muted small"></div>
        </div>
    </div>
    <div class="row">
        <!-- Daftar Belanja -->
        <div class="col-md-8 mb-3">
            <div class="card shadow-sm rounded-4">
                <div class="card-header bg-light rounded-top-4">
                    <strong>Daftar Belanja</strong>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-light border-bottom fw-semibold">
                                <tr>
                                    <th>Produk</th>
                                    <th class="text-end">Harga</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-end">Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {{-- Data keranjang akan diisi JS --}}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <!-- Ringkasan & Pembayaran -->
        <div class="col-md-4">
            <div class="card shadow-sm rounded-4 mb-3">
                <div class="card-body">
                    <h5 class="mb-3">Total Belanja</h5>
                    <h2 class="fw-bold text-success mb-3" id="totalBelanja">Rp0</h2>
                    <hr>
                    <div class="mb-3">
                        <label for="bayarInput" class="form-label">Bayar</label>
                        <input type="number" class="form-control form-control-lg" id="bayarInput" placeholder="Masukkan nominal pembayaran">
                    </div>
                    <div class="mb-3">
                        <label for="kembalian" class="form-label">Kembalian</label>
                        <input type="text" class="form-control form-control-lg" id="kembalian" readonly>
                    </div>
                    <button class="btn btn-success w-100 btn-lg mb-2" id="btnBayar">
                        <i class="fas fa-money-bill-wave"></i> Proses Pembayaran
                    </button>
                    <button class="btn btn-secondary w-100 btn-lg" id="btnBatal">
                        <i class="fas fa-times"></i> Batalkan Transaksi
                    </button>
                </div>
            </div>
            <div class="card shadow-sm rounded-4">
                <div class="card-body">
                    <h6 class="mb-2">Shortcut:</h6>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="badge bg-primary">F1: Fokus Barcode</span>
                        <span class="badge bg-success">F2: Proses Bayar</span>
                        <span class="badge bg-danger">F3: Batalkan</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@push('scripts')
{{-- <script src="{{ asset('js/modules/kasir.js') }}"></script> --}}
<script>
    // Jam realtime
    setInterval(() => {
        document.getElementById('jamKasir').textContent = new Date().toLocaleTimeString();
    }, 1000);
</script>
@endpush
@endsection
