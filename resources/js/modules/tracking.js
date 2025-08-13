import { ensureSwal, ensureBootstrap } from '../utils/vendors';

export async function init() {
    const swalP = ensureSwal().catch(() => null);
    const bootstrapP = ensureBootstrap().catch(() => null);

    let listReqAbort = null;
    let detailReqAbort = null;

    if (localStorage.getItem('loginSuccess') === '1') {
        swalP.then(Swal => {
            Swal?.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Login berhasil!',
                showConfirmButton: false,
                timer: 2000
            });
        }).finally(() => localStorage.removeItem('loginSuccess'));
    }

    // DOM
    const DOM = {
        table: {
            body: document.getElementById('trackingTableBody'),
            sortableHeaders: document.querySelectorAll('#trackingTable th[data-sort]')
        },
        pagination: document.getElementById('trackingPagination'),
        pageSize: document.getElementById('trackingPageSize'),
        filterAksi: document.getElementById('filterAksi'),
        filterStart: document.getElementById('filterStartDate'),
        filterEnd: document.getElementById('filterEndDate'),
        searchInput: document.getElementById('searchTrackingInput')
    };

    const state = {
        allTracking: [],
        viewData: [], // data setelah filter, sebelum paginasi
        currentSort: { field: 'created_at', direction: 'desc' }
    };

    // Toast helper
    async function showAlert(message, type = 'info', duration = 1600) {
        const Swal = await swalP;
        if (!Swal) { console[type === 'error' ? 'error' : 'log'](message); return; }
        return Swal.fire({
            toast: true,
            position: 'top-end',
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true
        });
    }

    // CSRF
    const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

    // Pagination
    const trackingPagination = {
        page: 1,
        pageSize: Number(DOM.pageSize?.value || 10)
    };

    // Parser angka aman (untuk tampilan keterangan)
    function toNumberSafe(val) {
        if (val == null) return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        const s = String(val).replace(/[^0-9-]/g, '');
        const n = parseInt(s || '0', 10);
        return isNaN(n) ? 0 : n;
    }

    // Komparator sorting (tanpa pin)
    function compareRows(a, b, sortField, direction) {
        let valA = a?.[sortField] ?? '';
        let valB = b?.[sortField] ?? '';
        if (sortField === 'created_at' || sortField === 'tanggal') {
            valA = a?._ts ?? (valA ? Date.parse(valA) : 0);
            valB = b?._ts ?? (valB ? Date.parse(valB) : 0);
        }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    }

    // Render table + pagination (sorting dipusatkan di sini)
    function renderTable() {
        const data = Array.isArray(state.viewData) && state.viewData.length ? state.viewData : state.allTracking;
        const sorted = [...data].sort((a, b) =>
            compareRows(a, b, state.currentSort.field, state.currentSort.direction)
        );

        const totalData = sorted.length;
        const totalPages = Math.max(1, Math.ceil(totalData / trackingPagination.pageSize));
        // Jaga current page tetap valid
        if (trackingPagination.page > totalPages) trackingPagination.page = totalPages;
        if (trackingPagination.page < 1) trackingPagination.page = 1;

        const startIdx = (trackingPagination.page - 1) * trackingPagination.pageSize;
        const endIdx = startIdx + trackingPagination.pageSize;
        const pagedData = sorted.slice(startIdx, endIdx);

        if (!Array.isArray(sorted) || sorted.length === 0) {
            DOM.table.body.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data tracking</td>
                </tr>
            `;
            renderTrackingPagination(1, 1);
            updateSortIcons();
            return;
        }

        DOM.table.body.innerHTML = pagedData.map((item) => {
            const tipe = item.tipe || '-';
            const statusLc = (item.status || '').toLowerCase();
            const status = tipe === 'Transaksi'
                ? (statusLc === 'lunas'
                    ? '<span class="badge bg-success w-100 text-center py-2 fs-6">Lunas</span>'
                    : '<span class="badge bg-warning text-dark w-100 text-center py-2 fs-6">Hutang</span>')
                : renderAksiBadge(item.status);

            const totalNom = toNumberSafe(item.total ?? 0);
            const hutangNom = toNumberSafe(item.hutang ?? 0);
            const infoHutangTotal = hutangNom > 0
                ? `hutang ${hutangNom.toLocaleString('id-ID')} total ${totalNom.toLocaleString('id-ID')}`
                : '';
            const ketCell = [item.keterangan, infoHutangTotal].filter(Boolean).join(' | ') || '-';

            const aksiBtn = tipe === 'Transaksi'
                ? `<button class="btn btn-sm btn-outline-info btn-detail-transaksi" title="Detail" data-id="${item.transaksi_id || ''}">
                        <i class="fas fa-eye"></i>
                   </button>`
                : '-';
            return `
                <tr>
                    <td>${formatDateTime(item.created_at)}</td>
                    <td>${tipe}</td>
                    <td>${item.pengguna || '-'}</td>
                    <td>${ketCell}</td>
                    <td class="pe-3" style="width: 120px;">${aksiBtn}</td>
                    <td>${status}</td>
                </tr>
            `;
        }).join('');

        renderTrackingPagination(totalPages, trackingPagination.page);
        updateSortIcons();
    }

    // Pagination UI
    function renderTrackingPagination(totalPages, currentPage) {
        if (!DOM.pagination) return;
        let html = '';

        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>`;

        // Batasi jumlah nomor halaman bila besar
        const maxPagesToShow = 7;
        let start = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let end = Math.min(totalPages, start + maxPagesToShow - 1);
        if (end - start + 1 < maxPagesToShow) {
            start = Math.max(1, end - maxPagesToShow + 1);
        }
        for (let i = start; i <= end; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
        </li>`;

        DOM.pagination.innerHTML = html;
    }

    // Error saat load
    function handleDataLoadError(error) {
        DOM.table.body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    GAGAL MEMUAT DATA: ${error.message}
                </td>
            </tr>
        `;
    }

    // Ikon sort header
    function updateSortIcons() {
        DOM.table.sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon2');
            if (!icon) return;
            if (header.getAttribute('data-sort') === state.currentSort.field) {
                icon.className = `fas fa-sort-${state.currentSort.direction === 'asc' ? 'up' : 'down'} sort-icon2 ms-1`;
            } else {
                icon.className = 'fas fa-sort sort-icon2 ms-1';
            }
        });
    }

    // Sort klik header
    function handleSort() {
        const sortField = this.getAttribute('data-sort');
        if (!sortField) return;
        if (state.currentSort.field === sortField) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.field = sortField;
            state.currentSort.direction = 'asc';
        }
        trackingPagination.page = 1;
        renderTable();
    }

    // Badge aksi non-transaksi
    function renderAksiBadge(status) {
        switch (status) {
            case 'Ditambahkan':
                return `<span class="badge bg-success w-100 text-center py-2 fs-6">Produk Baru</span>`;
            case 'Diedit':
                return `<span class="badge bg-warning text-dark w-100 text-center py-2 fs-6">Produk Update</span>`;
            case 'Produk Dihapus':
                return `<span class="badge bg-danger w-100 text-center py-2 fs-6">Hapus Produk</span>`;
            case 'Tambah Satuan':
                return `<span class="badge bg-info text-dark w-100 text-center py-2 fs-6">Satuan Baru</span>`;
            case 'Hapus Satuan':
                return `<span class="badge bg-secondary w-100 text-center py-2 fs-6">Hapus Satuan</span>`;
            case 'Tambah Diskon':
                return `<span class="badge bg-info text-dark w-100 text-center py-2 fs-6">Diskon Baru</span>`;
            case 'Hapus Diskon':
                return `<span class="badge bg-danger w-100 text-center py-2 fs-6">Hapus Diskon</span>`;
            case 'Tambah Barcode':
                return `<span class="badge bg-info text-dark w-100 text-center py-2 fs-6">Barcode Baru</span>`;
            case 'Hapus Barcode':
                return `<span class="badge bg-danger w-100 text-center py-2 fs-6">Hapus Barcode</span>`;
            default:
                return `<span class="badge bg-secondary w-100 text-center py-2 fs-6">${status || '-'}</span>`;
        }
    }

    // Format tanggal
    function formatDateTime(dt) {
        if (!dt) return '-';
        const dateObj = typeof dt === 'string' ? new Date(dt) : dt;
        if (isNaN(dateObj.getTime())) return '-';
        const d = dateObj.getDate().toString().padStart(2, '0');
        const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const y = dateObj.getFullYear();
        const h = dateObj.getHours().toString().padStart(2, '0');
        const min = dateObj.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${y} ${h}:${min}`;
    }

    // Load data dari API
    async function loadTrackingData(sortField = 'created_at', sortDirection = 'desc') {
        let ctrl;
        try {
            if (listReqAbort) { try { listReqAbort.abort(); } catch {} }
            ctrl = new AbortController();
            listReqAbort = ctrl;
            const res = await fetch(`/api/tracking?sort=${sortField}&order=${sortDirection}&_ts=${Date.now()}`, {
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-store'
                },
                signal: ctrl.signal
            });
            const raw = await res.text();
            const json = raw ? JSON.parse(raw) : {};
            state.allTracking = Array.isArray(json.data) ? json.data : [];
            state.allTracking.forEach(it => {
                const waktu = it.tanggal || it.created_at;
                const ts = waktu ? Date.parse(waktu) : 0;
                if (!Number.isNaN(ts)) it._ts = ts;
            });
            populateTrackingFilters(state.allTracking);
            trackingPagination.page = 1;
            applyTrackingFilter(false);
        } catch (error) {
            if (error?.name !== 'AbortError' && error !== 'aborted') {
                handleDataLoadError(error);
            }
        } finally {
            if (listReqAbort === ctrl) listReqAbort = null;
        }
    }

    // Filter dropdown tipe
    function populateTrackingFilters(data) {
        if (!DOM.filterAksi) return;
        const tipeSet = [...new Set(data.map(item => item.tipe).filter(Boolean))];
        DOM.filterAksi.innerHTML = `
            <option value="">Semua Tipe</option>
            ${tipeSet.map(tipe => `<option value="${tipe}">${tipe.charAt(0).toUpperCase() + tipe.slice(1)}</option>`).join('')}
        `;
    }

    // Terapkan filter
    function applyTrackingFilter(resetPage = true) {
        const tipe = DOM.filterAksi?.value || '';
        const startDate = DOM.filterStart?.value || '';
        const endDate = DOM.filterEnd?.value || '';
        const searchTerm = DOM.searchInput?.value?.toLowerCase() || '';

        let filtered = state.allTracking;

        if (tipe) {
            filtered = filtered.filter(item => (item.tipe || '').toLowerCase() === tipe.toLowerCase());
        }
        if (startDate) {
            const s = new Date(startDate);
            filtered = filtered.filter(item => {
                const waktu = item.tanggal || item.created_at;
                return waktu && new Date(waktu) >= s;
            });
        }
        if (endDate) {
            const e = new Date(endDate + 'T23:59:59');
            filtered = filtered.filter(item => {
                const waktu = item.tanggal || item.created_at;
                return waktu && new Date(waktu) <= e;
            });
        }
        if (searchTerm) {
            filtered = filtered.filter(item =>
                (item.no_transaksi || '').toLowerCase().includes(searchTerm) ||
                (item.pengguna || '').toLowerCase().includes(searchTerm) ||
                (item.keterangan || '').toLowerCase().includes(searchTerm)
            );
        }

        state.viewData = filtered;
        if (resetPage) trackingPagination.page = 1;
        renderTable();
    }

    // Event delegation untuk tombol detail
    DOM.table.body?.addEventListener('click', (e) => {
        const btn = e.target.closest?.('.btn-detail-transaksi');
        if (!btn) return;
        const transaksiId = btn.getAttribute('data-id');
        if (transaksiId) showTransaksiDetailModal(transaksiId);
    });

    // Bind sort header
    DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));

    // Bind filter dan search
    DOM.filterAksi?.addEventListener('change', () => applyTrackingFilter());
    DOM.filterStart?.addEventListener('change', () => applyTrackingFilter());
    DOM.filterEnd?.addEventListener('change', () => applyTrackingFilter());
    {
        const debounce = (fn, wait = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
        DOM.searchInput?.addEventListener('input', debounce(() => applyTrackingFilter(), 250));
    }

    // Pagination click
    DOM.pagination?.addEventListener('click', function(e) {
        const link = e.target.closest('a.page-link');
        if (!link) return;
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page'), 10);
        if (!isNaN(page) && page > 0) {
            trackingPagination.page = page;
            renderTable();
        }
    });

    // Page size change
    DOM.pageSize?.addEventListener('change', function() {
        trackingPagination.pageSize = parseInt(this.value, 10) || 10;
        trackingPagination.page = 1;
        renderTable();
    });

    // Load awal
    loadTrackingData();

    // Modal detail transaksi
    async function showTransaksiDetailModal(transaksiId) {
        try {
            if (detailReqAbort) { try { detailReqAbort.abort(); } catch {} }
            const ctrl = new AbortController();
            detailReqAbort = ctrl;
            const res = await fetch(`/api/transaksi/${transaksiId}`, {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Cache-Control': 'no-store' },
                signal: ctrl.signal
            });
            if (!res.ok) throw new Error('Transaksi tidak ditemukan');
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};

            const produkTable = `
                <div class="table-responsive">
                    <table class="table table-sm table-bordered mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Nama Produk</th>
                                <th class="text-end">Qty</th>
                                <th class="text-end">Harga</th>
                                <th class="text-end">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(data.details || []).map(d => `
                                <tr>
                                    <td>${d.nama_produk}</td>
                                    <td class="text-end">${d.qty}</td>
                                    <td class="text-end">Rp${Number(d.harga).toLocaleString('id-ID')}</td>
                                    <td class="text-end">Rp${Number(d.subtotal).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('modalDetailTransaksiBody').innerHTML = `
                <div class="row g-0">
                    <div class="col-12 col-md-5 border-end pe-md-4 mb-3 mb-md-0">
                        <div class="mb-2"><span class="text-muted small">ID</span><br><span class="fw-semibold">${data.id}</span></div>
                        <div class="mb-2"><span class="text-muted small">No Transaksi</span><br><span class="fw-semibold">${data.no_transaksi || '-'}</span></div>
                        <div class="mb-2"><span class="text-muted small">Tanggal</span><br><span>${data.tanggal ? formatDateTime(data.tanggal) : '-'}</span></div>
                        <div class="mb-2"><span class="text-muted small">Status</span><br>
                            <span class="badge ${data.status === 'lunas' ? 'bg-success' : 'bg-warning text-dark'}">
                                ${data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : '-'}
                            </span>
                        </div>
                        <div class="mb-2"><span class="text-muted small">Jumlah Hutang</span><br>
                            <span class="fw-bold text-danger">Rp${Number(data.hutang || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="mb-2"><span class="text-muted small">Total</span><br>
                            <span class="fw-bold text-success">Rp${Number(data.total || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="mb-2"><span class="text-muted small">Nama Pembeli</span><br><span>${data.nama_pembeli || '-'}</span></div>
                        <div class="mb-2"><span class="text-muted small">No HP</span><br><span>${data.no_hp || '-'}</span></div>
                        <div class="mb-2"><span class="text-muted small">Jatuh Tempo</span><br><span>${data.jatuh_tempo ? formatDateTime(data.jatuh_tempo) : '-'}</span></div>
                    </div>
                    <div class="col-12 col-md-7 ps-md-4">
                        <div class="mb-2 fw-semibold">Daftar Produk</div>
                        ${produkTable}
                    </div>
                </div>
            `;

            const footer = document.getElementById('modalDetailTransaksiFooter');
            footer.innerHTML = '';
            if ((data.status || '').toLowerCase() === 'hutang') {
                const btnLunas = document.createElement('button');
                btnLunas.className = 'btn btn-success me-auto';
                btnLunas.textContent = 'Ubah Hutang Menjadi Lunas';
                btnLunas.onclick = async () => {
                    btnLunas.disabled = true;
                    btnLunas.textContent = 'Memproses...';
                    try {
                        const res = await fetch(`/api/transaksi/${transaksiId}/lunas`, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRF-TOKEN': getCsrf(),
                                'Cache-Control': 'no-store'
                            }
                        });
                        const raw = await res.text();
                        let result; try { result = raw ? JSON.parse(raw) : {}; } catch { result = { success: false, message: raw }; }
                        if (!res.ok || result?.success !== true) {
                            const msg = extractError(result);
                            await showAlert('Gagal melunasi: ' + msg, 'error', 2200);
                            return;
                        }
                        await showAlert('Transaksi berhasil dilunasi!', 'success', 1600);
                        await loadTrackingData(state.currentSort.field, state.currentSort.direction);

                        const idStr = String(transaksiId);
                        state.allTracking.forEach(it => {
                           if (String(it.transaksi_id) === idStr) {
                               it.status = 'lunas';
                               it.hutang = 0;
                           }
                        });
                       applyTrackingFilter(false);

                        const modalEl = document.getElementById('modalDetailTransaksi');
                        const b = window.bootstrap || await bootstrapP;
                        b?.Modal.getOrCreateInstance(modalEl)?.hide();
                    } catch (e) {
                        await showAlert('Terjadi kesalahan!', 'error', 2000);
                    } finally {
                        btnLunas.disabled = false;
                        btnLunas.textContent = 'Ubah Hutang Menjadi Lunas';
                    }
                };
                footer.appendChild(btnLunas);
            }

            const btnTutup = document.createElement('button');
            btnTutup.className = 'btn btn-secondary';
            btnTutup.setAttribute('data-bs-dismiss', 'modal');
            btnTutup.textContent = 'Tutup';
            footer.appendChild(btnTutup);

            const modalEl = document.getElementById('modalDetailTransaksi');
            const b = window.bootstrap || await bootstrapP;
            b?.Modal.getOrCreateInstance(modalEl)?.show();
        } catch (e) {
            if (e?.name !== 'AbortError' && e !== 'aborted') {
                await showAlert('Gagal memuat detail transaksi', 'error', 2000);
            }
        } finally {
             detailReqAbort = null;
         }
    }

    function extractError(payload) {
        if (!payload) return 'Tidak diketahui';
        if (payload.message) return payload.message;
        if (payload.errors) {
            const first = Object.values(payload.errors)[0];
            if (Array.isArray(first) && first[0]) return first[0];
        }
        if (typeof payload === 'string') return payload.slice(0, 200);
        return 'Tidak diketahui';
    }
}
