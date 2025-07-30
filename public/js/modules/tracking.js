document.addEventListener('DOMContentLoaded', function() {
    const DOM = {
        table: {
            body: document.getElementById('trackingTableBody'),
            sortableHeaders: document.querySelectorAll('#trackingTable th[data-sort]')
        }
    };

    const state = {
        allTracking: [],
        currentSort: { field: 'created_at', direction: 'desc' }
    };

    const trackingPagination = {
        page: 1,
        pageSize: 10
    };

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
            // Jangan panggil applyTrackingFilter di sini!
        } catch (error) {
            handleDataLoadError(error);
        }
    }

    function handleDataLoadError(error) {
        DOM.table.body.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    GAGAL MEMUAT DATA: ${error.message}
                </td>
            </tr>
        `;
    }

    function handleSort() {
        const sortField = this.getAttribute('data-sort');
        if (state.currentSort.field === sortField) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.field = sortField;
            state.currentSort.direction = 'asc';
        }
        loadTrackingData(state.currentSort.field, state.currentSort.direction);
        updateSortIcons();
    }

    function updateSortIcons() {
        DOM.table.sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (!icon) return;
            if (header.getAttribute('data-sort') === state.currentSort.field) {
                icon.className = `fas fa-sort-${state.currentSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    function renderAksiBadge(aksi) {
        switch (aksi) {
            case 'tambah_produk':
                return `<span class="badge bg-success d-block text-center">PRODUK BARU</span>`;
            case 'edit_produk':
                return `<span class="badge bg-warning text-dark d-block text-center">EDIT PRODUK</span>`;
            case 'tambah_barcode':
                return `<span class="badge bg-success d-block text-center">TAMBAH BARCODE</span>`;
            case 'hapus_barcode':
                return `<span class="badge bg-danger d-block text-center">HAPUS BARCODE</span>`;
            case 'tambah_satuan':
                return `<span class="badge bg-success d-block text-center">TAMBAH SATUAN</span>`;
            case 'hapus_satuan':
                return `<span class="badge bg-danger d-block text-center">HAPUS SATUAN</span>`;
            case 'tambah_diskon':
                return `<span class="badge bg-success d-block text-center">TAMBAH DISKON</span>`;
            case 'hapus_diskon':
                return `<span class="badge bg-danger d-block text-center">HAPUS DISKON</span>`;
            case 'hapus_produk':
                return `<span class="badge bg-danger d-block text-center">HAPUS PRODUK</span>`;
            case 'lunas':
                return `<span class="badge bg-success d-block text-center">TRANSAKSI LUNAS</span>`;
            case 'hutang':
                return `<span class="badge bg-danger d-block text-center">TRANSAKSI HUTANG</span>`;
            default:
                return `<span class="badge bg-secondary d-block text-center">${aksi}</span>`;
        }
    }

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
                    <td colspan="7" class="text-center">Tidak ada data tracking</td>
                </tr>
            `;
            return;
        }
        DOM.table.body.innerHTML = pagedData.map((item, idx) => `
            <tr>
                <td>${item.produk ? item.produk.nama_produk : (item.nama_produk || '-')}</td>
                <td class="pe-3" style="width: 150px;">${renderAksiBadge(item.aksi)}</td>
                <td>${item.keterangan || '-'}</td>
                <td>${item.pengguna || '-'}</td>
                <td>${formatDateTime(item.created_at)}</td>
            </tr>
        `).join('');

        renderTrackingPagination(totalPages, trackingPagination.page);
    }

    function renderTrackingPagination(totalPages, currentPage) {
        const paginationEl = document.getElementById('trackingPagination');
        if (!paginationEl) return;
        let html = '';

        // Previous button
        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
        </li>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // Next button
        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
        </li>`;

        paginationEl.innerHTML = html;
    }

    function setupDateFilter() {
        const startInput = document.getElementById('filterStartDate');
        const endInput = document.getElementById('filterEndDate');

        startInput.addEventListener('change', applyDateFilter);
        endInput.addEventListener('change', applyDateFilter);
    }

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


    function populateTrackingFilters(data) {
        // Populate aksi filter
        const aksiInput = document.getElementById('filterAksi');
        const aksiSet = [...new Set(data.map(item => item.aksi).filter(Boolean))];
        aksiInput.innerHTML = `
            <option value="">Semua Aksi</option>
            ${aksiSet.map(aksi => `<option value="${aksi}">${aksi.charAt(0).toUpperCase() + aksi.slice(1)}</option>`).join('')}
        `;
    }

    function applyTrackingFilter() {
        const aksi = document.getElementById('filterAksi').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        let filtered = state.allTracking;

        if (aksi) {
            filtered = filtered.filter(item => item.aksi === aksi);
        }
        if (startDate) {
            filtered = filtered.filter(item => item.created_at >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(item => item.created_at <= endDate + ' 23:59:59');
        }

        renderTable(filtered);
        updateSortIcons && updateSortIcons();
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleString('id-ID');
        } catch (e) {
            return dateString;
        }
    }

    setupDateFilter();

    // Event sort table header
    document.getElementById('filterAksi').addEventListener('change', applyTrackingFilter);
    document.getElementById('filterStartDate')?.addEventListener('change', applyTrackingFilter);
    document.getElementById('filterEndDate')?.addEventListener('change', applyTrackingFilter);
    DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));


    document.getElementById('trackingPagination').addEventListener('click', function(e) {
        e.preventDefault();
        const page = parseInt(e.target.getAttribute('data-page'));
        if (!isNaN(page) && page > 0) {
            trackingPagination.page = page;
            renderTable(state.allTracking);
        }
    });

    document.getElementById('trackingPageSize').addEventListener('change', function() {
        trackingPagination.pageSize = parseInt(this.value);
        trackingPagination.page = 1;
        renderTable(state.allTracking);
    });

    loadTrackingData();
});
