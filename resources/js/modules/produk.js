import { ensureSwal, ensureBootstrap, ensureXLSX, ensureJsPDF, ensureAutoTable, ensureJsBarcode } from '../utils/vendors';

export async function init() {
    const swalP = ensureSwal().catch(() => null);
    const bootstrapP = ensureBootstrap().catch(() => null);

    if (localStorage.getItem('loginSuccess') === '1') {
        swalP.then((Swal) => {
            if (!Swal) return;
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success',
                title: 'Login berhasil!', showConfirmButton: false, timer: 2000
            });
        }).finally(() => localStorage.removeItem('loginSuccess'));
    }

    const DOM = {
        meta: { csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || '' },
        table: {
            body: document.getElementById('tableBody'),
            selectAll: document.getElementById('selectAll'),
            sortableHeaders: document.querySelectorAll('.sortable')
        },
        modals: {
            getBaru() {
                const el = document.getElementById('baruProdukModal');
                return el ? bootstrap.Modal.getOrCreateInstance(el) : null;
            },
            getHapus() {
                const el = document.getElementById('hapusProdukModal');
                return el ? bootstrap.Modal.getOrCreateInstance(el) : null;
            }
        },
        filters: {
            kategori: document.getElementById('kategoriFilter'),
            supplier: document.getElementById('supplierFilter'),
        }
    };

    // Wajib: jika tidak ada tabel di halaman ini, hentikan
    if (!DOM.table.body) return;

    // STATE
    const state = {
        currentSort: { field: 'nama_produk', direction: 'asc' },
        totals: { produk: 0, stok: 0, modal: 0, nilaiProduk: 0 },
        allProducts: [],
        isEditMode: false,
        selectedProduk: [],
        newProduct: { barcodes: [], konversiSatuan: [], diskon: [] },
        currentStep: 1,
        maxStep: 3,
        productDrafts: {}
    };

    const pagination = { page: 1, pageSize: 10 };

    // =============== INIT ===============
    function startProduk() {
        loadData(state.currentSort.field, state.currentSort.direction);
        setupEventListeners();
    }

    function setupEventListeners() {
        if (window.produkEventListenersAttached) return;

        document.addEventListener('click', function (e) {
            if (e.target.closest('#tableBody')) handleTableClick(e);
            if (e.target.closest('#produkPagination')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (!isNaN(page) && page > 0) {
                    pagination.page = page;
                    performSimpleSearch();
                }
            }
        });

        document.getElementById('produkPageSize')?.addEventListener('change', function (e) {
            pagination.pageSize = parseInt(e.target.value);
            pagination.page = 1;
            performSimpleSearch();
        });

        document.addEventListener('change', function (e) {
            if (e.target.classList.contains('row-checkbox')) handleRowCheckboxChange(e.target);
        });

        const debounced = debounce(performSimpleSearch, 120);
        document.getElementById('searchProdukInput')?.addEventListener('input', debounced);

        // Export
        document.getElementById('exportExcelBtn')?.addEventListener('click', onExportXlsx);
        document.getElementById('exportPdfBtn')?.addEventListener('click', onExportPdf);

        // Sort & Filter
        DOM.table.sortableHeaders.forEach(h => h.addEventListener('click', handleSort));
        DOM.filters.kategori?.addEventListener('change', performSimpleSearch);
        DOM.filters.supplier?.addEventListener('change', performSimpleSearch);
        DOM.table.selectAll?.addEventListener('change', handleSelectedRow);

        // Aksi
        document.getElementById('baruProdukBtn')?.addEventListener('click', async () => { await initializeProductModal(); });
        document.getElementById('saveProductBtn')?.addEventListener('click', saveCompleteProduct);
        document.getElementById('hapusProdukBtn')?.addEventListener('click', deleteSelected);

        // Modal tambah produk
        const modalElement = document.getElementById('baruProdukModal');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', () => { setupModalEventListeners(); });
            modalElement.addEventListener('hidden.bs.modal', () => {
                state.newProduct = { barcodes: [], konversiSatuan: [], diskon: [] };
                const form = document.getElementById('formTambahProduk');
                form?.reset();
                form?.querySelectorAll('input').forEach(i => { i.value = ''; i.removeAttribute('value'); });
            });
        }

        // Edit mode
        document.getElementById('editTableBtn')?.addEventListener('click', enterEditMode);
        document.getElementById('exitEditModeBtn')?.addEventListener('click', exitEditMode);

        // Restok / Retur
        document.getElementById('restokProdukBtn')?.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!state.selectedProduk?.length) return Swal.fire('Pilih Produk!', 'Pilih produk terlebih dulu.', 'warning');
            showRestokModal();
            const el = document.getElementById('restokProdukModal');
            const b = window.bootstrap || await bootstrapP;
            const m = (el && b) ? b.Modal.getOrCreateInstance(el) : null;
            m?.show();
        });
        document.getElementById('returProdukBtn')?.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!state.selectedProduk?.length) return Swal.fire('Pilih Produk!', 'Pilih produk terlebih dulu.', 'warning');
            showReturModal();
            const el = document.getElementById('returProdukModal');
            const b = window.bootstrap || await bootstrapP;
            const m = (el && b) ? b.Modal.getOrCreateInstance(el) : null;
            m?.show();
        });

        if (DOM.table.body && !DOM.table.body.dataset.tooltipBound) {
            DOM.table.body.addEventListener('mouseover', async (ev) => {
                const el = ev.target.closest('[data-bs-toggle="tooltip"]');
                if (!el || el._tooltip) return;
                const b = window.bootstrap || await bootstrapP;
                if (!b) return;
                try { el._tooltip = new b.Tooltip(el); } catch { }
            });
            DOM.table.body.dataset.tooltipBound = '1';
        }
        DOM.table.body?.addEventListener('change', (ev) => {
            const select = ev.target.closest('.satuan-table-select');
            if (select) handleSatuanSelectChange(select);
        });

        // Cleanup backdrop saat modal close
        document.getElementById('restokProdukModal')?.addEventListener('hidden.bs.modal', cleanupBackdrop);
        document.getElementById('returProdukModal')?.addEventListener('hidden.bs.modal', cleanupBackdrop);

        window.produkEventListenersAttached = true;
    }

    // =============== DATA LOAD/FILTER ===============
    async function loadData(sortField, sortDirection) {
        try {
            const response = await fetch(`/api/produk?sort=${encodeURIComponent(sortField)}&order=${encodeURIComponent(sortDirection)}`, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('Gagal memuat data');
            const produkList = await response.json();
            state.allProducts = Array.isArray(produkList) ? produkList : [];
            renderTable(state.allProducts);
            updateTotals(state.allProducts);
            populateFilters(state.allProducts);
        } catch (error) {
            console.error('Error:', error);
            DOM.table.body.innerHTML = `<tr><td colspan="11" class="text-center text-danger">GAGAL MEMUAT DATA: ${error.message}</td></tr>`;
        }
    }

    function getCurrentFilteredData() {
        const q = (document.getElementById('searchProdukInput')?.value || '').toLowerCase();
        const kat = DOM.filters.kategori?.value || '';
        const sup = DOM.filters.supplier?.value || '';
        return state.allProducts.filter(p => {
            const okQ = !q || [p.nama_produk, p.kategori, p.supplier].some(v => (v || '').toLowerCase().includes(q));
            const okK = !kat || (p.kategori || '') === kat;
            const okS = !sup || (p.supplier || '') === sup;
            return okQ && okK && okS;
        });
    }

    function populateFilters(data) {
        const kategoriSet = new Set();
        const supplierSet = new Set();
        data.forEach(p => {
            if (p.kategori) kategoriSet.add(p.kategori);
            if (p.supplier) supplierSet.add(p.supplier);
        });
        if (DOM.filters.kategori) {
            const curr = DOM.filters.kategori.value;
            DOM.filters.kategori.innerHTML = `<option value="">Semua Kategori</option>` + [...kategoriSet].map(k => `<option ${k === curr ? 'selected' : ''} value="${k}">${k}</option>`).join('');
        }
        if (DOM.filters.supplier) {
            const curr = DOM.filters.supplier.value;
            DOM.filters.supplier.innerHTML = `<option value="">Semua Supplier</option>` + [...supplierSet].map(s => `<option ${s === curr ? 'selected' : ''} value="${s}">${s}</option>`).join('');
        }
    }

    function performSimpleSearch() {
        const filteredData = getCurrentFilteredData();
        renderTable(filteredData);
        updateTotals(filteredData);
        const pageSizeSelect = document.getElementById('produkPageSize');
        if (pageSizeSelect && pageSizeSelect.value != pagination.pageSize) pageSizeSelect.value = pagination.pageSize;
    }

    // =============== RENDER TABEL/PAGINATION ===============
    function renderTable(data) {
        if (!Array.isArray(data) || data.length === 0) {
            DOM.table.body.innerHTML = `<tr><td colspan="11" class="text-center text-muted py-4">TIDAK ADA DATA</td></tr>`;
            renderPagination(0, 1);
            return;
        }

        const totalPages = Math.ceil(data.length / pagination.pageSize);
        if (pagination.page > totalPages) pagination.page = totalPages;
        if (pagination.page < 1) pagination.page = 1;
        const startIdx = (pagination.page - 1) * pagination.pageSize;
        const endIdx = startIdx + pagination.pageSize;
        const pagedData = data.slice(startIdx, endIdx);
        const selectedIds = new Set(state.selectedProduk.map(p => p.id));

        function getStokBySatuan(stokPcs, satuan, satuanDasar, konversiObj) {
            if (satuan === satuanDasar) return stokPcs;
            const konversi = Number(konversiObj[satuan]);
            if (konversi && konversi > 0) return Math.floor(stokPcs / konversi);
            return 0;
        }

        const rows = pagedData.map(item => {
            const isSelected = selectedIds.has(item.id);

            // Barcode
            let barcodeText = '';
            if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
                const utama = item.barcodes.find(b => b.is_utama);
                const mainBarcode = utama ? utama.kode_barcode : item.barcodes[0].kode_barcode;
                if (item.barcodes.length === 1) {
                    barcodeText = `<span>${mainBarcode}</span>`;
                } else {
                    const otherBarcodes = item.barcodes
                        .filter(b => (utama ? b.kode_barcode !== utama.kode_barcode : b !== item.barcodes[0]))
                        .map(b => b.kode_barcode)
                        .join('<br>');
                    barcodeText = `
                        <span>${mainBarcode}</span>
                        <span class="badge bg-info ms-1" data-bs-toggle="tooltip" data-bs-html="true" title="${otherBarcodes}">1+</span>
                    `;
                }
            } else {
                barcodeText = '<span class="text-muted">-</span>';
            }

            // Diskon
            let diskonText = '';
            if (Array.isArray(item.diskon) && item.diskon.length > 0) {
                if (item.diskon.length === 1) {
                    diskonText = `<span class="badge bg-success">${item.diskon[0].diskon}%</span>`;
                } else {
                    const sortedDiskon = [...item.diskon].sort((a, b) => b.diskon - a.diskon);
                    const maxDiskon = sortedDiskon[0].diskon;
                    const otherDiskon = sortedDiskon.slice(1).map(d => `${d.diskon}%`).join('<br>');
                    diskonText = `
                        <span class="badge bg-success">${maxDiskon}%</span>
                        <span class="badge bg-info ms-1" data-bs-toggle="tooltip" data-bs-html="true" title="${otherDiskon}">1+</span>
                    `;
                }
            } else {
                diskonText = '<span class="text-muted">-</span>';
            }

            // Satuan list + konversi
            let satuanList = [item.satuan || ''];
            const konversiObj = {};
            if (Array.isArray(item.konversi_satuan)) {
                satuanList = satuanList.concat(item.konversi_satuan.map(k => k.satuan_besar));
                item.konversi_satuan.forEach(k => { konversiObj[k.satuan_besar] = Number(k.konversi) || 0; });
            }
            satuanList = [...new Set(satuanList.filter(Boolean))];

            // Harga beli & jual
            let hargaBeli = item.harga_beli || 0;
            let hargaJual = item.harga_jual || 0;
            if (Array.isArray(item.multi_harga) && item.multi_harga.length > 0) {
                const hargaSatuan = item.multi_harga.find(h => h.satuan === item.satuan);
                if (hargaSatuan) {
                    hargaBeli = hargaSatuan.harga_beli || hargaBeli;
                    hargaJual = hargaSatuan.harga_jual || hargaJual;
                }
            }

            // Dropdown satuan
            let multiHarga = Array.isArray(item.multi_harga) ? item.multi_harga : [];
            let satuanDasar = item.satuan;
            let enabledSatuan = multiHarga.length > 1 ? satuanList : [satuanDasar];

            let satuanCell;
            if (satuanList.length > 1) {
                satuanCell = `
                    <select class="form-select form-select-sm satuan-table-select" data-id="${item.id}">
                        ${satuanList.map(s => `<option value="${s}" ${enabledSatuan.includes(s) ? '' : 'disabled'}>${s}</option>`).join('')}
                    </select>
                `;
            } else {
                satuanCell = satuanList[0] || '';
            }

            // Stok
            const satuanTerpilih = satuanDasar;
            const stokTampil = getStokBySatuan(item.stok || 0, satuanTerpilih, satuanDasar, konversiObj);
            const stokBadge = stokTampil <= 10
                ? `<span class="badge bg-danger">${stokTampil}</span>`
                : `<span class="badge bg-secondary">${stokTampil}</span>`;

            return `
                <tr data-id="${item.id}">
                    <td class="text-center"><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}></td>
                    <td class="editable-cell" data-field="nama_produk">${item.nama_produk || ''}</td>
                    <td>${barcodeText}</td>
                    <td class="editable-cell" data-field="kategori">${item.kategori || ''}</td>
                    <td class="editable-cell" data-field="supplier">${item.supplier || ''}</td>
                    <td>${satuanCell}</td>
                    <td class="editable-cell stok-cell" data-field="stok">${stokBadge}</td>
                    <td class="editable-cell harga-beli-cell" data-field="harga_beli">${formatCurrency(hargaBeli)}</td>
                    <td class="editable-cell harga-jual-cell" data-field="harga_jual">${formatCurrency(hargaJual)}</td>
                    <td>${diskonText}</td>
                    <td>${formatRelativeDate(item.updated_at)}</td>
                </tr>
            `;
        });

        DOM.table.body.innerHTML = rows.join('');
        renderPagination(totalPages, pagination.page);
        updatePaginationInfo(data.length, startIdx + 1, Math.min(endIdx, data.length));
    }

    function updatePaginationInfo(totalData, startItem, endItem) {
        const infoElement = document.getElementById('paginationInfo');
        if (infoElement) infoElement.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalData} data`;
    }

    function renderPagination(totalPages, currentPage) {
        const paginationEl = document.getElementById('produkPagination');
        if (!paginationEl || totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        let html = '';
        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1"' : ''}><i class="fas fa-chevron-left"></i></a>
        </li>`;

        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        if (currentPage <= 3) endPage = Math.min(5, totalPages);
        if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1"' : ''}><i class="fas fa-chevron-right"></i></a>
        </li>`;
        paginationEl.innerHTML = html;
    }

    // =============== SAVE INLINE ===============
    async function saveCellEdit(cell) {
        const row = cell.closest('tr');
        const produkId = row.dataset.id;
        const field = cell.dataset.field;
        let newValue = cell.textContent.trim();

        const originalProduct = state.allProducts.find(p => p.id == produkId);
        if (!originalProduct) {
            await Swal.fire({ title: 'Error!', text: 'Produk tidak ditemukan', icon: 'error', confirmButtonText: 'OK' });
            return;
        }
        if (String(originalProduct[field] ?? '') === newValue) return;

        try {
            cell.style.backgroundColor = '#fff3cd';

            const updateData = {};
            switch (field) {
                case 'stok': {
                    const stokMatch = newValue.match(/\d+/);
                    updateData[field] = stokMatch ? parseInt(stokMatch[0]) : 0;
                    break;
                }
                case 'harga_beli':
                case 'harga_jual':
                    updateData[field] = parseInt(newValue.replace(/[^\d]/g, '')) || 0;
                    break;
                default:
                    updateData[field] = newValue;
            }

            const response = await fetch(`/api/produk/${produkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken, 'Accept': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const responseData = await response.json();

            await saveTracking({
                tipe: 'Produk',
                keterangan: `Edit produk: Edit Tabel kolom ${field} (${originalProduct.nama_produk})`,
                status: 'Update Data',
                produk_id: produkId,
                nama_produk: originalProduct.nama_produk
            });

            if (response.ok) {
                Object.assign(originalProduct, updateData);
                originalProduct.updated_at = new Date().toISOString();

                if (field.includes('harga')) {
                    cell.textContent = formatCurrency(updateData[field]);
                } else if (field === 'stok') {
                    const stok = updateData[field];
                    const badge = stok <= 10 ? 'bg-danger' : 'bg-secondary';
                    cell.innerHTML = `<span class="badge ${badge}">${stok}</span>`;
                }

                const updatedCell = row.querySelector('td:last-child');
                if (updatedCell) updatedCell.textContent = formatRelativeDate(originalProduct.updated_at);

                cell.style.backgroundColor = '#d1e7dd';
                setTimeout(() => { cell.style.backgroundColor = state.isEditMode ? '#f8f9fa' : ''; }, 2000);

                await Swal.fire({ title: 'Berhasil!', text: `${field.replace('_', ' ')} berhasil diperbarui`, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                updateTotals(state.allProducts);
            } else {
                throw new Error(responseData.message || 'Gagal menyimpan perubahan');
            }
        } catch (error) {
            console.error('Save error:', error);
            if (field.includes('harga')) {
                cell.textContent = formatCurrency(originalProduct[field] || 0);
            } else if (field === 'stok') {
                const stok = originalProduct[field] || 0;
                const badge = stok <= 10 ? 'bg-danger' : 'bg-secondary';
                cell.innerHTML = `<span class="badge ${badge}">${stok}</span>`;
            } else {
                cell.textContent = originalProduct[field] || '';
            }

            cell.style.backgroundColor = '#f8d7da';
            setTimeout(() => { cell.style.backgroundColor = state.isEditMode ? '#f8f9fa' : ''; }, 2000);

            await Swal.fire({
                title: 'Gagal Menyimpan!',
                html: `<div class="text-center"><p class="mb-2">Terjadi kesalahan saat menyimpan:</p><div class="alert alert-danger">${error.message}</div></div>`,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // =============== TOTALS ===============
    function updateTotals(data) {
        const totals = data.reduce((acc, item) => {
            acc.produk += 1;
            acc.stok += item.stok || 0;
            acc.modal += (item.harga_beli || 0) * (item.stok || 0);
            acc.nilaiProduk += (item.harga_jual || 0) * (item.stok || 0);
            return acc;
        }, { produk: 0, stok: 0, modal: 0, nilaiProduk: 0 });

        const elements = {
            totalProduk: document.getElementById('totalProdukCount'),
            totalStok: document.getElementById('totalStokCount'),
            totalModal: document.getElementById('totalModalCount'),
            totalNilaiProduk: document.getElementById('nilaiTotalProdukCount')
        };

        elements.totalProduk && (elements.totalProduk.textContent = totals.produk.toLocaleString('id-ID'));
        elements.totalStok && (elements.totalStok.textContent = totals.stok.toLocaleString('id-ID'));
        elements.totalModal && (elements.totalModal.textContent = formatCurrency(totals.modal));
        elements.totalNilaiProduk && (elements.totalNilaiProduk.textContent = formatCurrency(totals.nilaiProduk));
    }

    // =============== SORT ===============
    function handleSort() {
        const sortField = this.getAttribute('data-sort');
        if (state.currentSort.field === sortField) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.field = sortField;
            state.currentSort.direction = 'asc';
        }
        loadData(state.currentSort.field, state.currentSort.direction);
        updateSortIcons();
    }

    function updateSortIcons() {
        DOM.table.sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (!icon) return;
            if (header.getAttribute('data-sort') === state.currentSort.field) {
                icon.className = `sort-icon fas fa-sort-${state.currentSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'sort-icon fas fa-sort';
            }
        });
    }

    // =============== MODAL TAMBAH/EDIT PRODUK ===============
    async function initializeProductModal() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const isEditMode = selectedCheckboxes.length > 0;

        state.newProduct = { barcodes: [], konversiSatuan: [], diskon: [] };

        if (isEditMode) {
            state.selectedProduk = Array.from(selectedCheckboxes).map(checkbox => state.allProducts.find(p => p.id == checkbox.dataset.id));
            populateFormWithProduct(state.selectedProduk[0]);
            loadExistingBarcodes(state.selectedProduk[0].id);
            loadExistingSatuan(state.selectedProduk[0].id);
            loadExistingDiskon(state.selectedProduk[0].id);
        } else {
            const form = document.getElementById('formTambahProduk');
            if (form) {
                form.reset();
                form.querySelectorAll('input').forEach(input => { input.value = ''; input.removeAttribute('value'); });
                form.querySelector('[name="stok"]') && (form.querySelector('[name="stok"]').value = '0');
                form.querySelector('#newJumlahSatuan') && (form.querySelector('#newJumlahSatuan').value = '1');
            }
            state.selectedProduk = [];
        }

        const b = window.bootstrap || await bootstrapP;
        if (b) {
            const el = document.getElementById('baruProdukModal');
            el && b.Modal.getOrCreateInstance(el)?.show();
        }

        setTimeout(() => {
            setupModalEventListeners();
            renderBarcodeList();
            renderKonversiSatuanList();
            renderDiskonList();
            setupTabNavigation();
        }, 100);
    }

    function setupTabNavigation() {
        const tabNavigation = document.getElementById('tambahProdukTabs');
        if (tabNavigation) tabNavigation.style.display = 'flex';

        document.querySelectorAll('.tab-pane').forEach((pane, index) => {
            pane.classList.remove('show', 'active');
            if (index === 0) pane.classList.add('show', 'active');
        });
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach((link, index) => {
            link.classList.remove('active');
            if (index === 0) link.classList.add('active');
        });
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach(tab => {
            tab.removeEventListener('click', handleTabClick);
            tab.addEventListener('click', handleTabClick);
        });

        updateStepCounters();
        updateModalHeader();
    }

    function updateModalHeader() {
        const modalTitle = document.querySelector('#baruProdukModal .modal-title');
        if (!modalTitle) return;
        const isEditMode = state.selectedProduk.length > 0;

        if (isEditMode) {
            if (state.selectedProduk.length === 1) {
                const productName = state.selectedProduk[0].nama_produk || 'Produk Tanpa Nama';
                modalTitle.innerHTML = `<div class="d-flex align-items-center gap-2 flex-wrap"><i class="fas fa-edit"></i><span>Edit Produk:</span><span class="text-warning fw-bold">${productName}</span></div>`;
            } else {
                const options = state.selectedProduk.map((p) => `<option value="${p.id}">${p.nama_produk || 'Produk Tanpa Nama'}</option>`).join('');
                modalTitle.innerHTML = `
                    <div class="d-flex align-items-center gap-3 flex-wrap">
                        <i class="fas fa-edit"></i>
                        <span class="text-warning fw-bold">${state.selectedProduk.length} Produk Dipilih</span>
                        <div class="d-flex align-items-center gap-2">
                            <select id="selectEditProduk" class="form-select form-select border-primary" style="min-width:180px;">${options}</select>
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    const select = document.getElementById('selectEditProduk');
                    if (!select) return;
                    let lastSelectedId = parseInt(select.value);
                    select.addEventListener('change', function () {
                        saveCurrentProductDraft(lastSelectedId);
                        const selectedId = parseInt(this.value);
                        lastSelectedId = selectedId;
                        const produk = state.selectedProduk.find(p => p.id === selectedId);
                        if (produk) {
                            loadProductDraftToForm(selectedId, produk);
                            loadExistingBarcodes(produk.id);
                            loadExistingSatuan(produk.id);
                            loadExistingDiskon(produk.id);
                        }
                    });
                    const firstId = parseInt(select.value);
                    lastSelectedId = firstId;
                    const produk = state.selectedProduk.find(p => p.id === firstId);
                    if (produk) {
                        loadProductDraftToForm(firstId, produk);
                        loadExistingBarcodes(produk.id);
                        loadExistingSatuan(produk.id);
                        loadExistingDiskon(produk.id);
                    }
                }, 100);
            }
        } else {
            modalTitle.innerHTML = `<div class="d-flex align-items-center gap-2 flex-wrap"><i class="fas fa-plus-circle"></i><span>Tambah Produk Baru</span></div>`;
        }
    }

    function saveCurrentProductDraft(produkId) {
        const form = document.getElementById('formTambahProduk');
        if (!produkId || !form) return;
        const draft = {
            nama_produk: form.querySelector('[name="nama_produk"]')?.value,
            kategori: form.querySelector('[name="kategori"]')?.value,
            supplier: form.querySelector('[name="supplier"]')?.value,
            satuan: form.querySelector('[name="satuan"]')?.value,
            stok: form.querySelector('[name="stok"]')?.value,
            harga_beli: form.querySelector('[name="harga_beli"]')?.value,
            harga_jual: form.querySelector('[name="harga_jual"]')?.value,
            barcodes: JSON.parse(JSON.stringify(state.newProduct.barcodes || [])),
            konversiSatuan: JSON.parse(JSON.stringify(state.newProduct.konversiSatuan || [])),
            diskon: JSON.parse(JSON.stringify(state.newProduct.diskon || []))
        };
        state.productDrafts[produkId] = draft;
    }

    function loadProductDraftToForm(produkId, produk) {
        const draft = state.productDrafts[produkId];
        const form = document.getElementById('formTambahProduk');
        if (!form) return;

        if (draft) {
            form.querySelector('[name="nama_produk"]').value = draft.nama_produk || '';
            form.querySelector('[name="kategori"]').value = draft.kategori || '';
            form.querySelector('[name="supplier"]').value = draft.supplier || '';
            form.querySelector('[name="satuan"]').value = draft.satuan || '';
            form.querySelector('[name="stok"]').value = draft.stok || 0;
            form.querySelector('[name="harga_beli"]').value = draft.harga_beli || '';
            form.querySelector('[name="harga_jual"]').value = draft.harga_jual || '';
            state.newProduct.barcodes = JSON.parse(JSON.stringify(draft.barcodes || []));
            state.newProduct.konversiSatuan = JSON.parse(JSON.stringify(draft.konversiSatuan || []));
            state.newProduct.diskon = JSON.parse(JSON.stringify(draft.diskon || []));
            renderBarcodeList();
            renderKonversiSatuanList();
            renderDiskonList();
        } else {
            populateFormWithProduct(produk);
            loadExistingBarcodes(produk.id);
            loadExistingSatuan(produk.id);
            loadExistingDiskon(produk.id);
        }
    }

    function handleTabClick(e) {
        e.preventDefault();
        const clickedTab = e.currentTarget;
        const targetId = clickedTab.getAttribute('data-bs-target');

        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach(tab => tab.classList.remove('active'));
        clickedTab.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
        const targetPane = document.querySelector(targetId);
        targetPane?.classList.add('show', 'active');
    }

    function updateStepCounters() {
        const barcodeTab = document.querySelector('#step3-tab .badge');
        if (barcodeTab) {
            const count = state.newProduct.barcodes ? state.newProduct.barcodes.length : 0;
            barcodeTab.textContent = count;
            barcodeTab.style.display = count > 0 ? 'inline' : 'none';
        }
        const satuanTab = document.querySelector('#step2-tab .badge');
        if (satuanTab) {
            const validSatuan = (state.newProduct.konversiSatuan || []).filter(k =>
                typeof k.jumlah_satuan === 'number' && k.jumlah_satuan > 0 &&
                typeof k.konversi_satuan === 'number' && k.konversi_satuan > 0 &&
                k.satuan_besar && String(k.satuan_besar).trim() !== ''
            );
            satuanTab.textContent = validSatuan.length;
            satuanTab.style.display = validSatuan.length > 0 ? 'inline' : 'none';
        }
        const diskonTab = document.querySelector('#step4-tab .badge');
        if (diskonTab) {
            const count = state.newProduct.diskon ? state.newProduct.diskon.length : 0;
            diskonTab.textContent = count;
            diskonTab.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    function populateFormWithProduct(product) {
        const form = document.getElementById('formTambahProduk');
        if (!form) return;
        form.querySelector('[name="nama_produk"]').value = product.nama_produk || '';
        form.querySelector('[name="kategori"]').value = product.kategori || '';
        form.querySelector('[name="supplier"]').value = product.supplier || '';
        form.querySelector('[name="satuan"]').value = product.satuan || '';
        form.querySelector('[name="stok"]').value = product.stok || 0;

        const hargaBeliInput = form.querySelector('[name="harga_beli"]');
        const hargaJualInput = form.querySelector('[name="harga_jual"]');
        if (hargaBeliInput) hargaBeliInput.value = (parseInt(product.harga_beli, 10) || 0).toLocaleString('id-ID');
        if (hargaJualInput) hargaJualInput.value = (parseInt(product.harga_jual, 10) || 0).toLocaleString('id-ID');

        setTimeout(() => {
            calculateMargin();
            handleSatuanInput({ target: form.querySelector('[name="satuan"]') });
        }, 100);
    }

    // =============== BARCODE ===============
    async function loadExistingBarcodes(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/barcode`);
            if (response.ok) {
                const barcodeData = await response.json();
                state.newProduct.barcodes = (barcodeData || []).map(b => ({
                    id: b.id,
                    kode_barcode: b.kode_barcode,
                    is_utama: !!b.is_utama,
                    isExisting: true
                }));
                state.oldBarcodes = JSON.parse(JSON.stringify(state.newProduct.barcodes));
                renderBarcodeList();
            }
        } catch (error) {
            console.error('Error loading barcodes:', error);
        }
    }

    function tambahBarcode() {
        const input = document.getElementById('newBarcodeInput');
        const kode = (input?.value || '').trim();
        if (!kode) return showAlert('Masukkan kode barcode', 'warning');
        if (state.newProduct.barcodes.find(b => b.kode_barcode === kode)) return showAlert('Barcode sudah ada', 'warning');

        const isUtama = state.newProduct.barcodes.length === 0;
        state.newProduct.barcodes.push({ id: Date.now(), kode_barcode: kode, is_utama: isUtama });
        if (input) input.value = '';
        renderBarcodeList();
        showAlert('Barcode ditambahkan', 'success');
    }

    async function hapusBarcode(id) {
        const barcodeDihapus = state.newProduct.barcodes.find(b => b.id === id);

        if (barcodeDihapus?.isExisting) {
            try {
                await fetch(`/api/produk/barcode/${id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken } });
            } catch {
                return showAlert('Gagal menghapus barcode di server', 'danger');
            }
        }

        state.newProduct.barcodes = state.newProduct.barcodes.filter(b => b.id !== id);
        renderBarcodeList();
        showAlert('Barcode dihapus', 'success');

        if (barcodeDihapus) {
            const ctxName = state.selectedProduk[0]?.nama_produk || '';
            const ctxId = state.selectedProduk[0]?.id;
            saveTracking({ tipe: 'Produk', keterangan: `Barcode "${barcodeDihapus.kode_barcode}" dihapus dari produk "${ctxName}"`, status: 'Hapus Barcode', produk_id: ctxId, nama_produk: ctxName });
        }
    }

    function renderBarcodeList() {
        const container = document.getElementById('barcodeListContainer');
        if (!container) return;

        if (!state.newProduct.barcodes.length) {
            container.innerHTML = '<div class="text-center text-muted py-3">Belum ada barcode</div>';
        } else {
            container.innerHTML = state.newProduct.barcodes.map(b => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div><strong>${b.kode_barcode}</strong> ${b.is_utama ? '<span class="badge bg-success ms-2">Utama</span>' : ''}</div>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusBarcode(${b.id})"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }
        updateBarcodeCounter();
        updateStepCounters();
    }

    function updateBarcodeCounter() {
        const el = document.getElementById('barcodeCount');
        if (el) el.textContent = state.newProduct?.barcodes?.length || 0;
    }

    function tambahBarcodeBaru() {
        const input = document.getElementById('newBarcodeInput');
        const chk = document.getElementById('newBarcodeUtama');
        const kode = (input?.value || '').trim();
        if (!kode) return showAlert('Masukkan kode barcode', 'warning');
        if (state.newProduct.barcodes.find(b => String(b.kode_barcode) === kode)) {
            return showAlert('Barcode sudah ada', 'warning');
        }
        const setUtama = !!chk?.checked || state.newProduct.barcodes.length === 0;
        if (setUtama) state.newProduct.barcodes.forEach(b => b.is_utama = false);
        state.newProduct.barcodes.push({ id: Date.now(), kode_barcode: kode, is_utama: setUtama });
        if (input) input.value = '';
        if (chk) chk.checked = false;
        renderBarcodeList();
        // Preview barcode yang baru diinput
        updateBarcodePreview(kode);
        showAlert('Barcode ditambahkan', 'success');
    }

    // Generate random barcode lalu preview
    function generateRandomBarcode(len = 12) {
        const digits = '0123456789';
        let out = '';
        for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)];
        const input = document.getElementById('newBarcodeInput');
        if (input) input.value = out;
        updateBarcodePreview(out);
    }

    // Preview barcode di panel preview
    async function updateBarcodePreview(value) {
        const container = document.getElementById('barcodePreviewContainer');
        if (!container) return;
        const code = typeof value === 'string' ? value : (document.getElementById('newBarcodeInput')?.value || '').trim();
        container.innerHTML = '';
        if (!code) {
            container.innerHTML = '<span class="text-muted">Preview akan muncul di sini</span>';
            return;
        }
        try {
            await generateBarcode(container, code, { height: 80, width: 2, displayValue: true });
        } catch {
            container.innerHTML = `<div class="text-muted small">Barcode: ${code}</div>`;
        }
    }

    // =============== SATUAN ===============
    async function loadExistingSatuan(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/satuan`);
            if (response.ok) {
                const satuanData = await response.json();
                state.newProduct.konversiSatuan = (satuanData || []).map(s => ({
                    id: s.id,
                    satuan_besar: s.satuan_besar || '',
                    jumlah_satuan: Number(s.jumlah) || 0,
                    konversi_satuan: Number(s.konversi) || 0,
                    isExisting: true
                }));
                state.oldSatuan = JSON.parse(JSON.stringify(state.newProduct.konversiSatuan));
                renderKonversiSatuanList();
            }
        } catch (error) {
            console.error('Error loading satuan:', error);
        }
    }

    function tambahKonversiSatuan() {
        const satuanBesar = (document.getElementById('newSatuanBesar')?.value || '').trim();
        const jumlahSatuan = parseFloat(document.getElementById('newJumlahSatuan')?.value);
        const konversiSatuan = parseFloat(document.getElementById('newKonversiSatuan')?.value);

        if (!satuanBesar) return showAlert('Masukkan satuan besar', 'warning');
        if (!jumlahSatuan || jumlahSatuan <= 0) return showAlert('Masukkan jumlah satuan yang valid', 'warning');
        if (!konversiSatuan || konversiSatuan <= 0) return showAlert('Masukkan nilai konversi yang valid', 'warning');

        state.newProduct.konversiSatuan = state.newProduct.konversiSatuan || [];
        if (state.newProduct.konversiSatuan.find(k => k.satuan_besar === satuanBesar)) return showAlert('Satuan sudah ada', 'warning');

        state.newProduct.konversiSatuan.push({ id: Date.now(), satuan_besar: satuanBesar, jumlah_satuan: jumlahSatuan, konversi_satuan: konversiSatuan, isExisting: false });
        const satuanBesarEl = document.getElementById('newSatuanBesar');
        const jumlahSatuanEl = document.getElementById('newJumlahSatuan');
        const konversiSatuanEl = document.getElementById('newKonversiSatuan');
        if (satuanBesarEl) satuanBesarEl.value = '';
        if (jumlahSatuanEl) jumlahSatuanEl.value = '1';
        if (konversiSatuanEl) konversiSatuanEl.value = '';

        renderKonversiSatuanList();
        showAlert('Konversi satuan ditambahkan', 'success');
    }

    async function hapusKonversiSatuan(id) {
        if (!state.newProduct.konversiSatuan) return;
        const satuanDihapus = state.newProduct.konversiSatuan.find(k => k.id === id);

        if (satuanDihapus?.isExisting) {
            try {
                await fetch(`/api/produk/satuan/${id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken } });
            } catch {
                return showAlert('Gagal menghapus satuan di server', 'danger');
            }
        }

        state.newProduct.konversiSatuan = state.newProduct.konversiSatuan.filter(k => k.id !== id);
        renderKonversiSatuanList();
        showAlert('Konversi satuan dihapus', 'success');

        if (satuanDihapus) {
            const ctxName = state.selectedProduk[0]?.nama_produk || '';
            const ctxId = state.selectedProduk[0]?.id;
            saveTracking({ tipe: 'Produk', keterangan: `Satuan "${satuanDihapus.satuan_besar}" dihapus dari produk "${ctxName}"`, status: 'Hapus Satuan', produk_id: ctxId, nama_produk: ctxName });
        }
    }

    function renderKonversiSatuanList() {
        const container = document.getElementById('konversiSatuanList');
        if (!container) return;

        const dataValid = (state.newProduct.konversiSatuan || []).filter(k =>
            typeof k.jumlah_satuan === 'number' && k.jumlah_satuan > 0 &&
            typeof k.konversi_satuan === 'number' && k.konversi_satuan > 0 &&
            k.satuan_besar && String(k.satuan_besar).trim() !== ''
        );

        if (!dataValid.length) {
            container.innerHTML = `<div class="empty-state text-center py-4"><i class="fas fa-balance-scale fa-2x text-muted mb-2"></i><p class="text-muted">Belum ada konversi satuan</p></div>`;
        } else {
            const satuanDasar = document.querySelector('[name="satuan"]')?.value || 'pcs';
            container.innerHTML = dataValid.map(k => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded bg-light">
                    <div><strong>${k.jumlah_satuan} ${k.satuan_besar}</strong> = <span class="text-primary">${k.konversi_satuan} ${satuanDasar}</span></div>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusKonversiSatuan(${k.id})"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }

        updateSatuanCounter();
        updateStepCounters();
    }

    function updateSatuanCounter() {
        const counter = document.getElementById('satuanCount');
        if (counter) {
            const validSatuan = (state.newProduct.konversiSatuan || []).filter(k =>
                typeof k.jumlah_satuan === 'number' && k.jumlah_satuan > 0 &&
                typeof k.konversi_satuan === 'number' && k.konversi_satuan > 0 &&
                k.satuan_besar && String(k.satuan_besar).trim() !== ''
            );
            counter.textContent = validSatuan.length;
        }
    }

    // =============== DISKON ===============
    async function loadExistingDiskon(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/diskon`);
            if (response.ok) {
                const diskonData = await response.json();
                state.newProduct.diskon = (diskonData || []).map(d => ({
                    id: d.id,
                    jumlah_minimum: Number(d.jumlah_minimum),
                    diskon: Number(d.diskon),
                    is_tanpa_waktu: !!d.is_tanpa_waktu,
                    tanggal_mulai: d.tanggal_mulai,
                    tanggal_berakhir: d.tanggal_berakhir,
                    isExisting: true
                }));
                state.oldDiskon = JSON.parse(JSON.stringify(state.newProduct.diskon));
                renderDiskonList();
            }
        } catch (error) {
            console.error('Error loading diskon:', error);
        }
    }

    function tambahDiskonBaru() {
        const jumlahMinimum = parseInt(document.getElementById('newDiskonMinimum')?.value) || 0;
        const diskonPersen = parseFloat(document.getElementById('newDiskonPersen')?.value) || 0;
        const tanpaWaktu = !!document.getElementById('diskonTanpaWaktu')?.checked;
        const mulai = document.getElementById('diskonMulai')?.value;
        const berakhir = document.getElementById('diskonBerakhir')?.value;

        if (jumlahMinimum <= 0) return showAlert('Masukkan jumlah minimum yang valid', 'warning');
        if (diskonPersen <= 0 || diskonPersen > 100) return showAlert('Masukkan diskon antara 0.01% - 100%', 'warning');
        if (!tanpaWaktu && (!mulai || !berakhir)) return showAlert('Masukkan tanggal mulai dan berakhir', 'warning');
        if (!tanpaWaktu && new Date(mulai) >= new Date(berakhir)) return showAlert('Tanggal berakhir harus setelah tanggal mulai', 'warning');

        state.newProduct.diskon = state.newProduct.diskon || [];
        if (state.newProduct.diskon.find(d => d.jumlah_minimum === jumlahMinimum)) return showAlert('Diskon untuk jumlah minimum ini sudah ada', 'warning');

        state.newProduct.diskon.push({
            id: Date.now(),
            jumlah_minimum: jumlahMinimum,
            diskon: diskonPersen,
            is_tanpa_waktu: tanpaWaktu,
            tanggal_mulai: tanpaWaktu ? null : mulai,
            tanggal_berakhir: tanpaWaktu ? null : berakhir,
            isExisting: false
        });

        const minEl = document.getElementById('newDiskonMinimum');
        const persenEl = document.getElementById('newDiskonPersen');
        const chkEl = document.getElementById('diskonTanpaWaktu');
        document.getElementById('diskonMulai') && (document.getElementById('diskonMulai').value = '');
        document.getElementById('diskonBerakhir') && (document.getElementById('diskonBerakhir').value = '');
        if (minEl) minEl.value = '';
        if (persenEl) persenEl.value = '';
        if (chkEl) chkEl.checked = true;
        toggleWaktuDiskon();

        renderDiskonList();
        showAlert('Diskon ditambahkan', 'success');
    }

    async function hapusDiskon(id) {
        if (!state.newProduct.diskon) return;
        const diskonDihapus = state.newProduct.diskon.find(d => d.id === id);

        if (diskonDihapus?.isExisting) {
            try {
                await fetch(`/api/produk/diskon/${id}`, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken } });
            } catch {
                return showAlert('Gagal menghapus diskon di server', 'danger');
            }
        }

        state.newProduct.diskon = state.newProduct.diskon.filter(d => d.id !== id);
        renderDiskonList();
        showAlert('Diskon dihapus', 'success');

        if (diskonDihapus) {
            const ctxName = state.selectedProduk[0]?.nama_produk || '';
            const ctxId = state.selectedProduk[0]?.id;
            saveTracking({ tipe: 'Produk', keterangan: `Diskon dihapus dari produk "${ctxName}"`, status: 'Hapus Diskon', produk_id: ctxId, nama_produk: ctxName });
        }
    }

    function renderDiskonList() {
        const container = document.getElementById('diskonListContainer');
        if (!container) return;

        if (!state.newProduct.diskon?.length) {
            container.innerHTML = `<div class="empty-state text-center py-4"><i class="fas fa-percent fa-2x text-muted mb-2"></i><p class="text-muted">Belum ada diskon</p></div>`;
        } else {
            const satuanDasar = document.querySelector('[name="satuan"]')?.value || 'pcs';
            container.innerHTML = state.newProduct.diskon.map(d => {
                const waktuText = d.is_tanpa_waktu
                    ? '<span class="badge bg-success">Permanen</span>'
                    : `<small class="text-muted">${formatDate(d.tanggal_mulai)} - ${formatDate(d.tanggal_berakhir)}</small>`;
                return `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded bg-light">
                        <div>
                            <div><strong>Min. ${d.jumlah_minimum} ${satuanDasar}</strong> → <span class="text-primary">${d.diskon}% diskon</span></div>
                            ${waktuText}
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusDiskon(${d.id})"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }).join('');
        }
        updateDiskonCounter();
        updateStepCounters();
    }

    function updateDiskonCounter() {
        const counter = document.getElementById('diskonCount');
        if (counter) counter.textContent = state.newProduct.diskon?.length || 0;
    }

    function toggleWaktuDiskon() {
        const checkbox = document.getElementById('diskonTanpaWaktu');
        const container = document.getElementById('waktuDiskonContainer');
        if (container) container.style.display = checkbox?.checked ? 'none' : 'block';
    }

    // =============== SIMPAN PRODUK LENGKAP ===============
    async function saveCompleteProduct() {
        const form = document.getElementById('formTambahProduk');
        const isEditMode = state.selectedProduk?.length > 0;

        if (isEditMode && state.selectedProduk.length > 1) {
            const select = document.getElementById('selectEditProduk');
            if (select) saveCurrentProductDraft(parseInt(select.value));
        }

        const produkList = isEditMode ? state.selectedProduk : [null];

        try {
            for (const produk of produkList) {
                let produkId = produk ? produk.id : null;
                let produkData, barcodes, konversiSatuan, diskon;

                if (isEditMode) {
                    const draft = state.productDrafts[produkId];
                    produkData = draft ? {
                        nama_produk: draft.nama_produk,
                        kategori: draft.kategori,
                        supplier: draft.supplier,
                        satuan: draft.satuan,
                        stok: parseInt(draft.stok) || 0,
                        harga_beli: parseInt((draft.harga_beli || '').replace(/[^\d]/g, '')) || 0,
                        harga_jual: parseInt((draft.harga_jual || '').replace(/[^\d]/g, '')) || 0
                    } : {
                        nama_produk: form.querySelector('[name="nama_produk"]').value,
                        kategori: form.querySelector('[name="kategori"]').value,
                        supplier: form.querySelector('[name="supplier"]').value,
                        satuan: form.querySelector('[name="satuan"]').value,
                        stok: parseInt(form.querySelector('[name="stok"]').value) || 0,
                        harga_beli: parseInt(form.querySelector('[name="harga_beli"]').value.replace(/[^\d]/g, '')) || 0,
                        harga_jual: parseInt(form.querySelector('[name="harga_jual"]').value.replace(/[^\d]/g, '')) || 0
                    };
                    barcodes = draft ? draft.barcodes : state.newProduct.barcodes;
                    konversiSatuan = draft ? draft.konversiSatuan : state.newProduct.konversiSatuan;
                    diskon = draft ? draft.diskon : state.newProduct.diskon;
                } else {
                    const formData = new FormData(form);
                    produkData = {
                        nama_produk: formData.get('nama_produk'),
                        kategori: formData.get('kategori'),
                        supplier: formData.get('supplier'),
                        satuan: formData.get('satuan'),
                        stok: parseInt(formData.get('stok')) || 0,
                        harga_beli: parseInt(String(formData.get('harga_beli') || '').replace(/[^\d]/g, '')) || 0,
                        harga_jual: parseInt(String(formData.get('harga_jual') || '').replace(/[^\d]/g, '')) || 0
                    };
                    barcodes = state.newProduct.barcodes;
                    konversiSatuan = state.newProduct.konversiSatuan;
                    diskon = state.newProduct.diskon;
                }

                if (!produkData.nama_produk) {
                    showAlert('Nama produk wajib diisi', 'warning');
                    return;
                }

                let response, result;
                if (isEditMode) {
                    response = await fetch(`/api/produk/${produkId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                        body: JSON.stringify(produkData)
                    });
                    result = await response.json();

                    await saveTracking({ tipe: 'Produk', keterangan: `Produk "${produkData.nama_produk}" diperbarui (nama/harga/stok)`, status: 'Diedit', produk_id: produkId, nama_produk: produkData.nama_produk });
                } else {
                    response = await fetch('/api/produk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                        body: JSON.stringify(produkData)
                    });
                    result = await response.json();
                    produkId = result?.data?.id;

                    await saveTracking({ tipe: 'Produk', keterangan: `Produk baru "${produkData.nama_produk}" ditambahkan`, status: 'Ditambahkan', produk_id: produkId, nama_produk: produkData.nama_produk });
                }

                if (!response.ok) throw new Error(result?.message || 'Gagal menyimpan');

                // Satuan
                if (konversiSatuan?.length) {
                    for (const konversi of konversiSatuan) {
                        await fetch('/api/produk/satuan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                            body: JSON.stringify({ produk_id: produkId, satuan_besar: konversi.satuan_besar, jumlah_satuan: konversi.jumlah_satuan, konversi_satuan: konversi.konversi_satuan })
                        });
                        await saveTracking({ tipe: 'Produk', keterangan: `Satuan "${konversi.satuan_besar}" ditambahkan ke produk "${produkData.nama_produk}"`, status: 'Tambah Satuan', produk_id: produkId, nama_produk: produkData.nama_produk });
                    }
                }

                // Barcode
                if (barcodes?.length) {
                    for (const barcode of barcodes) {
                        await fetch('/api/produk/barcode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                            body: JSON.stringify({ produk_id: produkId, kode_barcode: barcode.kode_barcode, is_utama: barcode.is_utama })
                        });
                        await saveTracking({ tipe: 'Produk', keterangan: `Barcode "${barcode.kode_barcode}" ditambahkan ke produk "${produkData.nama_produk}"`, status: 'Tambah Barcode', produk_id: produkId, nama_produk: produkData.nama_produk });
                    }
                }

                // Diskon
                if (diskon?.length) {
                    for (const d of diskon) {
                        await fetch('/api/produk/diskon', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                            body: JSON.stringify({ produk_id: produkId, jumlah_minimum: d.jumlah_minimum, diskon: d.diskon, is_tanpa_waktu: d.is_tanpa_waktu, tanggal_mulai: d.tanggal_mulai, tanggal_berakhir: d.tanggal_berakhir })
                        });
                        await saveTracking({ tipe: 'Produk', keterangan: `Diskon ${d.diskon}% ditambahkan ke produk "${produkData.nama_produk}"`, status: 'Tambah Diskon', produk_id: produkId, nama_produk: produkData.nama_produk });
                    }
                }
            }

            await Swal.fire({ title: 'Berhasil!', text: isEditMode && state.selectedProduk.length > 1 ? 'Semua perubahan produk berhasil disimpan.' : 'Produk lengkap berhasil disimpan', icon: 'success', confirmButtonText: 'OK', timer: 3000, timerProgressBar: true });

            const b = window.bootstrap || await (typeof bootstrapP !== 'undefined' ? bootstrapP : ensureBootstrap().catch(() => null));
            if (b) {
                const el = document.getElementById('baruProdukModal');
                el && b.Modal.getOrCreateInstance(el)?.hide();
            }
            await loadData(state.currentSort.field, state.currentSort.direction);
        } catch (error) {
            console.error('Save error:', error);
            await Swal.fire({ title: 'Gagal Menyimpan!', text: 'Terjadi kesalahan: ' + error.message, icon: 'error', confirmButtonText: 'OK' });
        }
    }

    // =============== UTIL INTERAKSI TABEL ===============
    function handleTableClick(e) {
        const row = e.target.closest('tr');
        if (!row?.dataset.id) return;
        if (e.target.classList.contains('row-checkbox')) return;
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            handleRowCheckboxChange(checkbox);
        }
    }

    function handleRowCheckboxChange(checkbox) {
        const produkId = parseInt(checkbox.dataset.id);
        const produk = state.allProducts.find(p => p.id === produkId);
        if (checkbox.checked) {
            if (!state.selectedProduk.some(p => p.id === produkId)) state.selectedProduk.push(produk);
        } else {
            state.selectedProduk = state.selectedProduk.filter(p => p.id !== produkId);
        }
        updateSelectedCounter();
    }

    function handleSelectedRow() {
        const isChecked = !!DOM.table.selectAll?.checked;
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const newSelected = [];
        checkboxes.forEach(checkbox => {
            const produkId = parseInt(checkbox.dataset.id);
            const produk = state.allProducts.find(p => p.id === produkId);
            checkbox.checked = isChecked;
            if (isChecked) newSelected.push(produk);
        });
        state.selectedProduk = isChecked ? newSelected : [];
        updateSelectedCounter();
    }

    function updateSelectedCounter() {
        const selectedCount = state.selectedProduk.length;
        const counterElement = document.getElementById('selectedCounter');
        if (counterElement) {
            counterElement.textContent = selectedCount;
            counterElement.style.display = selectedCount > 0 ? 'inline' : 'none';
        }
    }

    // =============== EDIT MODE ===============
    function enterEditMode() {
        state.isEditMode = true;
        const editBtn = document.getElementById('editTableBtn');
        const exitBtn = document.getElementById('exitEditModeBtn');
        const banner = document.getElementById('editModeBanner');

        editBtn?.classList.add('d-none');
        exitBtn?.classList.remove('d-none');
        banner?.classList.remove('d-none');

        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.contentEditable = true;
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.border = '1px dashed #007bff';
            cell.style.cursor = 'text';

            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);

            cell.addEventListener('keypress', handleCellKeypress);
            cell.addEventListener('blur', handleCellBlur);
            cell.addEventListener('focus', handleCellFocus);
        });

        Swal.fire({ title: 'Mode Edit Aktif!', text: 'Klik sel untuk mengedit data. Tekan Enter atau klik di luar sel untuk menyimpan.', icon: 'info', timer: 3000, toast: true, position: 'top-end', showConfirmButton: false });
    }

    function exitEditMode() {
        state.isEditMode = false;
        const editBtn = document.getElementById('editTableBtn');
        const exitBtn = document.getElementById('exitEditModeBtn');
        const banner = document.getElementById('editModeBanner');

        editBtn?.classList.remove('d-none');
        exitBtn?.classList.add('d-none');
        banner?.classList.add('d-none');

        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.contentEditable = false;
            cell.style.backgroundColor = '';
            cell.style.border = '';
            cell.style.cursor = '';

            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);
        });

        Swal.fire({ title: 'Mode Edit Dinonaktifkan', text: 'Tabel kembali ke mode normal', icon: 'success', timer: 2000, toast: true, position: 'top-end', showConfirmButton: false });
    }

    function handleCellKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    }
    function handleCellBlur(e) { saveCellEdit(e.target); }
    function handleCellFocus(e) {
        const cell = e.target;
        const field = cell.dataset.field;
        if (field?.includes('harga')) {
            const rawValue = cell.textContent.replace(/[^\d]/g, '');
            cell.textContent = rawValue;
        }
        if (field === 'stok') {
            const stokMatch = cell.textContent.match(/\d+/);
            if (stokMatch) cell.textContent = stokMatch[0];
        }
        cell.style.backgroundColor = '#fff3cd';
    }

    // =============== HAPUS MULTI ===============
    async function deleteSelected() {
        if (state.selectedProduk.length === 0) {
            await Swal.fire({ title: 'Tidak Ada Data', text: 'Pilih produk yang akan dihapus terlebih dahulu', icon: 'warning', confirmButtonText: 'OK' });
            return;
        }

        const produkNames = state.selectedProduk.slice(0, 3).map(p => p.nama_produk);
        const extraCount = state.selectedProduk.length > 3 ? state.selectedProduk.length - 3 : 0;

        const result = await Swal.fire({
            title: 'Konfirmasi Hapus Produk',
            html: `
                <div>
                    <p>Anda akan menghapus <strong>${state.selectedProduk.length} produk</strong> berikut:</p>
                    <div style="background:#fff3cd;border:1px solid #ffeaa7;padding:10px;margin:10px 0;border-radius:5px;">
                        ${produkNames.map(name => `• ${name}`).join('<br>')}
                        ${extraCount > 0 ? `<br>• dan ${extraCount} produk lainnya...` : ''}
                    </div>
                    <div style="background:#f8d7da;border:1px solid #f5c6cb;padding:10px;margin:10px 0;border-radius:5px;color:#721c24;">
                        <strong>Peringatan:</strong> Data yang dihapus tidak dapat dikembalikan!
                    </div>
                    <div style="margin-top:15px;">
                        <label for="swal-password" style="display:block;margin-bottom:5px;font-weight:bold;">Masukkan Password untuk Konfirmasi:</label>
                        <input type="password" id="swal-password" class="swal2-input" placeholder="Password Anda" style="width:100%;margin:0;">
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            focusConfirm: false,
            preConfirm: () => {
                const password = document.getElementById('swal-password').value;
                if (!password) { Swal.showValidationMessage('Password wajib diisi!'); return false; }
                if (password.length < 3) { Swal.showValidationMessage('Password terlalu pendek!'); return false; }
                return password;
            }
        });

        if (!result.isConfirmed) return;

        const password = result.value;

        try {
            const produkIds = state.selectedProduk.map(p => p.id);
            const allProdukNames = state.selectedProduk.map(p => p.nama_produk);

            await saveTracking({
                tipe: 'Produk',
                keterangan: `Produk "${allProdukNames.join(', ')}" dihapus permanen`,
                status: 'Produk Dihapus',
                produk_id: produkIds.join(','),
                nama_produk: allProdukNames.join(', ')
            });

            const response = await fetch('/api/produk/delete-multiple', {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken, 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ ids: produkIds, password })
            });

            const contentType = response.headers.get('content-type');
            const responseData = contentType?.includes('application/json') ? await response.json() : { success: false, message: await response.text() };

            if (response.ok && responseData.success) {
                await Swal.fire({ title: 'Berhasil!', text: `${state.selectedProduk.length} produk berhasil dihapus dari sistem.`, icon: 'success', confirmButtonText: 'OK', confirmButtonColor: '#198754', timer: 3000, timerProgressBar: true });
                state.selectedProduk = [];
                updateSelectedCounter();
                await loadData(state.currentSort.field, state.currentSort.direction);
            } else if (response.status === 401) {
                await Swal.fire({
                    title: 'Password Salah!',
                    html: `<div class="text-center"><div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> Password yang Anda masukkan tidak sesuai.</div><p class="text-muted">Masukkan password yang benar untuk melanjutkan.</p></div>`,
                    icon: 'error',
                    confirmButtonText: 'Coba Lagi',
                    confirmButtonColor: '#dc3545',
                    showCancelButton: true,
                    cancelButtonText: 'Batal',
                    cancelButtonColor: '#6c757d'
                }).then((res) => { if (res.isConfirmed) setTimeout(() => deleteSelected(), 500); });
            } else {
                throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            await Swal.fire({
                title: 'Gagal Menghapus!',
                html: `<div class="text-center"><p class="mb-2">Terjadi kesalahan saat menghapus produk:</p><div class="alert alert-danger text-start"><strong>Error:</strong> ${error.message}</div><small class="text-muted">Jika berlanjut, hubungi dukungan teknis.</small></div>`,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // =============== EXPORT ===============
    async function onExportXlsx(e) {
        e.preventDefault(); e.stopPropagation();
        try {
            const XLSX = await ensureXLSX();
            const rows = buildProdukRows();
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Produk');
            XLSX.writeFile(wb, 'produk.xlsx');
        } catch (err) {
            (await ensureSwal()).fire('Error', 'Gagal ekspor XLSX', 'error');
        }
    }

    async function onExportPdf(e) {
        e.preventDefault(); e.stopPropagation();
        try {
            const jsPDF = await ensureJsPDF();
            const autoTable = await ensureAutoTable();
            const doc = new jsPDF();
            autoTable(doc, {
                head: [['Nama', 'Barcode', 'Harga', 'Satuan']],
                body: buildProdukRows().map(r => [r.nama, r.barcode, r.harga, Array.isArray(r.satuan) ? r.satuan.join(', ') : (r.satuan || '')])
            });
            doc.save('produk.pdf');
        } catch (err) {
            (await ensureSwal()).fire('Error', 'Gagal ekspor PDF', 'error');
        }
    }

    function buildProdukRows() {
        return (state.allProducts || []).map(p => ({
            nama: p.nama_produk || '',
            barcode: Array.isArray(p.barcodes) && p.barcodes.length
                ? (p.barcodes.find(b => b.is_utama)?.kode_barcode || p.barcodes[0].kode_barcode)
                : '',
            harga: p.harga_jual || 0,
            satuan: p.satuan || ''
        }));
    }

    // =============== UTIL MISC ===============
    function cleanupBackdrop() {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
    function showAlert(msg, type = 'info') {
        Swal.fire({ toast: true, position: 'top-end', icon: type === 'danger' ? 'error' : (type === 'warning' ? 'warning' : 'success'), title: msg, timer: 1600, showConfirmButton: false });
    }
    function formatCurrency(n) {
        const x = parseInt(n || 0, 10);
        return 'Rp ' + x.toLocaleString('id-ID');
    }
    function formatRelativeDate(iso) {
        try { return iso ? new Date(iso).toLocaleString('id-ID') : '-'; } catch { return '-'; }
    }
    function formatDate(v) {
        try { return v ? new Date(v).toLocaleDateString('id-ID') : '-'; } catch { return '-'; }
    }
    async function saveTracking(payload) {
        try {
            await fetch('/api/tracking', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken }, body: JSON.stringify(payload) });
        } catch (e) {
            console.warn('saveTracking skipped:', e?.message);
        }
    }
    function calculateMargin() {
        const form = document.getElementById('formTambahProduk');
        if (!form) return { marginRp: 0, marginPct: 0 };

        const beliInput = form.querySelector('[name="harga_beli"]');
        const jualInput = form.querySelector('[name="harga_jual"]');

        const parseNum = (v) => parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0;



        const hargaBeli = parseNum(beliInput?.value);
        const hargaJual = parseNum(jualInput?.value);

        const marginRp = Math.max(0, hargaJual - hargaBeli);
        const marginPct = hargaBeli > 0 ? (marginRp / hargaBeli) * 100 : 0;

        // Tampilkan ke helper jika ada
        const marginRpEl = document.getElementById('marginRupiah');
        const marginPctEl = document.getElementById('marginPersen');
        if (marginRpEl) marginRpEl.textContent = 'Rp ' + marginRp.toLocaleString('id-ID');
        if (marginPctEl) marginPctEl.textContent = marginPct.toFixed(2) + '%';

        return { marginRp, marginPct };
    }
    function handleSatuanInput(e) {
        const satuanBaru = e?.target?.value || document.querySelector('[name="satuan"]')?.value || '';
        // Update semua placeholder atau label yang menampilkan satuan dasar
        document.querySelectorAll('.satuan-text, [data-satuan-text]').forEach(el => {
            el.textContent = satuanBaru || (el.getAttribute('data-satuan-text') || el.textContent);
        });

        // Sesuaikan placeholder input konversi jika ada
        const konvInput = document.getElementById('newKonversiSatuan');
        if (konvInput) konvInput.placeholder = satuanBaru ? `contoh: 12 ${satuanBaru}` : 'contoh: 12 pcs';

        // Render ulang list konversi supaya label mengikuti satuan dasar
        try { renderKonversiSatuanList(); } catch { }

        // Update counter/step UI jika ada
        try { updateStepCounters(); } catch { }
    }
    function setupModalEventListeners() {
        const form = document.getElementById('formTambahProduk');
        if (!form) return;

        const beliInput = form.querySelector('[name="harga_beli"]');
        const jualInput = form.querySelector('[name="harga_jual"]');
        const satuanInput = form.querySelector('[name="satuan"]');

        const formatOnBlur = (el) => {
            const raw = parseInt(String(el.value || '').replace(/[^\d]/g, ''), 10) || 0;
            el.value = raw.toLocaleString('id-ID');
        };

        // Hitung margin saat user mengetik
        beliInput?.addEventListener('input', calculateMargin);
        jualInput?.addEventListener('input', calculateMargin);
        // Format rupiah saat blur
        beliInput?.addEventListener('blur', () => { formatOnBlur(beliInput); calculateMargin(); });
        jualInput?.addEventListener('blur', () => { formatOnBlur(jualInput); calculateMargin(); });

        // Ubah satuan dasar
        satuanInput?.addEventListener('change', handleSatuanInput);

        // Tambah barcode dengan Enter
        const barcodeInput = document.getElementById('newBarcodeInput');
        barcodeInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); window.tambahBarcode?.(); }
        });
        barcodeInput?.addEventListener('input', () => updateBarcodePreview());

        // Tombol tambah konversi satuan
        document.getElementById('addKonversiSatuanBtn')?.addEventListener('click', (e) => { e.preventDefault(); window.tambahKonversiSatuan?.(); });
        // Validasi numeric inputs
        ['newJumlahSatuan', 'newKonversiSatuan', 'newDiskonMinimum', 'newDiskonPersen'].forEach(id => {
            const el = document.getElementById(id);
            el?.addEventListener('input', () => {
                el.value = el.value.replace(/[^\d.]/g, '');
            });
        });

        // Diskon: toggle waktu
        document.getElementById('diskonTanpaWaktu')?.addEventListener('change', () => window.toggleWaktuDiskon?.());
        // Tambah diskon
        document.getElementById('addDiskonBtn')?.addEventListener('click', (e) => { e.preventDefault(); window.tambahDiskonBaru?.(); });

        // Hitung margin awal saat modal baru dibuka
        calculateMargin();
        // Sinkron label satuan awal
        handleSatuanInput({ target: satuanInput });
        updateBarcodePreview('');
    }
    function showRestokModal() {
        const modal = document.getElementById('restokProdukModal');
        if (!modal) return;
        if (!state.selectedProduk?.length) return;

        const body = modal.querySelector('.modal-body');
        const footer = modal.querySelector('.modal-footer');

        // Bangun daftar produk yang dipilih dengan input jumlah dan pilihan satuan
        const rowsHtml = state.selectedProduk.map((p, idx) => {
            const satuanDasar = p.satuan || 'pcs';
            const satuanList = [
                satuanDasar,
                ...(Array.isArray(p.konversi_satuan) ? p.konversi_satuan.map(k => k.satuan_besar).filter(Boolean) : [])
            ].filter(Boolean);

            return `
                <div class="restok-row row g-2 align-items-center mb-2" data-id="${p.id}">
                    <div class="col-6">
                        <div class="fw-semibold text-truncate" title="${p.nama_produk || ''}">${p.nama_produk || ''}</div>
                        <small class="text-muted">Stok: ${(p.stok || 0).toLocaleString('id-ID')} ${satuanDasar}</small>
                    </div>
                    <div class="col-3">
                        <input type="number" min="1" class="form-control form-control-sm restok-qty" placeholder="Qty" value="1">
                    </div>
                    <div class="col-3">
                        <select class="form-select form-select-sm restok-satuan">
                            ${satuanList.map(s => `<option ${s === satuanDasar ? 'selected' : ''} value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        }).join('');

        if (body) body.innerHTML = `
            <div class="mb-2 text-muted">Masukkan jumlah restok untuk tiap produk yang dipilih.</div>
            ${rowsHtml}
        `;

        // Tambah tombol submit di footer (ganti jika sudah ada)
        let submitBtn = footer?.querySelector('#submitRestokBtn');
        if (!submitBtn && footer) {
            submitBtn = document.createElement('button');
            submitBtn.id = 'submitRestokBtn';
            submitBtn.type = 'button';
            submitBtn.className = 'btn btn-success';
            submitBtn.textContent = 'Simpan Restok';
            footer.appendChild(submitBtn);
        }
        if (submitBtn) {
            // Remove listener lama (clone trick)
            const clone = submitBtn.cloneNode(true);
            submitBtn.replaceWith(clone);
            submitBtn = clone;

            submitBtn.addEventListener('click', async () => {
                // Kumpulkan payload
                const items = Array.from(modal.querySelectorAll('.restok-row')).map(row => {
                    const id = parseInt(row.getAttribute('data-id'));
                    const qty = parseFloat(row.querySelector('.restok-qty')?.value) || 0;
                    const satuan = row.querySelector('.restok-satuan')?.value || '';
                    return { produk_id: id, jumlah: qty, satuan };
                }).filter(i => i.jumlah > 0);

                if (!items.length) {
                    Swal.fire('Isi Jumlah', 'Masukkan jumlah restok minimal 1.', 'warning');
                    return;
                }

                try {
                    const res = await fetch('/api/produk/restok', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                        body: JSON.stringify({ items })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

                    await saveTracking({
                        tipe: 'Produk',
                        keterangan: `Restok ${items.length} item`,
                        status: 'Restok',
                        produk_id: items.map(i => i.produk_id).join(','),
                        nama_produk: state.selectedProduk.map(p => p.nama_produk).join(', ')
                    });

                    await Swal.fire({ icon: 'success', title: 'Restok Berhasil', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                    const b = window.bootstrap || await (typeof bootstrapP !== 'undefined' ? bootstrapP : ensureBootstrap().catch(() => null));
                    b?.Modal.getOrCreateInstance(modal)?.hide();
                    await loadData(state.currentSort.field, state.currentSort.direction);
                } catch (err) {
                    console.error(err);
                    Swal.fire('Gagal', String(err.message || err), 'error');
                }
            });
        }
    }

    function showReturModal() {
        const modal = document.getElementById('returProdukModal');
        if (!modal) return;
        if (!state.selectedProduk?.length) return;

        const body = modal.querySelector('.modal-body');
        const footer = modal.querySelector('.modal-footer');

        const rowsHtml = state.selectedProduk.map(p => {
            const satuanDasar = p.satuan || 'pcs';
            const satuanList = [
                satuanDasar,
                ...(Array.isArray(p.konversi_satuan) ? p.konversi_satuan.map(k => k.satuan_besar).filter(Boolean) : [])
            ].filter(Boolean);

            return `
                <div class="retur-row row g-2 align-items-center mb-2" data-id="${p.id}">
                    <div class="col-6">
                        <div class="fw-semibold text-truncate" title="${p.nama_produk || ''}">${p.nama_produk || ''}</div>
                        <small class="text-muted">Stok: ${(p.stok || 0).toLocaleString('id-ID')} ${satuanDasar}</small>
                    </div>
                    <div class="col-3">
                        <input type="number" min="1" class="form-control form-control-sm retur-qty" placeholder="Qty" value="1">
                    </div>
                    <div class="col-3">
                        <select class="form-select form-select-sm retur-satuan">
                            ${satuanList.map(s => `<option ${s === satuanDasar ? 'selected' : ''} value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        }).join('');

        if (body) body.innerHTML = `
            <div class="mb-2 text-muted">Masukkan jumlah retur (barang kembali ke supplier/gudang).</div>
            ${rowsHtml}
        `;

        let submitBtn = footer?.querySelector('#submitReturBtn');
        if (!submitBtn && footer) {
            submitBtn = document.createElement('button');
            submitBtn.id = 'submitReturBtn';
            submitBtn.type = 'button';
            submitBtn.className = 'btn btn-danger';
            submitBtn.textContent = 'Simpan Retur';
            footer.appendChild(submitBtn);
        }
        if (submitBtn) {
            const clone = submitBtn.cloneNode(true);
            submitBtn.replaceWith(clone);
            submitBtn = clone;

            submitBtn.addEventListener('click', async () => {
                const items = Array.from(modal.querySelectorAll('.retur-row')).map(row => {
                    const id = parseInt(row.getAttribute('data-id'));
                    const qty = parseFloat(row.querySelector('.retur-qty')?.value) || 0;
                    const satuan = row.querySelector('.retur-satuan')?.value || '';
                    return { produk_id: id, jumlah: qty, satuan };
                }).filter(i => i.jumlah > 0);

                if (!items.length) {
                    Swal.fire('Isi Jumlah', 'Masukkan jumlah retur minimal 1.', 'warning');
                    return;
                }

                try {
                    const res = await fetch('/api/produk/retur', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': DOM.meta.csrfToken },
                        body: JSON.stringify({ items })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

                    await saveTracking({
                        tipe: 'Produk',
                        keterangan: `Retur ${items.length} item`,
                        status: 'Retur',
                        produk_id: items.map(i => i.produk_id).join(','),
                        nama_produk: state.selectedProduk.map(p => p.nama_produk).join(', ')
                    });

                    await Swal.fire({ icon: 'success', title: 'Retur Berhasil', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
                    const b = window.bootstrap || await (typeof bootstrapP !== 'undefined' ? bootstrapP : ensureBootstrap().catch(() => null));
                    b?.Modal.getOrCreateInstance(modal)?.hide();
                    await loadData(state.currentSort.field, state.currentSort.direction);
                } catch (err) {
                    console.error(err);
                    Swal.fire('Gagal', String(err.message || err), 'error');
                }
            });
        }
    }

    function handleSatuanSelectChange(selectEl) {
        const row = selectEl.closest('tr');
        const produkId = row?.dataset?.id;
        if (!produkId) return;
        const produk = state.allProducts.find(p => p.id == produkId);
        if (!produk) return;

        const satuan = selectEl.value;
        if (selectEl.options[selectEl.selectedIndex]?.disabled) {
            selectEl.value = produk.satuan;
            return;
        }
        // Update harga
        let hargaBeli = produk.harga_beli || 0;
        let hargaJual = produk.harga_jual || 0;
        if (Array.isArray(produk.multi_harga) && produk.multi_harga.length > 0) {
            const hargaSatuan = produk.multi_harga.find(h => h.satuan === satuan);
            if (hargaSatuan) {
                hargaBeli = hargaSatuan.harga_beli || hargaBeli;
                hargaJual = hargaSatuan.harga_jual || hargaJual;
            }
        }
        row.querySelector('.harga-beli-cell').textContent = formatCurrency(hargaBeli);
        row.querySelector('.harga-jual-cell').textContent = formatCurrency(hargaJual);

        // Update stok tampilan
        const konversiObj = {};
        if (Array.isArray(produk.konversi_satuan)) {
            produk.konversi_satuan.forEach(k => { konversiObj[k.satuan_besar] = Number(k.konversi) || 0; });
        }
        const satuanDasar = produk.satuan;
        const stokPcs = produk.stok || 0;
        const konv = Number(konversiObj[satuan]);
        const stokTampil = (satuan === satuanDasar) ? stokPcs : (konv > 0 ? Math.floor(stokPcs / konv) : 0);
        const stokBadge = stokTampil <= 10
            ? `<span class="badge bg-danger">${stokTampil}</span>`
            : `<span class="badge bg-secondary">${stokTampil}</span>`;
        row.querySelector('.stok-cell').innerHTML = stokBadge;
    }

    function debounce(fn, wait = 120) {
        let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
    }

    // =============== BARCODE PREVIEW (opsional) ===============
    async function generateBarcode(target, value, options = {}) {
        const lib = await ensureJsBarcode().catch(() => null);
        const JsBarcode = lib?.default || lib;
        if (!JsBarcode) return 0;

        // Normalisasi target: selector string, Element, atau NodeList/Array
        let elements = [];
        if (typeof target === 'string') {
            elements = Array.from(document.querySelectorAll(target));
        } else if (target instanceof Element) {
            elements = [target];
        } else if (target && typeof target.length === 'number') {
            elements = Array.from(target).filter(Boolean);
        }
        if (!elements.length) return 0;

        const code = String(value ?? '').trim();
        const opts = {
            format: 'CODE128',
            lineColor: '#000',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 4,
            ...options
        };

        let ok = 0;
        for (const host of elements) {
            try {
                const tag = (host.tagName || '').toLowerCase();
                let targetEl = host;
                if (!['svg', 'img', 'canvas'].includes(tag)) {
                    host.innerHTML = '';
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', String(opts.height));
                    host.appendChild(svg);
                    targetEl = svg;
                }
                JsBarcode(targetEl, code, opts);
                if (targetEl.tagName?.toLowerCase() === 'img') targetEl.alt = code;
                ok++;
            } catch (e) {
                try { host.innerHTML = `<div class="text-muted small">Barcode: ${code || '-'}</div>`; } catch { }
            }
        }
        return ok;
    }

    // =============== GLOBAL (untuk onclick HTML) ===============
    window.tambahBarcode = tambahBarcode;
    window.hapusBarcode = hapusBarcode;
    window.tambahBarcodeBaru = tambahBarcodeBaru;
    window.generateRandomBarcode = generateRandomBarcode;
    window.updateBarcodePreview = updateBarcodePreview;
    window.tambahKonversiSatuan = tambahKonversiSatuan;
    window.hapusKonversiSatuan = hapusKonversiSatuan;
    window.tambahDiskonBaru = tambahDiskonBaru;
    window.hapusDiskon = hapusDiskon;
    window.toggleWaktuDiskon = toggleWaktuDiskon;
    window.generateBarcode = generateBarcode;

    // Start
    startProduk();
}
