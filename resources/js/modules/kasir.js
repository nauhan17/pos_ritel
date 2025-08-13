import { ensureSwal, ensureBootstrap } from '../utils/vendors';

export async function init() {
    const swalP = ensureSwal().catch(() => null);
    const bootstrapP = ensureBootstrap().catch(() => null);

    if (localStorage.getItem('loginSuccess') === '1') {
        swalP.then((Swal) => {
            if (!Swal) return;
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Login berhasil!',
                showConfirmButton: false,
                timer: 2000
            });
        }).finally(() => localStorage.removeItem('loginSuccess'));
    }

    const state = {
        produkList: [],
        keranjang: [],
        previewProduk: null,
        hutangData: null,
        index: {
            barcode: new Map() // key: barcode lower-case → value: produk
        }
    };

    let produkLoadedOnce = false;

    const DOM = {
        barcodeInput: document.getElementById('barcodeInput'),
        btnTambahKeranjang: document.getElementById('btnTambahKeranjang'),
        keranjangTable: document.getElementById('keranjangTable'),
        totalBelanja: document.getElementById('totalBelanja'),
        previewNamaProduk: document.getElementById('previewNamaProduk'),
        previewHargaProduk: document.getElementById('previewHargaProduk'),
        previewQty: document.getElementById('previewQty'),
        previewSatuan: document.getElementById('previewSatuan'),
        btnQtyPlus: document.getElementById('btnQtyPlus'),
        btnQtyMinus: document.getElementById('btnQtyMinus'),
        inputUangPembeli: document.getElementById('inputUangPembeli'),
        inputKembalian: document.getElementById('inputKembalian'),
        meta: {
            csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || ''
        }
    };

    function cariProduk(input) {
        const q = (input || '').trim().toLowerCase();
        if (!q) return null;
        // Lookup cepat via barcode
        const byBarcode = state.index.barcode.get(q);
        if (byBarcode) return byBarcode;
        // Fallback: cari di nama (partial)
        return state.produkList.find(p => p.nama && p.nama.toLowerCase().includes(q)) || null;
    }

    function getHargaBySatuan(produk, satuan) {
        if (!produk || !satuan) return 0;
        if (satuan === produk.satuan) return parseInt(produk.harga);
        if (produk.konversi_satuan) {
            const konv = produk.konversi_satuan.find(k => k.satuan_besar === satuan);
            if (konv && konv.harga_jual) return parseInt(konv.harga_jual);
            if (konv && konv.konversi) return parseInt(produk.harga) * parseInt(konv.konversi);
        }
        return parseInt(produk.harga);
    }

    function updateMiniPreview(produk) {
        const prevId = state.previewProduk?.id;
        state.previewProduk = produk;
        if (DOM.previewNamaProduk) DOM.previewNamaProduk.textContent = produk ? produk.nama : '-';
        // Rebuild opsi satuan hanya saat produk berubah
        if (produk && DOM.previewSatuan && produk.id !== prevId) {
            const units = Array.isArray(produk.satuan) ? produk.satuan : [produk.satuan || 'pcs'];
            const frag = document.createDocumentFragment();
            DOM.previewSatuan.innerHTML = '';
            units.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                frag.appendChild(opt);
            });
            DOM.previewSatuan.appendChild(frag);
        }
        // Jangan reset qty tiap ketik; cukup hitung ulang harga
        updateHargaPreview();
    }

    function renderKeranjang() {
        const tbody = DOM.keranjangTable?.querySelector('tbody');
        if (!tbody) return;
        const rows = state.keranjang.map((item, idx) => `
            <tr>
                <td>
                    <span class="fw-semibold">${item.nama}</span>
                    <div class="small text-muted">${item.barcode ?? ''}</div>
                </td>
                <td>Rp${Number(item.harga).toLocaleString('id-ID')}</td>
                <td>${item.qty}</td>
                <td>${item.satuan}</td>
                <td>
                    Rp${(Number(item.harga) * Number(item.qty)).toLocaleString('id-ID')}
                </td>
                <td>
                    <button class="btn btn-sm btn-light text-danger" data-idx="${idx}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
        tbody.innerHTML = rows.join('');
        const total = state.keranjang.reduce((sum, item) => sum + item.harga * item.qty, 0);
        if (DOM.totalBelanja) DOM.totalBelanja.textContent = 'Rp' + total.toLocaleString('id-ID');
    }

    function hapusKeranjang(idx) {
        state.keranjang.splice(idx, 1);
        renderKeranjang();
    }

    async function prosesTransaksi(status = 'lunas', pembeliData = null) {
        if (state.keranjang.length === 0) {
            showAlert('Keranjang belanja kosong!', 'warning');
            return;
        }
        const total = parseInt(DOM.totalBelanja?.textContent.replace(/[^0-9]/g, '') || '0');

        if (status === 'hutang') {
            const modalEl = document.getElementById('modalHutang');
            const b = window.bootstrap || await bootstrapP;
            if (!modalEl || !b) {
                showAlert('Modal hutang tidak tersedia', 'error');
                return;
            }
            b.Modal.getOrCreateInstance(modalEl)?.show();

            const jatuhTempoInput = document.getElementById('jatuhTempo');
            if (jatuhTempoInput) {
                const now = new Date();
                now.setDate(now.getDate() + 7);
                jatuhTempoInput.value = now.toISOString().slice(0, 10);
            }
            const form = document.getElementById('formHutang');
            if (form) {
                form.onsubmit = async function (e) {
                    e.preventDefault();
                    state.hutangData = {
                        nama_pembeli: document.getElementById('namaPembeli')?.value || '',
                        no_hp: document.getElementById('noHp')?.value || '',
                        jatuh_tempo: document.getElementById('jatuhTempo')?.value || ''
                    };
                    (window.bootstrap || b)?.Modal.getOrCreateInstance(modalEl)?.hide();
                    await submitTransaksi(status, state.hutangData);
                    state.hutangData = null;
                };
            }
            return;
        }
        await submitTransaksi(status, null);
    }

    async function submitTransaksi(status, hutangData) {
        // Guard CSRF
        if (!DOM.meta.csrfToken) {
            await showAlert('Sesi kadaluarsa. Memuat ulang...', 'warning', 1800);
            window.location.reload();
            return;
        }

        // Validasi item
        if (!Array.isArray(state.keranjang) || state.keranjang.length === 0) {
            await showAlert('Keranjang kosong', 'warning');
            return;
        }
        if (state.keranjang.some(it => !it.produk_id)) {
            await showAlert('Produk di keranjang tidak valid', 'error');
            return;
        }

        const total = parseInt(DOM.totalBelanja?.textContent.replace(/[^0-9]/g, '') || '0');
        const bayar = parseInt(DOM.inputUangPembeli?.value || '0');
        const sisaHutang = Math.max(total - bayar, 0);
        let hutang = 0, kembalian = 0;
        if (status === 'hutang') { hutang = sisaHutang; kembalian = 0; } else { hutang = 0; kembalian = bayar - total; }

        const transaksiData = {
            no_transaksi: document.getElementById('noTransaksi')?.value || '',
            tanggal: document.getElementById('tanggalTransaksi')?.value || new Date().toISOString().slice(0, 10),
            total: Number(total),
            uang_customer: Number(bayar),
            kembalian: Number(kembalian),
            hutang: Number(hutang),
            status,
            nama_pembeli: hutangData ? hutangData.nama_pembeli : null,
            no_hp: hutangData ? hutangData.no_hp : null,
            jatuh_tempo: hutangData ? hutangData.jatuh_tempo : null,
            items: state.keranjang.map(item => ({
                produk_id: Number(item.produk_id),
                nama_produk: item.nama,
                qty: Number(item.qty),
                satuan: item.satuan,
                harga: Number(item.harga),
                subtotal: Number(item.harga) * Number(item.qty)
            }))
        };

        // Helper ambil pesan error dari response JSON/HTML
        const extractError = (payload) => {
            if (!payload) return 'Tidak diketahui';
            if (payload.message) return payload.message;
            if (payload.errors) {
                const first = Object.values(payload.errors)[0];
                if (Array.isArray(first) && first[0]) return first[0];
            }
            if (typeof payload === 'string') return payload.slice(0, 200);
            return 'Tidak diketahui';
        };

        async function doSubmit(data, retried = false) {
            const res = await fetch('/transaksi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken
                },
                body: JSON.stringify(data),
                credentials: 'same-origin'
            });
            const raw = await res.text();
            let result;
            try { result = raw ? JSON.parse(raw) : {}; } catch { result = { success: false, message: raw }; }

            // Deteksi bentrok nomor → ambil no baru dan retry sekali
            if ((!res.ok || result?.success !== true) && isDuplicateNoTransaksi(result, res.status) && !retried) {
                const freshNo = await fetchNoTransaksiBaruForSubmit();
                if (freshNo) {
                    data.no_transaksi = freshNo;
                    const noEl = document.getElementById('noTransaksi');
                    if (noEl) noEl.value = freshNo;
                    await showAlert('Nomor transaksi bentrok, mencoba ulang...', 'warning', 1600);
                    return doSubmit(data, true);
                }
            }

            if (!res.ok || result?.success !== true) {
                const msg = extractError(result);
                console.error('Submit transaksi gagal:', { status: res.status, result: result || raw });
                await showAlert('Gagal menyimpan transaksi: ' + msg, 'error', 2500);
                return null;
            }
            return result;
        }

        try {
            const result = await doSubmit({ ...transaksiData }, false);
            if (!result) return;

            await showAlert('Transaksi berhasil disimpan!', 'success');

            // Optimistic update stok
            decreaseLocalStok(transaksiData.items);
            // Sinkron stok dari server (lebih akurat)
            if (Array.isArray(result.updated_stok)) {
                result.updated_stok.forEach(u => {
                    const p = state.produkList.find(x => x.id === u.produk_id);
                    if (p) p.stok = Number(u.stok) || 0;
                });
            }

            // No transaksi dari server (jika ada)
            const noEl = document.getElementById('noTransaksi');
            if (noEl && result.no_transaksi) noEl.value = result.no_transaksi;

            const noUse = result.no_transaksi || transaksiData.no_transaksi;
            const nominalHutang = sisaHutang;
            const ket = status === 'lunas'
                ? `Transaksi #${noUse} berhasil senilai Rp ${Number(total).toLocaleString('id-ID')}`
                : `Transaksi #${noUse} dicatat sebagai hutang senilai Rp ${nominalHutang.toLocaleString('id-ID')}`;

            await saveTracking({
                tipe: 'Transaksi',
                keterangan: ket,
                status: status === 'lunas' ? 'Lunas' : 'Hutang',
                transaksi_id: result.id || null,
                produk_id: null,
                nama_produk: null
            });

            // Reset UI
            state.keranjang = [];
            renderKeranjang();
            if (DOM.inputUangPembeli) DOM.inputUangPembeli.value = '';
            if (DOM.inputKembalian) DOM.inputKembalian.value = 'Rp0';
            updateMiniPreview(null);

            // Hindari reload semua produk (berat). Ambil nomor transaksi baru saja.
            await getNoTransaksiBaru();
        } catch (e) {
            console.error('Submit transaksi error:', e);
            await showAlert('Terjadi kesalahan saat menyimpan transaksi!', 'error', 2200);
        }
    }

    function pcsFromUnit(produk, satuan, qty) {
        const q = Number(qty) || 0;
        if (!produk || !satuan) return 0;
        if (satuan === produk.satuan) return q;
        const k = (produk.konversi_satuan || []).find(x => x.satuan_besar === satuan);
        const konv = Number(k?.konversi) || 0;
        return konv > 0 ? q * konv : q;
    }

    function decreaseLocalStok(items) {
        if (!Array.isArray(items)) return;
        items.forEach(it => {
            const p = state.produkList.find(x => x.id === it.produk_id);
            if (!p) return;
            const pcs = pcsFromUnit(p, it.satuan, it.qty);
            p.stok = Math.max(0, (Number(p.stok) || 0) - pcs);
        });
    }

    function updateButtonBayarStyle() {
        const total = parseInt(DOM.totalBelanja?.textContent.replace(/[^0-9]/g, '') || '0');
        const bayar = parseInt(DOM.inputUangPembeli?.value || '0');
        const btn = document.getElementById('btnProsesBayarUtama');
        const textSpan = document.getElementById('textProsesBayar');
        if (!btn || !textSpan) return;
        if (bayar < total) {
            btn.classList.remove('btn-success');
            btn.classList.add('btn-warning');
            btn.classList.remove('btn-secondary');
            textSpan.textContent = 'Proses Hutang';
        } else {
            btn.classList.remove('btn-warning');
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-success');
            textSpan.textContent = 'Proses Pembayaran';
        }
    }

    function setupEventListener() {
        DOM.keranjangTable?.querySelector('tbody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-idx]');
            if (!btn) return;
            const idx = parseInt(btn.getAttribute('data-idx'));
            if (Number.isFinite(idx)) {
                hapusKeranjang(idx);
                showAlert('Produk dihapus dari daftar belanja', 'info');
            }
        });
        // Debounce input barcode untuk hindari pencarian berulang
        const debounce = (fn, wait = 120) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; };
        if (DOM.barcodeInput) {
            const onInput = debounce(function () {
                const produk = cariProduk(DOM.barcodeInput.value);
                updateMiniPreview(produk);
            }, 120);
            DOM.barcodeInput.addEventListener('input', onInput);
            // Scanner biasanya mengirim Enter → cari langsung
            DOM.barcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const produk = cariProduk(DOM.barcodeInput.value);
                    updateMiniPreview(produk);
                }
            });
        }

        DOM.btnTambahKeranjang?.addEventListener('click', function () {
            const produk = state.previewProduk;
            if (!produk) {
                showAlert('Pilih produk terlebih dahulu', 'warning');
                return;
            }
            const qty = parseInt(DOM.previewQty?.value || '1');
            const satuan = DOM.previewSatuan?.value || (Array.isArray(produk.satuan) ? produk.satuan[0] : 'pcs');
            const harga = getHargaBySatuan(produk, satuan);
            const idx = state.keranjang.findIndex(item => item.produk_id === produk.id && item.satuan === satuan);
            if (idx > -1) {
                state.keranjang[idx].qty += qty;
            } else {
                state.keranjang.push({
                    produk_id: produk.id,
                    barcode: produk.barcode,
                    nama: produk.nama,
                    harga: harga,
                    qty: qty,
                    satuan: satuan
                });
            }
            renderKeranjang();
            if (DOM.barcodeInput) {
                DOM.barcodeInput.value = '';
                DOM.barcodeInput.focus();
            }
            updateMiniPreview(null);
        });

        const btnBatal = document.getElementById('btnBatal');
        btnBatal?.addEventListener('click', function () {
            state.keranjang = [];
            renderKeranjang();
            if (DOM.inputUangPembeli) DOM.inputUangPembeli.value = '';
            if (DOM.inputKembalian) DOM.inputKembalian.value = 'Rp0';
            updateMiniPreview(null);
            updateButtonBayarStyle();
            showAlert('Transaksi dibatalkan, keranjang dikosongkan', 'info');
        });

        DOM.btnQtyPlus?.addEventListener('click', function () {
            if (DOM.previewQty) {
                DOM.previewQty.value = (parseInt(DOM.previewQty.value || '1') + 1);
                updateHargaPreview();
            }
        });
        DOM.btnQtyMinus?.addEventListener('click', function () {
            if (DOM.previewQty && parseInt(DOM.previewQty.value || '1') > 1) {
                DOM.previewQty.value = (parseInt(DOM.previewQty.value) - 1);
                updateHargaPreview();
            }
        });

        DOM.previewSatuan?.addEventListener('change', updateHargaPreview);
        DOM.previewQty?.addEventListener('input', updateHargaPreview);

        const peringatanKurang = document.getElementById('peringatanKurang');
        DOM.inputUangPembeli?.addEventListener('input', function () {
            const total = parseInt(DOM.totalBelanja?.textContent.replace(/[^0-9]/g, '') || '0');
            const bayar = parseInt(this.value || '0');
            const kembalian = bayar - total;
            if (peringatanKurang) {
                if (bayar < total) {
                    peringatanKurang.style.display = '';
                    if (DOM.inputKembalian) DOM.inputKembalian.value = 'Rp0';
                } else {
                    peringatanKurang.style.display = 'none';
                    if (DOM.inputKembalian) DOM.inputKembalian.value = 'Rp' + kembalian.toLocaleString('id-ID');
                }
            }
        });

        DOM.inputUangPembeli?.addEventListener('input', updateButtonBayarStyle);

        const btnProses = document.getElementById('btnProsesBayarUtama');
        btnProses?.addEventListener('click', function () {
            const total = parseInt(DOM.totalBelanja?.textContent.replace(/[^0-9]/g, '') || '0');
            const bayar = parseInt(DOM.inputUangPembeli?.value || '0');
            if (bayar < total) {
                prosesTransaksi('hutang', null);
            } else {
                prosesTransaksi('lunas', null);
            }
        });
    }

    function updateHargaPreview() {
        const produk = state.previewProduk;
        if (!produk || !DOM.previewHargaProduk) {
            if (DOM.previewHargaProduk) DOM.previewHargaProduk.textContent = 'Rp0';
            return;
        }
        const satuan = DOM.previewSatuan?.value || (Array.isArray(produk.satuan) ? produk.satuan[0] : 'pcs');
        const harga = getHargaBySatuan(produk, satuan);
        const qty = parseInt(DOM.previewQty?.value || '1');
        const hargaTotal = harga * qty;
        DOM.previewHargaProduk.textContent = 'Rp' + hargaTotal.toLocaleString('id-ID');
    }

    async function loadProdukList() {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort('timeout'), 2500);
            const res = await fetch('/api/produk', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' },
                signal: ctrl.signal
            }).finally(() => clearTimeout(t));
            if (!res.ok) throw new Error('Gagal memuat data produk');
            const data = await res.json();
            const produkArr = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
            if (!Array.isArray(produkArr)) throw new Error('Data produk tidak valid');
            state.produkList = produkArr.map(p => ({
                id: p.id,
                barcode: p.barcode_utama || '',
                barcodes: (p.barcodes || []).map(bc => bc.kode_barcode),
                nama: p.nama_produk,
                harga: p.harga_jual,
                satuan: [p.satuan, ...(p.konversi_satuan || []).map(k => k.satuan_besar)],
                konversi_satuan: p.konversi_satuan || [],
                stok: Number(p.stok ?? 0)
            }));
            // Bangun index barcode untuk lookup O(1)
            state.index.barcode.clear();
            state.produkList.forEach(p => {
                if (p.barcode) state.index.barcode.set(String(p.barcode).toLowerCase(), p);
                (p.barcodes || []).forEach(bc => {
                    if (bc) state.index.barcode.set(String(bc).toLowerCase(), p);
                });
            });
        } catch (e) {
            showAlert('Gagal memuat data produk: ' + (e.message || e), 'error');
        }
    }

    // Ganti endpoint nomor transaksi baru → pakai controller TransaksiController
    let noTrxReqSeq = 0;
    async function getNoTransaksiBaru() {
        const seq = ++noTrxReqSeq;
        const noEl = document.getElementById('noTransaksi');
        const placeholderTimer = setTimeout(() => { if (noEl && !noEl.value) noEl.value = 'Memuat...'; }, 2000);

        async function fetchNo(url) {
            const res = await fetch(url, {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }

        try {
            let data;
            try {
                data = await fetchNo('/transaksi/no-baru');     // web controller
            } catch (e) {
                if (String(e.message).includes('404')) {
                    data = await fetchNo('/api/no-transaksi-baru'); // fallback api jika ada
                } else {
                    throw e;
                }
            }
            clearTimeout(placeholderTimer);
            if (seq !== noTrxReqSeq) return;
            if (noEl) noEl.value = data.no_transaksi || '';
        } catch (e) {
            clearTimeout(placeholderTimer);
            if (noEl) noEl.value = 'TRX' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-ERR';
        }
    }

    async function fetchNoTransaksiBaruForSubmit() {
        try {
            const res = await fetch('/transaksi/no-baru', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res.ok) {
                const j = await res.json();
                return j?.no_transaksi || null;
            }
        } catch { }
        try {
            const res2 = await fetch('/api/no-transaksi-baru', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res2.ok) {
                const j2 = await res2.json();
                return j2?.no_transaksi || null;
            }
        } catch { }
        return null;
    }

    async function showAlert(message, type = 'info', duration = 1600) {
        const Swal = await swalP;
        if (!Swal) {
            console[type === 'error' || type === 'danger' ? 'error' : 'log'](message);
            return;
        }
        const icon = (type === 'danger') ? 'error' : (type || 'info');
        return Swal.fire({
            toast: true,
            position: 'top-end',
            icon,
            title: message,
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true
        });
    }

    async function saveTracking(trackingData) {
        await fetch('/api/tracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': DOM.meta.csrfToken
            },
            body: JSON.stringify({
                ...trackingData,
                pengguna: window.currentUserName || 'Guest'
            }),
            credentials: 'same-origin'
        });
    }

    (() => {
        // Render awal non-blocking
        renderKeranjang();
        updateMiniPreview(null);
        setupEventListener();
        // Mulai request paralel (kurangi TTFB total)
        const p1 = loadProdukList();
        const p2 = getNoTransaksiBaru();
        Promise.allSettled([p1, p2]).catch(() => { });
    })();
}
