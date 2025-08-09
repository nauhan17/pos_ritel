document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('loginSuccess') === '1') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Login berhasil!',
            showConfirmButton: false,
            timer: 2000
        });
        localStorage.removeItem('loginSuccess');
    }
    // DOM: Menyimpan referensi elemen tabel dan header sortable
    const DOM = {
        table: {
            body: document.getElementById('trackingTableBody'),
            sortableHeaders: document.querySelectorAll('#trackingTable th[data-sort]')
        }
    };

    // State: Menyimpan data tracking dan status sort
    const state = {
        allTracking: [],
        currentSort: { field: 'created_at', direction: 'desc' }
    };

    // Pagination: Menyimpan halaman dan jumlah data per halaman
    const trackingPagination = {
        page: 1,
        pageSize: 10
    };

    // Fungsi untuk memuat data tracking dari API, lalu render tabel dan update filter/sort
    async function loadTrackingData(sortField = 'created_at', sortDirection = 'desc') {
        try {
            const res = await fetch(`/api/tracking?sort=${sortField}&order=${sortDirection}`,{
                credentials: 'same-origin'
            });
            const json = await res.json();
            state.allTracking = json.data || [];
            renderTable(state.allTracking);
            updateSortIcons();
            populateTrackingFilters(state.allTracking);
        } catch (error) {
            handleDataLoadError(error);
        }
    }

    // Fungsi untuk menampilkan pesan error jika gagal load data
    function handleDataLoadError(error) {
        DOM.table.body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    GAGAL MEMUAT DATA: ${error.message}
                </td>
            </tr>
        `;
    }

    // --- PERBAIKAN SORT HEADER ---
    // Pastikan icon sort pada header punya class 'sort-icon2' sesuai HTML
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

    // Event handler untuk sorting tabel saat header diklik
    function handleSort() {
        const sortField = this.getAttribute('data-sort');
        if (state.currentSort.field === sortField) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.field = sortField;
            state.currentSort.direction = 'asc';
        }
        // Reset ke halaman 1 setiap sorting
        trackingPagination.page = 1;
        // Sorting dilakukan di frontend (jika data sudah di-load)
        const sorted = [...state.allTracking].sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            // Jika field waktu, urutkan sebagai tanggal
            if (sortField === 'created_at' || sortField === 'tanggal') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            if (valA < valB) return state.currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return state.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
        renderTable(sorted);
        updateSortIcons();
    }

    // Fungsi untuk menampilkan badge status aksi pada tabel tracking
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

    // Fungsi untuk merender isi tabel tracking beserta pagination
    function renderTable(data) {
        // Pagination
        const totalData = data.length;
        const totalPages = Math.ceil(totalData / trackingPagination.pageSize);
        const startIdx = (trackingPagination.page - 1) * trackingPagination.pageSize;
        const endIdx = startIdx + trackingPagination.pageSize;
        const pagedData = data.slice(startIdx, endIdx);

        if (!Array.isArray(data) || data.length === 0) {
            DOM.table.body.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada data tracking</td>
                </tr>
            `;
            return;
        }
        DOM.table.body.innerHTML = pagedData.map((item, idx) => {
            const tipe = item.tipe || '-';
            const status = tipe === 'Transaksi'
                ? (item.status === 'Lunas'
                    ? '<span class="badge bg-success w-100 text-center py-2 fs-6">Lunas</span>'
                    : '<span class="badge bg-warning text-dark w-100 text-center py-2 fs-6">Hutang</span>')
                : renderAksiBadge(item.status);
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
                    <td>${item.keterangan || '-'}</td>
                    <td class="pe-3" style="width: 120px;">${aksiBtn}</td>
                    <td>${status}</td>
                </tr>
            `;
        }).join('');
        renderTrackingPagination(totalPages, trackingPagination.page);

        // Event: tombol detail transaksi
        document.querySelectorAll('.btn-detail-transaksi').forEach(btn => {
            btn.addEventListener('click', function() {
                const transaksiId = this.getAttribute('data-id');
                if (transaksiId) showTransaksiDetailModal(transaksiId);
            });
        });
    }

    // Fungsi untuk menampilkan modal detail transaksi berdasarkan ID
    async function showTransaksiDetailModal(transaksiId) {
        try {
            const res = await fetch(`/api/transaksi/${transaksiId}`);
            if (!res.ok) throw new Error('Transaksi tidak ditemukan');
            const data = await res.json();

            // Format produk dalam bentuk tabel
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

            // Isi modal dengan detail transaksi
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
                        ${data.status === 'hutang' ? `
                        <div class="mb-2"><span class="text-muted small">Jumlah Hutang</span><br>
                            <span class="fw-bold text-danger">Rp${Number(data.hutang || 0).toLocaleString('id-ID')}</span>
                        </div>
                        ` : `
                        <div class="mb-2"><span class="text-muted small">Total</span><br>
                            <span class="fw-bold text-success">Rp${Number(data.total || 0).toLocaleString('id-ID')}</span>
                        </div>
                        `}
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

            // Footer modal: tombol lunasi hutang jika status hutang
            const footer = document.getElementById('modalDetailTransaksiFooter');
            footer.innerHTML = '';
            if (data.status === 'hutang') {
                const btnLunas = document.createElement('button');
                btnLunas.className = 'btn btn-success me-auto';
                btnLunas.textContent = 'Ubah Hutang Menjadi Lunas';
                btnLunas.onclick = async function() {
                    btnLunas.disabled = true;
                    btnLunas.textContent = 'Memproses...';
                    try {
                        const res = await fetch(`/api/transaksi/${transaksiId}/lunas`, {
                            method: 'POST',
                            headers: {
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                                'Accept': 'application/json'
                            }
                        });
                        const result = await res.json();
                        if (result.success) {
                            footer.innerHTML = '<span class="text-success me-auto">Status berhasil diubah menjadi lunas.</span>';
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: 'Transaksi berhasil dilunasi!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                            await loadTrackingData();
                        } else {
                            footer.innerHTML = '<span class="text-danger me-auto">Gagal mengubah status.</span>';
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'error',
                                title: 'Gagal melunasi transaksi!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        }
                    } catch (e) {
                        footer.innerHTML = '<span class="text-danger me-auto">Terjadi kesalahan.</span>';
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'error',
                            title: 'Terjadi kesalahan server!',
                            showConfirmButton: false,
                            timer: 2000
                        });
                    }
                };
                footer.appendChild(btnLunas);
            }
            const btnTutup = document.createElement('button');
            btnTutup.className = 'btn btn-secondary';
            btnTutup.setAttribute('data-bs-dismiss', 'modal');
            btnTutup.textContent = 'Tutup';
            footer.appendChild(btnTutup);

            const modal = new bootstrap.Modal(document.getElementById('modalDetailTransaksi'));
            modal.show();
        } catch (e) {
            alert('Gagal memuat detail transaksi: ' + e.message);
        }
    }

    // Fungsi untuk merender pagination pada tabel tracking
    function renderTrackingPagination(totalPages, currentPage) {
        const paginationEl = document.getElementById('trackingPagination');
        if (!paginationEl) return;
        let html = '';

        // Tombol previous
        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>`;

        // Nomor halaman
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // Tombol next
        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
        </li>`;

        paginationEl.innerHTML = html;
    }

    // Fungsi untuk setup event filter tanggal
    function setupDateFilter() {
        const startInput = document.getElementById('filterStartDate');
        const endInput = document.getElementById('filterEndDate');

        startInput.addEventListener('change', applyDateFilter);
        endInput.addEventListener('change', applyDateFilter);
    }

    // Fungsi untuk filter data tracking berdasarkan tanggal dan aksi
    async function applyDateFilter() {
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;
        const aksi = document.getElementById('filterAksi').value;
        let url = `/api/tracking?sort=${state.currentSort.field}&order=${state.currentSort.direction}`;

        if (startDate) url += `&start=${startDate}`;
        if (endDate) url += `&end=${endDate}`;
        if (aksi) url += `&aksi=${aksi}`;

        try {
            const res = await fetch(url, {
                credentials: 'same-origin'
            });
            const json = await res.json();
            state.allTracking = json.data || [];
            renderTable(state.allTracking);
            updateSortIcons();
        } catch (error) {
            handleDataLoadError(error);
        }
    }

    // Fungsi untuk mengisi filter aksi/tipe pada dropdown filter
    function populateTrackingFilters(data) {
        const aksiInput = document.getElementById('filterAksi');
        const tipeSet = [...new Set(data.map(item => item.tipe).filter(Boolean))];
        aksiInput.innerHTML = `
            <option value="">Semua Tipe</option>
            ${tipeSet.map(tipe => `<option value="${tipe}">${tipe.charAt(0).toUpperCase() + tipe.slice(1)}</option>`).join('')}
        `;
    }

    // --- PERBAIKAN FILTER WAKTU ---
    // Fungsi untuk filter data tracking berdasarkan tipe, tanggal, dan pencarian
    function applyTrackingFilter() {
        const tipe = document.getElementById('filterAksi').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;
        const searchTerm = document.getElementById('searchTrackingInput')?.value?.toLowerCase() || '';

        let filtered = state.allTracking;

        if (tipe) {
            filtered = filtered.filter(item => (item.tipe || '').toLowerCase() === tipe.toLowerCase());
        }
        if (startDate) {
            filtered = filtered.filter(item => {
                const waktu = item.tanggal || item.created_at;
                return waktu && new Date(waktu) >= new Date(startDate);
            });
        }
        if (endDate) {
            filtered = filtered.filter(item => {
                const waktu = item.tanggal || item.created_at;
                // Filter sampai akhir hari
                return waktu && new Date(waktu) <= new Date(endDate + 'T23:59:59');
            });
        }
        if (searchTerm) {
            filtered = filtered.filter(item =>
                (item.no_transaksi || '').toLowerCase().includes(searchTerm) ||
                (item.pengguna || '').toLowerCase().includes(searchTerm) ||
                (item.keterangan || '').toLowerCase().includes(searchTerm)
            );
        }

        // Sorting setelah filter
        const sortField = state.currentSort.field;
        const sortDir = state.currentSort.direction;
        filtered = [...filtered].sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            if (sortField === 'created_at' || sortField === 'tanggal') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        renderTable(filtered);
        updateSortIcons && updateSortIcons();
    }

    // --- EVENT BINDING ---
    // Pastikan event header sortable sudah terpasang
    DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));

    // Event: filter dan sort
    document.getElementById('filterAksi').addEventListener('change', applyTrackingFilter);
    document.getElementById('filterStartDate')?.addEventListener('change', applyTrackingFilter);
    document.getElementById('filterEndDate')?.addEventListener('change', applyTrackingFilter);
    document.getElementById('searchTrackingInput').addEventListener('input', applyTrackingFilter);

    // Event: pagination
    document.getElementById('trackingPagination').addEventListener('click', function(e) {
        e.preventDefault();
        const page = parseInt(e.target.getAttribute('data-page'));
        if (!isNaN(page) && page > 0) {
            trackingPagination.page = page;
            renderTable(state.allTracking);
        }
    });

    // Event: ganti page size
    document.getElementById('trackingPageSize').addEventListener('change', function() {
        trackingPagination.pageSize = parseInt(this.value);
        trackingPagination.page = 1;
        renderTable(state.allTracking);
    });

    // Load data tracking pertama kali saat halaman siap
    loadTrackingData();
});

// Fungsi untuk format tanggal dan waktu ke format lokal Indonesia
function formatDateTime(dt) {
    if (!dt) return '-';
    const dateObj = typeof dt === 'string' ? new Date(dt) : dt;
    if (isNaN(dateObj.getTime())) return '-';
    // Format: dd/mm/yyyy hh:mm
    const d = dateObj.getDate().toString().padStart(2, '0');
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    const h = dateObj.getHours().toString().padStart(2, '0');
    const min = dateObj.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
}
