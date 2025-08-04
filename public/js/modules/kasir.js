document.addEventListener('DOMContentLoaded', function () {
    // === DOM SELECTOR ===
    const DOM = {
        meta: {
            csrfToken: document.querySelector('meta[name="csrf-token"]').content
        },
        barcodeInput: document.getElementById('barcodeInput'),
        previewNamaProduk: document.getElementById('previewNamaProduk'),
        previewHargaProduk: document.getElementById('previewHargaProduk'),
        previewQty: document.getElementById('previewQty'),
        previewSatuan: document.getElementById('previewSatuan'),
        btnQtyPlus: document.getElementById('btnQtyPlus'),
        btnQtyMinus: document.getElementById('btnQtyMinus'),
        btnTambahKeranjang: document.getElementById('btnTambahKeranjang'),
        keranjangTable: document.getElementById('keranjangTable'),
        totalBelanja: document.getElementById('totalBelanja')
    };

    // === STATE ===
    const state = {
        produkList: [],
        keranjang: [],
        previewProduk: null,
        hutangData: null
    };

    // === FUNCTIONS ===

    function cariProduk(input) {
        input = (input || '').trim().toLowerCase();
        if (!input) return null;
        return state.produkList.find(p => {
            if (p.barcode && p.barcode.toLowerCase().includes(input)) return true;
            if (Array.isArray(p.barcodes) && p.barcodes.some(bc => bc && bc.toLowerCase().includes(input))) return true;
            if (p.nama && p.nama.toLowerCase().includes(input)) return true;
            return false;
        });
    }

    function getHargaBySatuan(produk, satuan) {
        // Contoh: jika satuan besar, harga dikali konversi (implementasi sesuai kebutuhan)
        // Misal: produk.harga_jual = harga per satuan dasar, konversi_satuan = [{satuan_besar, konversi}]
        if (!produk || !satuan) return 0;
        if (satuan === produk.satuan) return parseInt(produk.harga); // satuan dasar
        if (produk.konversi_satuan) {
            const konv = produk.konversi_satuan.find(k => k.satuan_besar === satuan);
            if (konv) return parseInt(produk.harga) * parseInt(konv.konversi);
        }
        return parseInt(produk.harga);
    }

    function updateMiniPreview(produk) {
        state.previewProduk = produk;
        const satuan = produk && produk.satuan ? produk.satuan : 'pcs';
        let harga = produk ? parseInt(produk.harga) : 0;
        let qty = parseInt(DOM.previewQty.value) || 1;
        // Jika satuan dipilih, update harga satuan
        if (produk && DOM.previewSatuan.value) {
            harga = getHargaBySatuan(produk, DOM.previewSatuan.value);
        }
        // Harga total = harga satuan x qty
        const hargaTotal = harga * qty;
        DOM.previewNamaProduk.textContent = produk ? produk.nama : '-';
        DOM.previewHargaProduk.textContent = produk ? 'Rp' + hargaTotal.toLocaleString('id-ID') : 'Rp0';
        DOM.previewSatuan.innerHTML = '';
        if (produk) {
            produk.satuan.forEach(s => {
                DOM.previewSatuan.innerHTML += `<option value="${s}">${s}</option>`;
            });
        } else {
            DOM.previewSatuan.innerHTML = '<option value="pcs">pcs</option>';
        }
        DOM.previewQty.value = 1;
    }

    function renderKeranjang() {
        const tbody = DOM.keranjangTable.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        state.keranjang.forEach((item, idx) => {
            tbody.innerHTML += `
                <tr>
                    <td>
                        <span class="fw-semibold">${item.nama}</span>
                        <div class="small text-muted">${item.barcode}</div>
                    </td>
                    <td class="text-end">Rp${item.harga.toLocaleString('id-ID')}</td>
                    <td class="text-center">${item.qty}</td>
                    <td class="text-center">${item.satuan}</td>
                    <td class="text-end">Rp${(item.harga * item.qty).toLocaleString('id-ID')}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-light text-danger" data-idx="${idx}" title="Hapus"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        const total = state.keranjang.reduce((sum, item) => sum + item.harga * item.qty, 0);
        DOM.totalBelanja.textContent = 'Rp' + total.toLocaleString('id-ID');
        tbody.querySelectorAll('button[data-idx]').forEach(btn => {
            btn.addEventListener('click', function() {
                hapusKeranjang(parseInt(this.getAttribute('data-idx')));
            });
        });
    }

    function hapusKeranjang(idx) {
        state.keranjang.splice(idx, 1);
        renderKeranjang();
    }

    async function prosesTransaksi(status = 'lunas', pembeliData = null) {
        // Validasi keranjang
        if (state.keranjang.length === 0) {
            showAlert('Keranjang belanja kosong!', 'warning');
            return;
        }
        // Validasi uang customer
        const total = parseInt(DOM.totalBelanja.textContent.replace(/[^0-9]/g, '')) || 0;
        const bayar = parseInt(DOM.inputUangPembeli.value) || 0;

        // Tentukan status
        // let status = 'lunas';
        if (status === 'hutang') {
            // Tampilkan modal hutang
            const modal = new bootstrap.Modal(document.getElementById('modalHutang'));
            modal.show();
            const jatuhTempoInput = document.getElementById('jatuhTempo');
            if (jatuhTempoInput) {
                const now = new Date();
                now.setDate(now.getDate() + 7);
                jatuhTempoInput.value = now.toISOString().slice(0, 10);
            }
            // Tunggu submit modal
            document.getElementById('formHutang').onsubmit = async function(e) {
                e.preventDefault();
                state.hutangData = {
                    nama_pembeli: document.getElementById('namaPembeli').value,
                    no_hp: document.getElementById('noHp').value,
                    jatuh_tempo: document.getElementById('jatuhTempo').value
                };
                modal.hide();
                await submitTransaksi(status, state.hutangData);
                state.hutangData = null; // reset setelah submit
            };
            return;
        }
        await submitTransaksi(status, null);
    }

    async function submitTransaksi(status, hutangData) {
        const total = parseInt(DOM.totalBelanja.textContent.replace(/[^0-9]/g, '')) || 0;
        const bayar = parseInt(DOM.inputUangPembeli.value) || 0;
        let hutang = 0, kembalian = 0;
        if (status === 'hutang') {
            hutang = total - bayar;
            kembalian = 0;
        } else {
            hutang = 0;
            kembalian = bayar - total;
        }
        const transaksiData = {
            no_transaksi: (document.getElementById('noTransaksi')?.value) || '',
            tanggal: (document.getElementById('tanggalTransaksi')?.value) || new Date().toISOString().slice(0, 10),
            total: total,
            uang_customer: bayar,
            kembalian: kembalian,
            hutang: hutang,
            status: status,
            nama_pembeli: hutangData ? hutangData.nama_pembeli : null,
            no_hp: hutangData ? hutangData.no_hp : null,
            jatuh_tempo: hutangData ? hutangData.jatuh_tempo : null,
            items: state.keranjang.map(item => ({
                produk_id: item.produk_id || null,
                nama_produk: item.nama,
                qty: item.qty,
                satuan: item.satuan,
                harga: item.harga,
                subtotal: item.harga * item.qty
            }))
        };

        try {
            const res = await fetch('/api/transaksi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(transaksiData),
                credentials: 'same-origin',
            });
            const result = await res.json();
            if (result.success) {
                showAlert('Transaksi berhasil disimpan!', 'success');

                // Tracking transaksi (hanya sekali per transaksi, bukan per produk)
                let trackingStatus, trackingKeterangan;
                if (status === 'lunas') {
                    trackingStatus = 'Lunas';
                    trackingKeterangan = `Transaksi #${transaksiData.no_transaksi} berhasil senilai Rp ${transaksiData.total.toLocaleString('id-ID')}`;
                } else {
                    trackingStatus = 'Hutang';
                    trackingKeterangan = `Transaksi #${transaksiData.no_transaksi} dicatat sebagai hutang senilai Rp ${transaksiData.total.toLocaleString('id-ID')}`;
                }

                await saveTracking({
                    tipe: 'Transaksi',
                    keterangan: trackingKeterangan,
                    status: trackingStatus === 'Lunas' ? 'Lunas' : 'Hutang',
                    transaksi_id: result.id || null,
                    produk_id: null,
                    nama_produk: null
                });

                state.keranjang = [];
                renderKeranjang();
                DOM.inputUangPembeli.value = '';
                DOM.inputKembalian.value = 'Rp0';
                updateMiniPreview(null);
                await getNoTransaksiBaru();
            } else {
                showAlert('Gagal menyimpan transaksi!', 'error');
            }
        } catch (e) {
            showAlert('Terjadi kesalahan saat menyimpan transaksi!', 'error');
        }
    }

    function updateButtonBayarStyle() {
        const total = parseInt(DOM.totalBelanja.textContent.replace(/[^0-9]/g, '')) || 0;
        const bayar = parseInt(DOM.inputUangPembeli.value) || 0;
        const btn = document.getElementById('btnProsesBayarUtama'); // perbaiki id
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

    // === EVENT HANDLER SETUP ===
    function setupEventListener() {
        DOM.barcodeInput.addEventListener('input', function() {
            const produk = cariProduk(this.value);
            updateMiniPreview(produk);
        });

        DOM.btnTambahKeranjang.addEventListener('click', function() {
            const produk = state.previewProduk;
            if (!produk) {
                showAlert('Pilih produk terlebih dahulu', 'warning');
                return;
            }
            const qty = parseInt(DOM.previewQty.value) || 1;
            const satuan = DOM.previewSatuan.value;
            const harga = getHargaBySatuan(produk, satuan);
            // Gunakan produk.id sebagai pembeda utama
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
            DOM.barcodeInput.value = '';
            updateMiniPreview(null);
            DOM.barcodeInput.focus();
        });

        document.getElementById('btnBatal').addEventListener('click', function() {
            state.keranjang = [];
            renderKeranjang();
            if (DOM.inputUangPembeli) DOM.inputUangPembeli.value = '';
            if (DOM.inputKembalian) DOM.inputKembalian.value = 'Rp0';
            updateMiniPreview(null);
            updateButtonBayarStyle();
        });

        DOM.btnQtyPlus.addEventListener('click', function() {
            DOM.previewQty.value = parseInt(DOM.previewQty.value) + 1;
            updateHargaPreview();
        });
        DOM.btnQtyMinus.addEventListener('click', function() {
            if (parseInt(DOM.previewQty.value) > 1) {
                DOM.previewQty.value = parseInt(DOM.previewQty.value) - 1;
                updateHargaPreview();
            }
        });

        DOM.previewSatuan.addEventListener('change', function() {
            updateHargaPreview();
        });

        DOM.previewQty.addEventListener('input', function() {
            updateHargaPreview();
        });

        DOM.inputUangPembeli = document.getElementById('inputUangPembeli');
        DOM.inputKembalian = document.getElementById('inputKembalian');
        const peringatanKurang = document.getElementById('peringatanKurang');

        DOM.inputUangPembeli.addEventListener('input', function() {
            const total = parseInt(DOM.totalBelanja.textContent.replace(/[^0-9]/g, '')) || 0;
            const bayar = parseInt(this.value) || 0;
            const kembalian = bayar - total;
            if (bayar < total) {
                peringatanKurang.style.display = '';
                DOM.inputKembalian.value = 'Rp0';
            } else {
                peringatanKurang.style.display = 'none';
                DOM.inputKembalian.value = 'Rp' + kembalian.toLocaleString('id-ID');
            }
        });

        DOM.inputUangPembeli.addEventListener('input', updateButtonBayarStyle);

        document.getElementById('btnProsesBayarUtama').addEventListener('click', function() {
            const total = parseInt(DOM.totalBelanja.textContent.replace(/[^0-9]/g, '')) || 0;
            const bayar = parseInt(DOM.inputUangPembeli.value) || 0;
            if (bayar < total) {
                // Proses hutang (tampilkan modal hutang)
                prosesTransaksi('hutang', null);
            } else {
                // Proses lunas biasa
                prosesTransaksi('lunas', null);
            }
        });

    }

    function updateHargaPreview() {
        const produk = state.previewProduk;
        if (!produk) {
            DOM.previewHargaProduk.textContent = 'Rp0';
            return;
        }
        const satuan = DOM.previewSatuan.value;
        const harga = getHargaBySatuan(produk, satuan);
        const qty = parseInt(DOM.previewQty.value) || 1;
        const hargaTotal = harga * qty;
        DOM.previewHargaProduk.textContent = 'Rp' + hargaTotal.toLocaleString('id-ID');
    }

    async function loadProdukList() {
        try {
            const res = await fetch('/api/produk', {
                credentials: 'same-origin'
            });
            const data = await res.json();
            state.produkList = data.map(p => ({
                id: p.id,
                barcode: p.barcode_utama || '',
                barcodes: (p.barcodes || []).map(bc => bc.kode_barcode),
                nama: p.nama_produk,
                harga: p.harga_jual,
                satuan: [p.satuan, ...(p.konversi_satuan || []).map(k => k.satuan_besar)]
            }));
        } catch (e) {
            alert('Gagal memuat data produk');
        }
    }

    async function getNoTransaksiBaru() {
        try {
            const res = await fetch('/api/no-transaksi-baru', {
                credentials: 'same-origin',
            })
            const data = await res.json();
            document.getElementById('noTransaksi').value = data.no_transaksi;
        } catch (e) {
            document.getElementById('noTransaksi').value = 'TRX' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-ERR';
        }
    }

    function showAlert(message, type = 'warning', duration = 3000) {
        Swal.fire({
            icon: type,
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
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

    // Pada init():
    async function init() {
        await loadProdukList();
        await getNoTransaksiBaru();
        updateMiniPreview(null);
        renderKeranjang();
        setupEventListener();
    }

    // Jalankan inisialisasi
    init();
});
