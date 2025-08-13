@extends('layouts.app')

@section('title', 'Kasir')

@section('content')
    <div class="container-fluid py-4">
        <!-- Row 1: Info Transaksi & Input Produk -->
        <div class="row g-3 align-items-end mb-3">
            <div class="col-md-6">
                <div class="row g-2">
                    <div class="col-md-6">
                        <label class="form-label mb-1">No. Transaksi</label>
                        <input type="text" class="form-control" id="noTransaksi" value="" readonly>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label mb-1">Tanggal</label>
                        <input type="text" class="form-control" id="tanggalTransaksi" value="{{ date('Y-m-d H:i:s') }}"
                            readonly>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-12">
                        <label class="form-label mb-1">Scan Barcode / Cari Produk</label>
                        <div class="input-group input-group-lg">
                            <span class="input-group-text bg-white"><i class="fas fa-barcode"></i></span>
                            <input type="text" class="form-control" id="barcodeInput"
                                placeholder="Scan barcode atau ketik nama produk..." autocomplete="off" autofocus>
                            <button class="btn btn-primary" id="searchBtn"><i class="fas fa-search"></i></button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Mini Preview Produk -->
            <div class="col-md-6 h-100">
                <div class="card shadow-sm border-0 mb-0 h-100">
                    <div class="card-body py-3 px-4 d-flex flex-column justify-content-center h-100">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-box fa-2x text-primary me-3"></i>
                            <div class="fw-bold fs-5 flex-grow-1" id="previewNamaProduk">-</div>
                        </div>
                        <div class="mb-3">
                            <div class="small text-muted fs-5" id="previewHargaProduk">Rp0</div>
                        </div>
                        <div class="d-flex align-items-center gap-2 mt-auto">
                            <button class="btn btn-outline-secondary btn-sm" id="btnQtyMinus"><i
                                    class="fas fa-minus"></i></button>
                            <input type="number" class="form-control form-control-sm text-center" id="previewQty"
                                value="1" min="1" style="width:60px;">
                            <button class="btn btn-outline-secondary btn-sm" id="btnQtyPlus"><i
                                    class="fas fa-plus"></i></button>
                            <select class="form-select form-select-sm ms-2" id="previewSatuan" style="width:auto;">
                                <option value="pcs">pcs</option>
                                <!-- Satuan lain diisi JS -->
                            </select>
                            <button class="btn btn-success btn-sm ms-2" id="btnTambahKeranjang"><i
                                    class="fas fa-cart-plus"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Row 2: Tabel Keranjang & Total Bayar -->
        <div class="row g-3 mb-3">
            <div class="col-md-8">
                <div class="card shadow-sm border-0 rounded-4">
                    <div class="card-header bg-white fw-bold">
                        <strong>DAFTAR BELANJA</strong>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 350px;">
                            <table class="table table-striped table-hover align-middle mb-0" id="keranjangTable">
                                <thead class="table fw-semibold"
                                    style="position: sticky; top: 0; z-index: 1;">
                                    <tr>
                                        <th style="min-width: 120px;">Produk</th>
                                        <th class="text-end" style="min-width: 90px;">Harga</th>
                                        <th class="text-center" style="min-width: 70px;">Qty</th>
                                        <th class="text-center" style="min-width: 80px;">Satuan</th>
                                        <th class="text-end" style="min-width: 110px;">Subtotal</th>
                                        <th class="text-center" style="width: 60px;">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {{-- Data keranjang diisi JS --}}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Total Bayar -->
            <div class="col-md-4">
                <div class="card shadow-sm rounded-4 mb-3">
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-center mb-2 gap-2">
                            <i class="fas fa-cash-register fa-2x text-success"></i>
                            <div>
                                <h4 class="mb-0 fw-bold">TOTAL BAYAR</h4>
                            </div>
                        </div>
                        <h2 class="fw-bold text-success mb-3 text-center" id="totalBelanja">Rp0</h2>
                        <div class="mb-3">
                            <label class="form-label text-start">Uang Customer</label>
                            <input type="number" min="0" class="form-control form-control-lg text-end fw-bold"
                                id="inputUangPembeli">
                            <div id="peringatanKurang" class="text-danger small mt-1" style="display:none;">Nominal bayar
                                kurang!</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label text-start">Kembalian</label>
                            <input type="text" class="form-control form-control-lg text-end fw-bold bg-light"
                                id="inputKembalian" value="Rp0" readonly>
                        </div>
                        <hr class="my-3">
                        <button type="button"
                            class="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center gap-2 mb-2"
                            id="btnProsesBayarUtama">
                            <i class="fas fa-money-bill-wave"></i>
                            <span id="textProsesBayar">Proses Pembayaran</span>
                        </button>
                        <button class="btn btn-outline-danger w-100 btn-lg" id="btnBatal">
                            <i class="fas fa-times"></i> Batalkan Transaksi
                        </button>
                        <div class="mt-3 small text-muted">
                            <i class="fas fa-info-circle"></i> Pastikan data sudah benar sebelum membayar.
                        </div>
                    </div>
                </div>
            </div>
        </div>


    </div>
    <!-- Modal Data Pembeli Hutang -->
    <div class="modal fade" id="modalHutang" tabindex="-1" aria-labelledby="modalHutangLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <form id="formHutang" autocomplete="off">
                <div class="modal-content rounded-4 shadow">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalHutangLabel">
                            <i class="fas fa-user-clock me-2"></i>Data Pembeli (Hutang)
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3">
                            <div class="mb-2">
                                <label for="namaPembeli" class="form-label">Nama Pembeli <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="namaPembeli"
                                    placeholder="Masukkan nama pembeli" required>
                            </div>
                            <div class="mb-2">
                                <label for="noHp" class="form-label">No. HP <span
                                        class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="noHp"
                                    placeholder="Masukkan nomor HP" required>
                            </div>
                            <div class="mb-2">
                                <label for="jatuhTempo" class="form-label">Jatuh Tempo <span
                                        class="text-danger">*</span></label>
                                <input type="date" class="form-control" id="jatuhTempo" required>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-warning w-100">
                            <i class="fas fa-save"></i> Simpan
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    <!-- Modal Data Pembeli (CRM) -->
    <div class="modal fade" id="modalPembeliLunas" tabindex="-1" aria-labelledby="modalPembeliLunasLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <form id="formPembeliLunas" autocomplete="off">
                <div class="modal-content rounded-4 shadow">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalPembeliLunasLabel">
                            <i class="fas fa-user-plus me-2"></i>Data Pembeli (CRM)
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-2">
                            <label for="namaPembeliLunas" class="form-label">Nama Pembeli <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="namaPembeliLunas" placeholder="Masukkan nama pembeli" required>
                        </div>
                        <div class="mb-2">
                            <label for="noHpLunas" class="form-label">No. HP <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="noHpLunas" placeholder="Masukkan nomor HP" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success w-100">
                            <i class="fas fa-save"></i> Simpan
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    @push('scripts')
        <script src="{{ asset('js/modules/kasir.js') }}"></script>
    @endpush
@endsection
