// SIMPLIFIED: Keep only essential functions
document.addEventListener('DOMContentLoaded', function () {

    const DOM = {
        meta: {
            csrfToken: document.querySelector('meta[name="csrf-token"]').content
        },
        table: {
            body: document.getElementById('tableBody'),
            selectAll: document.getElementById('selectAll'),
            sortableHeaders: document.querySelectorAll('.sortable')
        },
        modals: {
            baru: new bootstrap.Modal('#baruProdukModal'),
            hapus: new bootstrap.Modal('#hapusProdukModal')
        },
        filters: {
            kategori: document.getElementById('kategoriFilter'),
            supplier: document.getElementById('supplierFilter'),
        }
    };

    const state = {
        currentSort: { field: 'nama_produk', direction: 'asc' },
        totals: { produk: 0, stok: 0, modal: 0, nilaiProduk: 0 },
        allProducts: [],
        isEditMode: false,
        selectedProduk: [],
        newProduct: { barcodes: [] }, // SIMPLIFIED: hanya barcode
        currentStep: 1,
        maxStep: 3,
        productDrafts: {}
    };

    const pagination = {
        page: 1,
        pageSize: 10
    };

    // INITIALIZATION
    function init() {
        loadData(state.currentSort.field, state.currentSort.direction);
        setupEventListeners();
    }

    function setupEventListeners() {
        if (window.produkEventListenersAttached) return;

        // Table interactions
        document.addEventListener('click', function(e) {
            if (e.target.closest('#tableBody')) {
                handleTableClick(e);
            }
            if (e.target.closest('#produkPagination')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (!isNaN(page) && page > 0) {
                    pagination.page = page;
                    performSimpleSearch();
                }
            }
        });

        const pageSizeSelect = document.getElementById('produkPageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', function(e) {
                pagination.pageSize = parseInt(e.target.value);
                pagination.page = 1;
                performSimpleSearch();
            });
        }

        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('row-checkbox')) {
                handleRowCheckboxChange(e.target);
            }
        });

        // Search
        const searchInput = document.getElementById('searchProdukInput');
        if (searchInput) {
            searchInput.addEventListener('input', performSimpleSearch);
        }

        // Export buttons
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                exportToExcel();
            });
        }
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                exportToPdf();
            });
        }

        // Filters and sorting
        DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));
        DOM.filters.kategori.addEventListener('change', performSimpleSearch);
        DOM.filters.supplier.addEventListener('change', performSimpleSearch);
        DOM.table.selectAll.addEventListener('change', handleSelectedRow);

        // Modal buttons - HANYA save button
        document.getElementById('baruProdukBtn').addEventListener('click', initializeProductModal);
        document.getElementById('saveProductBtn').addEventListener('click', saveCompleteProduct);
        document.getElementById('hapusProdukBtn').addEventListener('click', deleteSelected);

        // Modal events
        const modalElement = document.getElementById('baruProdukModal');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', function() {
                setupModalEventListeners();
            });

            modalElement.addEventListener('hidden.bs.modal', function() {
                // Reset modal state when closed
                state.newProduct = {
                    barcodes: [],
                    konversiSatuan: [],
                    diskon: []
                };

                // Clear all form inputs
                const form = document.getElementById('formTambahProduk');
                if (form) {
                    form.reset();
                    form.querySelectorAll('input').forEach(input => {
                        input.value = '';
                        input.removeAttribute('value');
                    });
                }
            });
        }

        // Edit mode buttons
        const editTableBtn = document.getElementById('editTableBtn');
        const exitEditModeBtn = document.getElementById('exitEditModeBtn');
        if (editTableBtn) editTableBtn.addEventListener('click', enterEditMode);
        if (exitEditModeBtn) exitEditModeBtn.addEventListener('click', exitEditMode);

        // Restok button
        const restokBtn = document.getElementById('restokProdukBtn');
        if (restokBtn) {
            restokBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!state.selectedProduk || state.selectedProduk.length === 0) {
                    Swal.fire({
                        title: 'Pilih Produk!',
                        text: 'Silakan pilih produk yang akan direstok terlebih dahulu.',
                        icon: 'warning',
                        confirmButtonText: 'OK'
                    });
                    return;
                }

                showRestokModal();
                const modal = new bootstrap.Modal(document.getElementById('restokProdukModal'));
                modal.show();
            });
        }

        restokBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!state.selectedProduk || state.selectedProduk.length === 0) {
                Swal.fire({
                    title: 'Pilih Produk!',
                    text: 'Silakan pilih produk yang akan direstok terlebih dahulu.',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            showRestokModal();
            const modal = new bootstrap.Modal(document.getElementById('restokProdukModal'));
            modal.show();
        });

        const returBtn = document.getElementById('returProdukBtn');
        if (returBtn) {
            returBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (!state.selectedProduk || state.selectedProduk.length === 0) {
                    Swal.fire({
                        title: 'Pilih Produk!',
                        text: 'Silakan pilih produk yang akan diretur terlebih dahulu.',
                        icon: 'warning',
                        confirmButtonText: 'OK'
                    });
                    return;
                }

                showReturModal();
                const modal = new bootstrap.Modal(document.getElementById('returProdukModal'));
                modal.show();
            });
        }

        const restokModalEl = document.getElementById('restokProdukModal');
        if (restokModalEl) {
            restokModalEl.addEventListener('hidden.bs.modal', function () {
                // Hapus backdrop jika masih ada
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
        }

        window.produkEventListenersAttached = true;
    }

    // DATA LOADING
    async function loadData(sortField, sortDirection) {
        try {
            const response = await fetch(`/api/produk?sort=${sortField}&order=${sortDirection}`, {
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Gagal memuat data');
            }

            const produkList = await response.json();
            state.allProducts = produkList;

            renderTable(state.allProducts);
            updateTotals(state.allProducts);
            populateFilters(state.allProducts);

        } catch (error) {
            console.error('Error:', error);
            DOM.table.body.innerHTML = `
                <tr><td colspan="9" class="text-center text-danger">GAGAL MEMUAT DATA: ${error.message}</td></tr>
            `;
        }
    }

    // SEARCH & FILTER
    function performSimpleSearch() {
        const filteredData = getCurrentFilteredData();
        renderTable(filteredData);
        updateTotals(filteredData);

        // Update page size selector value
        const pageSizeSelect = document.getElementById('produkPageSize');
        if (pageSizeSelect && pageSizeSelect.value != pagination.pageSize) {
            pageSizeSelect.value = pagination.pageSize;
        }
    }

    // TABLE RENDERING
    function renderTable(data) {
        if (!Array.isArray(data) || data.length === 0) {
            DOM.table.body.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">TIDAK ADA DATA</td></tr>`;
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

        // Tempatkan di dalam renderTable, sebelum rows.map
        function getStokBySatuan(stokPcs, satuan, satuanDasar, konversiObj) {
            if (satuan === satuanDasar) return stokPcs;
            const konversi = Number(konversiObj[satuan]);
            if (konversi && konversi > 0) {
                return Math.floor(stokPcs / konversi);
            }
            return 0;
        }

        const rows = pagedData.map(item => {
            const isSelected = selectedIds.has(item.id);

            // Ambil semua satuan (dasar + konversi)
            let satuanList = [item.satuan || ''];
            let konversiObj = {};
            if (Array.isArray(item.konversi_satuan)) {
                satuanList = satuanList.concat(item.konversi_satuan.map(k => k.satuan_besar));
                item.konversi_satuan.forEach(k => {
                    konversiObj[k.satuan_besar] = Number(k.konversi) || 0; // <-- pastikan gunakan 'konversi' saja
                });
            }
            satuanList = [...new Set(satuanList.filter(Boolean))];

            // Harga beli & jual default (satuan dasar)
            let hargaBeli = item.harga_beli || 0;
            let hargaJual = item.harga_jual || 0;
            if (Array.isArray(item.multi_harga) && item.multi_harga.length > 0) {
                const hargaSatuan = item.multi_harga.find(h => h.satuan === item.satuan);
                if (hargaSatuan) {
                    hargaBeli = hargaSatuan.harga_beli || hargaBeli;
                    hargaJual = hargaSatuan.harga_jual || hargaJual;
                }
            }

            // Cek multi harga
            let multiHarga = Array.isArray(item.multi_harga) ? item.multi_harga : [];
            let satuanDasar = item.satuan;
            let enabledSatuan = multiHarga.length > 1 ? satuanList : [satuanDasar];

            // Dropdown satuan: disable opsi selain satuan dasar jika multi harga hanya satu
            let satuanCell;
            if (satuanList.length > 1) {
                satuanCell = `
                    <select class="form-select form-select-sm satuan-table-select" data-id="${item.id}">
                        ${satuanList.map(s => `
                            <option value="${s}" ${enabledSatuan.includes(s) ? '' : 'disabled'}>
                                ${s}
                            </option>
                        `).join('')}
                    </select>
                `;
            } else {
                satuanCell = satuanList[0] || '';
            }

            // Default satuan yang dipilih (satuan dasar)
            let satuanTerpilih = satuanDasar;

            // Stok sesuai satuan terpilih
            let stokTampil = getStokBySatuan(item.stok || 0, satuanTerpilih, satuanDasar, konversiObj);
            const stokBadge = stokTampil <= 10
                ? `<span class="badge bg-danger">${stokTampil}</span>`
                : `<span class="badge bg-secondary">${stokTampil}</span>`;

            return `
                <tr data-id="${item.id}">
                    <td class="text-center">
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="editable-cell" data-field="nama_produk">${item.nama_produk || ''}</td>
                    <td class="editable-cell" data-field="kategori">${item.kategori || ''}</td>
                    <td class="editable-cell" data-field="supplier">${item.supplier || ''}</td>
                    <td>${satuanCell}</td>
                    <td class="editable-cell stok-cell" data-field="stok">${stokBadge}</td>
                    <td class="editable-cell harga-beli-cell" data-field="harga_beli">${formatCurrency(hargaBeli)}</td>
                    <td class="editable-cell harga-jual-cell" data-field="harga_jual">${formatCurrency(hargaJual)}</td>
                    <td>${formatRelativeDate(item.updated_at)}</td>
                </tr>
            `;
        });

        DOM.table.body.innerHTML = rows.join('');
        renderPagination(totalPages, pagination.page);
        updatePaginationInfo(data.length, startIdx + 1, Math.min(endIdx, data.length));

        // Event listener: update harga beli/jual & stok saat satuan diubah
        document.querySelectorAll('.satuan-table-select').forEach(select => {
            select.addEventListener('change', function() {
                const row = this.closest('tr');
                const produkId = row.dataset.id;
                const produk = state.allProducts.find(p => p.id == produkId);
                const satuan = this.value;

                // Jika opsi disabled, jangan update harga/stok
                if (this.options[this.selectedIndex].disabled) {
                    this.value = produk.satuan; // Kembalikan ke satuan dasar
                    return;
                }

                // Harga beli & jual
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

                // Stok
                let satuanDasar = produk.satuan;
                let konversiObj = {};
                if (Array.isArray(produk.konversi_satuan)) {
                    produk.konversi_satuan.forEach(k => {
                        konversiObj[k.satuan_besar] = Number(k.konversi) || 0; // <-- pastikan gunakan 'konversi' saja
                    });
                }
                let stokTampil = getStokBySatuan(produk.stok || 0, satuan, satuanDasar, konversiObj);
                const stokBadge = stokTampil <= 10
                    ? `<span class="badge bg-danger">${stokTampil}</span>`
                    : `<span class="badge bg-secondary">${stokTampil}</span>`;
                row.querySelector('.stok-cell').innerHTML = stokBadge;
            });
        });
    }

    function updatePaginationInfo(totalData, startItem, endItem) {
        const infoElement = document.getElementById('paginationInfo');
        if (infoElement) {
            infoElement.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalData} data`;
        }
    }

    function renderPagination(totalPages, currentPage) {
        const paginationEl = document.getElementById('produkPagination');
        if (!paginationEl || totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>`;

        // Page numbers logic
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Adjust if we're near the beginning or end
        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        // First page and ellipsis
        if (startPage > 1) {
            html += `<li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>`;
            }
            html += `<li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>`;
        }

        // Next button
        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>`;

        paginationEl.innerHTML = html;
    }

    // RESTORED: IMPORTANT saveCellEdit function
    async function saveCellEdit(cell) {
        const row = cell.closest('tr');
        const produkId = row.dataset.id;
        const field = cell.dataset.field;
        let newValue = cell.textContent.trim();

        const originalProduct = state.allProducts.find(p => p.id == produkId);
        if (!originalProduct) {
            await Swal.fire({
                title: 'Error!',
                text: 'Produk tidak ditemukan',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Skip jika tidak ada perubahan
        if (originalProduct[field] == newValue) return;

        try {
            cell.style.backgroundColor = '#fff3cd'; // Loading indicator

            let updateData = {};

            // Handle different field types dengan parsing yang benar
            switch (field) {
                case 'stok':
                    // Ambil angka dari badge
                    const stokMatch = newValue.match(/\d+/);
                    updateData[field] = stokMatch ? parseInt(stokMatch[0]) : 0;
                    break;
                case 'harga_beli':
                case 'harga_jual':
                    // Parse currency format (Rp 123.456)
                    updateData[field] = parseInt(newValue.replace(/[^\d]/g, '')) || 0;
                    break;
                default:
                    updateData[field] = newValue;
            }

            // PERBAIKI: Sesuaikan dengan route di web.php (PUT method)
            const response = await fetch(`/api/produk/${produkId}`, {
                method: 'PUT', // Sesuai dengan Route::put('/produk/{id}')
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                },
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
                // Update state dengan data terbaru
                Object.assign(originalProduct, updateData);

                // Update updated_at ke waktu sekarang (real time)
                const now = new Date();
                originalProduct.updated_at = now.toISOString();

                // Update display dengan format yang benar
                if (field.includes('harga')) {
                    cell.textContent = formatCurrency(updateData[field]);
                } else if (field === 'stok') {
                    const stok = updateData[field];
                    const badge = stok <= 10 ? 'bg-danger' : 'bg-secondary';
                    cell.innerHTML = `<span class="badge ${badge}">${stok}</span>`;
                }

                // Update kolom updated_at di baris tabel
                const updatedCell = row.querySelector('td:last-child');
                if (updatedCell) {
                    updatedCell.textContent = formatRelativeDate(originalProduct.updated_at);
                }

                // Success styling
                cell.style.backgroundColor = '#d1e7dd';
                setTimeout(() => {
                    cell.style.backgroundColor = state.isEditMode ? '#f8f9fa' : '';
                }, 2000);

                // Success notification
                await Swal.fire({
                    title: 'Berhasil!',
                    text: `${field.replace('_', ' ')} berhasil diperbarui`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });

                // Update totals jika perlu
                updateTotals(state.allProducts);

            } else {
                throw new Error(responseData.message || 'Gagal menyimpan perubahan');
            }

        } catch (error) {
            console.error('Save error:', error);

            // Restore original value dengan format yang benar
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
            setTimeout(() => {
                cell.style.backgroundColor = state.isEditMode ? '#f8f9fa' : '';
            }, 2000);

            // Error notification
            await Swal.fire({
                title: 'Gagal Menyimpan!',
                html: `
                    <div class="text-center">
                        <p class="mb-2">Terjadi kesalahan saat menyimpan:</p>
                        <div class="alert alert-danger">
                            ${error.message}
                        </div>
                    </div>
                `,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    function updateTotals(data) {
        // Hitung total produk, stok, modal, nilai produk
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

        if (elements.totalProduk) elements.totalProduk.textContent = totals.produk.toLocaleString('id-ID');
        if (elements.totalStok) elements.totalStok.textContent = totals.stok.toLocaleString('id-ID');
        if (elements.totalModal) elements.totalModal.textContent = formatCurrency(totals.modal);
        if (elements.totalNilaiProduk) elements.totalNilaiProduk.textContent = formatCurrency(totals.nilaiProduk);
    }

    // SORTING
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
            if (header.getAttribute('data-sort') === state.currentSort.field) {
                icon.className = `fas fa-sort-${state.currentSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    // MODAL MANAGEMENT - SIMPLIFIED
    function initializeProductModal() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const isEditMode = selectedCheckboxes.length > 0;

        // Reset product state
        state.newProduct = {
            barcodes: [],
            konversiSatuan: [],
            diskon: []
        };

        if (isEditMode) {
            state.selectedProduk = Array.from(selectedCheckboxes).map(checkbox => {
                return state.allProducts.find(p => p.id == checkbox.dataset.id);
            });
            populateFormWithProduct(state.selectedProduk[0]);
            loadExistingBarcodes(state.selectedProduk[0].id);
            loadExistingSatuan(state.selectedProduk[0].id);   // <-- Tambahkan ini
            loadExistingDiskon(state.selectedProduk[0].id);   // <-- Tambahkan ini
        } else {
            // Reset form untuk produk baru
            const form = document.getElementById('formTambahProduk');
            form.reset();

            // Reset semua input fields supaya tidak ada jejak
            form.querySelectorAll('input').forEach(input => {
                input.value = '';
                input.removeAttribute('value');
            });

            // Set default values
            form.querySelector('[name="stok"]').value = '0';
            form.querySelector('#newJumlahSatuan').value = '1';

            state.selectedProduk = [];
        }

        DOM.modals.baru.show();

        // Setup modal event listeners setiap kali modal dibuka
        setTimeout(() => {
            setupModalEventListeners();
            renderBarcodeList();
            renderKonversiSatuanList();
            renderDiskonList();
            setupTabNavigation();
        }, 100);
    }

    function setupTabNavigation() {
        // Show tab navigation
        const tabNavigation = document.getElementById('tambahProdukTabs');
        if (tabNavigation) {
            tabNavigation.style.display = 'flex';
        }

        // Reset tab content ke default state
        document.querySelectorAll('.tab-pane').forEach((pane, index) => {
            pane.classList.remove('show', 'active');
            if (index === 0) {
                pane.classList.add('show', 'active');
            }
        });

        // Reset tab navigation ke default
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach((link, index) => {
            link.classList.remove('active');
            if (index === 0) {
                link.classList.add('active');
            }
        });

        // Setup tab click handlers
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach(tab => {
            tab.removeEventListener('click', handleTabClick);
            tab.addEventListener('click', handleTabClick);
        });

        // Update step counters
        updateStepCounters();

        // Update modal header
        updateModalHeader();
    }

    function updateModalHeader() {
        const modalTitle = document.querySelector('#baruProdukModal .modal-title');
        const isEditMode = state.selectedProduk.length > 0;

        if (isEditMode) {
            if (state.selectedProduk.length === 1) {
                const productName = state.selectedProduk[0].nama_produk || 'Produk Tanpa Nama';
                modalTitle.innerHTML = `
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <i class="fas fa-edit"></i>
                        <span>Edit Produk:</span>
                        <span class="text-warning fw-bold">${productName}</span>
                    </div>
                `;
            } else {
                const options = state.selectedProduk.map((p) =>
                    `<option value="${p.id}">${p.nama_produk || 'Produk Tanpa Nama'}</option>`
                ).join('');
                modalTitle.innerHTML = `
                    <div class="d-flex align-items-center gap-3 flex-wrap">
                        <i class="fas fa-edit"></i>
                        <span class="text-warning fw-bold">${state.selectedProduk.length} Produk Dipilih</span>
                        <div class="d-flex align-items-center gap-2">
                            <select id="selectEditProduk" class="form-select form-select border-primary" style="min-width:180px;">
                                ${options}
                            </select>
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    const select = document.getElementById('selectEditProduk');
                    if (select) {
                        let lastSelectedId = parseInt(select.value);

                        select.addEventListener('change', function() {
                            // Simpan draft produk sebelumnya
                            saveCurrentProductDraft(lastSelectedId);

                            // Load produk baru
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

                        // Saat pertama kali select muncul, load draft jika ada
                        const firstId = parseInt(select.value);
                        lastSelectedId = firstId;
                        const produk = state.selectedProduk.find(p => p.id === firstId);
                        if (produk) {
                            loadProductDraftToForm(firstId, produk);
                            loadExistingBarcodes(produk.id);
                            loadExistingSatuan(produk.id);
                            loadExistingDiskon(produk.id);
                        }
                    }
                }, 100);
            }
        } else {
            modalTitle.innerHTML = `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <i class="fas fa-plus-circle"></i>
                    <span>Tambah Produk Baru</span>
                </div>
            `;
        }
    }

    function saveCurrentProductDraft(produkId) {
        const form = document.getElementById('formTambahProduk');
        if (!produkId || !form) return;

        // Ambil data dari form
        const draft = {
            nama_produk: form.querySelector('[name="nama_produk"]').value,
            kategori: form.querySelector('[name="kategori"]').value,
            supplier: form.querySelector('[name="supplier"]').value,
            satuan: form.querySelector('[name="satuan"]').value,
            stok: form.querySelector('[name="stok"]').value,
            harga_beli: form.querySelector('[name="harga_beli"]').value,
            harga_jual: form.querySelector('[name="harga_jual"]').value,
            barcodes: JSON.parse(JSON.stringify(state.newProduct.barcodes || [])),
            konversiSatuan: JSON.parse(JSON.stringify(state.newProduct.konversiSatuan || [])),
            diskon: JSON.parse(JSON.stringify(state.newProduct.diskon || []))
        };
        state.productDrafts[produkId] = draft;
    }

    function loadProductDraftToForm(produkId, produk) {
        const draft = state.productDrafts[produkId];
        if (draft) {
            // Isi form dari draft
            const form = document.getElementById('formTambahProduk');
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
            // Jika belum ada draft, isi dari produk asli
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

        // Update active tab
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });

        const targetPane = document.querySelector(targetId);
        if (targetPane) {
            targetPane.classList.add('show', 'active');
        }

    }

    function updateStepCounters() {
        // Update barcode count
        const barcodeTab = document.querySelector('#step3-tab .badge');
        if (barcodeTab) {
            const count = state.newProduct.barcodes ? state.newProduct.barcodes.length : 0;
            barcodeTab.textContent = count;
            barcodeTab.style.display = count > 0 ? 'inline' : 'none';
        }

        // Update satuan count
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

        // Update diskon count
        const diskonTab = document.querySelector('#step4-tab .badge');
        if (diskonTab) {
            const count = state.newProduct.diskon ? state.newProduct.diskon.length : 0;
            diskonTab.textContent = count;
            diskonTab.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    function populateFormWithProduct(product) {
        const form = document.getElementById('formTambahProduk');
        form.querySelector('[name="nama_produk"]').value = product.nama_produk || '';
        form.querySelector('[name="kategori"]').value = product.kategori || '';
        form.querySelector('[name="supplier"]').value = product.supplier || '';
        form.querySelector('[name="satuan"]').value = product.satuan || '';
        form.querySelector('[name="stok"]').value = product.stok || 0;

        // Format harga tanpa desimal/koma, hanya ribuan
        const hargaBeliInput = form.querySelector('[name="harga_beli"]');
        const hargaJualInput = form.querySelector('[name="harga_jual"]');

        if (hargaBeliInput) {
            hargaBeliInput.value = (parseInt(product.harga_beli, 10) || 0).toLocaleString('id-ID');
        }
        if (hargaJualInput) {
            hargaJualInput.value = (parseInt(product.harga_jual, 10) || 0).toLocaleString('id-ID');
        }

        setTimeout(() => {
            calculateMargin();
            handleSatuanInput({ target: form.querySelector('[name="satuan"]') });
        }, 100);
    }

    // RESTORED: Load existing barcodes
    async function loadExistingBarcodes(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/barcode`);
            if (response.ok) {
                const barcodeData = await response.json();
                state.newProduct.barcodes = barcodeData.map(b => ({
                    id: b.id,
                    kode_barcode: b.kode_barcode,
                    is_utama: b.is_utama,
                    isExisting: true
                }));
                state.oldBarcodes = JSON.parse(JSON.stringify(state.newProduct.barcodes));
                renderBarcodeList();
            }
        } catch (error) {
            console.error('Error loading barcodes:', error);
        }
    }

    // BARCODE MANAGEMENT - SIMPLIFIED
    function tambahBarcode() {
        const input = document.getElementById('newBarcodeInput');
        const kode = input.value.trim();

        if (!kode) {
            showAlert('Masukkan kode barcode', 'warning');
            return;
        }

        if (state.newProduct.barcodes.find(b => b.kode_barcode === kode)) {
            showAlert('Barcode sudah ada', 'warning');
            return;
        }

        const isUtama = state.newProduct.barcodes.length === 0;
        state.newProduct.barcodes.push({
            id: Date.now(),
            kode_barcode: kode,
            is_utama: isUtama
        });

        input.value = '';
        renderBarcodeList();
        showAlert('Barcode ditambahkan', 'success');
        // saveTracking({
        //     tipe: 'Produk',
        //     keterangan: `Edit produk: Edit Tabel kolom ${field} (${originalProduct.nama_produk})`,
        //     status: 'update Data',
        //     produk_id: produkId,
        //     nama_produk: originalProduct.nama_produk
        // });
    }

    async function hapusBarcode(id) {
        const barcodeDihapus = state.newProduct.barcodes.find(b => b.id === id);

        // Jika data sudah ada di database, hapus di backend
        if (barcodeDihapus && barcodeDihapus.isExisting) {
            try {
                await fetch(`/api/produk/barcode/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
                });
            } catch (e) {
                showAlert('Gagal menghapus barcode di server', 'danger');
                return;
            }
        }

        state.newProduct.barcodes = state.newProduct.barcodes.filter(b => b.id !== id);
        renderBarcodeList();
        showAlert('Barcode dihapus', 'success');

        if (barcodeDihapus) {
            saveTracking({
                tipe: 'Produk',
                keterangan: `Barcode "${barcodeDihapus.kode_barcode}" dihapus dari produk "${originalProduct.nama_produk}"`,
                status: 'Hapus Barcode',
                produk_id: produkId,
                nama_produk: originalProduct.nama_produk
            });
        }
    }

    function renderBarcodeList() {
        const container = document.getElementById('barcodeListContainer');
        if (!container) return;

        if (state.newProduct.barcodes.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3">Belum ada barcode</div>';
        } else {
            container.innerHTML = state.newProduct.barcodes.map(b => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                        <strong>${b.kode_barcode}</strong>
                        ${b.is_utama ? '<span class="badge bg-success ms-2">Utama</span>' : ''}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusBarcode(${b.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        updateBarcodeCounter();
        updateStepCounters(); // Update tab badges
    }

    function updateStepCounts() {
        // Update barcode count badge
        const barcodeCountBadge = document.querySelector('#step2-tab .badge');
        if (barcodeCountBadge) {
            barcodeCountBadge.textContent = state.newProduct.barcodes.length;
        }

        // Update other step counts if needed
        const stepCounts = {
            1: 'Data Dasar',
            2: state.newProduct.barcodes.length,
            3: 'Review'
        };

        Object.keys(stepCounts).forEach(step => {
            const badge = document.querySelector(`#step${step}-tab .badge`);
            if (badge && typeof stepCounts[step] === 'number') {
                badge.textContent = stepCounts[step];
                badge.style.display = stepCounts[step] > 0 ? 'inline' : 'none';
            }
        });
    }

    // SATUAN
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
        const satuanBesar = document.getElementById('newSatuanBesar').value.trim();
        const jumlahSatuan = parseFloat(document.getElementById('newJumlahSatuan').value);
        const konversiSatuan = parseFloat(document.getElementById('newKonversiSatuan').value);

        if (!satuanBesar) {
            showAlert('Masukkan satuan besar', 'warning');
            return;
        }
        if (!jumlahSatuan || jumlahSatuan <= 0) {
            showAlert('Masukkan jumlah satuan yang valid', 'warning');
            return;
        }
        if (!konversiSatuan || konversiSatuan <= 0) {
            showAlert('Masukkan nilai konversi yang valid', 'warning');
            return;
        }
        if (!state.newProduct.konversiSatuan) {
            state.newProduct.konversiSatuan = [];
        }
        if (state.newProduct.konversiSatuan.find(k => k.satuan_besar === satuanBesar)) {
            showAlert('Satuan sudah ada', 'warning');
            return;
        }

        state.newProduct.konversiSatuan.push({
            id: Date.now(),
            satuan_besar: satuanBesar,
            jumlah_satuan: jumlahSatuan,
            konversi_satuan: konversiSatuan,
            isExisting: false // <-- Penting!
        });

        document.getElementById('newSatuanBesar').value = '';
        document.getElementById('newJumlahSatuan').value = '1';
        document.getElementById('newKonversiSatuan').value = '';

        renderKonversiSatuanList();
        showAlert('Konversi satuan ditambahkan', 'success');
    }

    async function hapusKonversiSatuan(id) {
        if (!state.newProduct.konversiSatuan) return;

        const satuanDihapus = state.newProduct.konversiSatuan.find(k => k.id === id);

        // Jika data sudah ada di database, hapus di backend
        if (satuanDihapus && satuanDihapus.isExisting) {
            try {
                await fetch(`/api/produk/satuan/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
                });
            } catch (e) {
                showAlert('Gagal menghapus satuan di server', 'danger');
                return;
            }
        }

        state.newProduct.konversiSatuan = state.newProduct.konversiSatuan.filter(k => k.id !== id);
        renderKonversiSatuanList();
        showAlert('Konversi satuan dihapus', 'success');

        if (satuanDihapus) {
            saveTracking({
                tipe: 'Produk',
                keterangan: `Satuan "${satuanDihapus.satuan_besar}" dihapus dari produk "${state.selectedProduk[0]?.nama_produk}"`,
                status: 'Hapus Satuan',
                produk_id: state.selectedProduk[0]?.id,
                nama_produk: state.selectedProduk[0]?.nama_produk
            });
        }
    }

    function renderKonversiSatuanList() {
        const container = document.getElementById('konversiSatuanList');
        if (!container) return;

        // Filter hanya data yang valid
        const dataValid = (state.newProduct.konversiSatuan || []).filter(k =>
            typeof k.jumlah_satuan === 'number' && k.jumlah_satuan > 0 &&
            typeof k.konversi_satuan === 'number' && k.konversi_satuan > 0 &&
            k.satuan_besar && String(k.satuan_besar).trim() !== ''
        );

        if (dataValid.length === 0) {
            container.innerHTML = `
                <div class="empty-state text-center py-4">
                    <i class="fas fa-balance-scale fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Belum ada konversi satuan</p>
                </div>
            `;
        } else {
            container.innerHTML = dataValid.map(k => `
                <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded bg-light">
                    <div>
                        <strong>${k.jumlah_satuan} ${k.satuan_besar}</strong> =
                        <span class="text-primary">${k.konversi_satuan} ${(document.querySelector('[name="satuan"]').value || 'pcs')}</span>
                    </div>
                    <button type="button"  class="btn btn-sm btn-outline-danger" onclick="hapusKonversiSatuan(${k.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        updateSatuanCounter();
        updateStepCounters();
    }

    function updateSatuanCounter() {
        const counter = document.getElementById('satuanCount');
        if (counter) {
            // Hanya hitung satuan yang valid
            const validSatuan = (state.newProduct.konversiSatuan || []).filter(k =>
                typeof k.jumlah_satuan === 'number' && k.jumlah_satuan > 0 &&
                typeof k.konversi_satuan === 'number' && k.konversi_satuan > 0 &&
                k.satuan_besar && String(k.satuan_besar).trim() !== ''
            );
            counter.textContent = validSatuan.length;
        }
    }

    // DISKON
    async function loadExistingDiskon(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/diskon`);
            if (response.ok) {
                const diskonData = await response.json();
                state.newProduct.diskon = diskonData.map(d => ({
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
        const jumlahMinimum = parseInt(document.getElementById('newDiskonMinimum').value) || 0;
        const diskonPersen = parseFloat(document.getElementById('newDiskonPersen').value) || 0;
        const tanpaWaktu = document.getElementById('diskonTanpaWaktu').checked;
        const mulai = document.getElementById('diskonMulai').value;
        const berakhir = document.getElementById('diskonBerakhir').value;

        if (jumlahMinimum <= 0) {
            showAlert('Masukkan jumlah minimum yang valid', 'warning');
            return;
        }
        if (diskonPersen <= 0 || diskonPersen > 100) {
            showAlert('Masukkan diskon antara 0.01% - 100%', 'warning');
            return;
        }
        if (!tanpaWaktu && (!mulai || !berakhir)) {
            showAlert('Masukkan tanggal mulai dan berakhir', 'warning');
            return;
        }
        if (!tanpaWaktu && new Date(mulai) >= new Date(berakhir)) {
            showAlert('Tanggal berakhir harus setelah tanggal mulai', 'warning');
            return;
        }
        if (!state.newProduct.diskon) {
            state.newProduct.diskon = [];
        }
        if (state.newProduct.diskon.find(d => d.jumlah_minimum === jumlahMinimum)) {
            showAlert('Diskon untuk jumlah minimum ini sudah ada', 'warning');
            return;
        }

        state.newProduct.diskon.push({
            id: Date.now(),
            jumlah_minimum: jumlahMinimum,
            diskon: diskonPersen,
            is_tanpa_waktu: tanpaWaktu,
            tanggal_mulai: tanpaWaktu ? null : mulai,
            tanggal_berakhir: tanpaWaktu ? null : berakhir,
            isExisting: false // <-- Penting!
        });

        // Reset form
        document.getElementById('newDiskonMinimum').value = '';
        document.getElementById('newDiskonPersen').value = '';
        document.getElementById('diskonTanpaWaktu').checked = true;
        document.getElementById('diskonMulai').value = '';
        document.getElementById('diskonBerakhir').value = '';
        toggleWaktuDiskon();

        renderDiskonList();
        showAlert('Diskon ditambahkan', 'success');
    }

    async function hapusDiskon(id) {
        if (!state.newProduct.diskon) return;
        const diskonDihapus = state.newProduct.diskon.find(d => d.id === id);

        if (diskonDihapus && diskonDihapus.isExisting) {
            try {
                await fetch(`/api/produk/diskon/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
                });
            } catch (e) {
                showAlert('Gagal menghapus diskon di server', 'danger');
                return;
            }
        }

        state.newProduct.diskon = state.newProduct.diskon.filter(d => d.id !== id);
        renderDiskonList();
        showAlert('Diskon dihapus', 'success');

        if (diskonDihapus) {
            saveTracking({
                tipe: 'Produk',
                keterangan: `Diskon dihapus dari produk "${state.selectedProduk[0]?.nama_produk}"`,
                status: 'Hapus Diskon',
                produk_id: state.selectedProduk[0]?.id,
                nama_produk: state.selectedProduk[0]?.nama_produk
            });
        }
    }

    function renderDiskonList() {
        const container = document.getElementById('diskonListContainer');
        if (!container) return;

        if (!state.newProduct.diskon || state.newProduct.diskon.length === 0) {
            container.innerHTML = `
                <div class="empty-state text-center py-4">
                    <i class="fas fa-percent fa-2x text-muted mb-2"></i>
                    <p class="text-muted">Belum ada diskon</p>
                </div>
            `;
        } else {
            container.innerHTML = state.newProduct.diskon.map(d => {
                const waktuText = d.is_tanpa_waktu ?
                    '<span class="badge bg-success">Permanen</span>' :
                    `<small class="text-muted">${formatDate(d.tanggal_mulai)} - ${formatDate(d.tanggal_berakhir)}</small>`;

                return `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded bg-light">
                        <div>
                            <div>
                                <strong>Min. ${d.jumlah_minimum} ${document.querySelector('[name="satuan"]').value || 'pcs'}</strong>
                                → <span class="text-primary">${d.diskon}% diskon</span>
                            </div>
                            ${waktuText}
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusDiskon(${d.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }).join('');
        }

        updateDiskonCounter();
        updateStepCounters(); // Update tab badges
    }

    function updateDiskonCounter() {
        const counter = document.getElementById('diskonCount');
        if (counter) {
            const count = state.newProduct.diskon ? state.newProduct.diskon.length : 0;
            counter.textContent = count;
        }
    }

    function toggleWaktuDiskon() {
        const checkbox = document.getElementById('diskonTanpaWaktu');
        const container = document.getElementById('waktuDiskonContainer');

        if (container) {
            container.style.display = checkbox.checked ? 'none' : 'block';
        }
    }

    // SAVE PRODUCT - SIMPLIFIED
    async function saveCompleteProduct() {
        const form = document.getElementById('formTambahProduk');
        const isEditMode = state.selectedProduk && state.selectedProduk.length > 0;

        // Jika multi-edit, simpan draft terakhir yang aktif
        if (isEditMode && state.selectedProduk.length > 1) {
            const select = document.getElementById('selectEditProduk');
            if (select) {
                saveCurrentProductDraft(parseInt(select.value));
            }
        }

        // Ambil daftar produk yang akan disimpan (multi atau single)
        const produkList = isEditMode ? state.selectedProduk : [null];

        try {

            for (const produk of produkList) {
                let produkId = produk ? produk.id : null;
                let produkData, barcodes, konversiSatuan, diskon;

                if (isEditMode) {
                    // Ambil draft jika ada, fallback ke data form
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
                    // Tambah produk baru
                    const formData = new FormData(form);
                    produkData = {
                        nama_produk: formData.get('nama_produk'),
                        kategori: formData.get('kategori'),
                        supplier: formData.get('supplier'),
                        satuan: formData.get('satuan'),
                        stok: parseInt(formData.get('stok')) || 0,
                        harga_beli: parseInt(formData.get('harga_beli').replace(/[^\d]/g, '')) || 0,
                        harga_jual: parseInt(formData.get('harga_jual').replace(/[^\d]/g, '')) || 0
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
                    // Edit produk
                    response = await fetch(`/api/produk/${produkId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': DOM.meta.csrfToken
                        },
                        body: JSON.stringify(produkData)
                    });
                    result = await response.json();

                    await saveTracking({
                        tipe: 'Produk',
                        keterangan: `Produk "${produkData.nama_produk}" diperbarui (nama/harga/stok)`,
                        status: 'Diedit',
                        produk_id: produkId,
                        nama_produk: produkData.nama_produk
                    });

                } else {
                    // Tambah produk baru
                    response = await fetch('/api/produk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': DOM.meta.csrfToken
                        },
                        body: JSON.stringify(produkData)
                    });
                    result = await response.json();
                    produkId = result.data.id;

                    // 1. Tracking tambah produk
                    await saveTracking({
                        tipe: 'Produk',
                        keterangan: `Produk baru "${produkData.nama_produk}" ditambahkan`,
                        status: 'Ditambahkan',
                        produk_id: produkId,
                        nama_produk: produkData.nama_produk
                    });
                }

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal menyimpan');
                }

                // 2. Simpan satuan baru & tracking
                if (konversiSatuan && konversiSatuan.length > 0) {
                    for (const konversi of konversiSatuan) {
                        await fetch('/api/produk/satuan', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': DOM.meta.csrfToken
                            },
                            body: JSON.stringify({
                                produk_id: produkId,
                                satuan_besar: konversi.satuan_besar,
                                jumlah_satuan: konversi.jumlah_satuan,
                                konversi_satuan: konversi.konversi_satuan
                            })
                        });

                        // Tracking satuan
                        await saveTracking({
                            tipe: 'Produk',
                            keterangan: `Satuan "${konversi.satuan_besar}" ditambahkan ke produk "${produkData.nama_produk}"`,
                            status: 'Tambah Satuan',
                            produk_id: produkId,
                            nama_produk: produkData.nama_produk
                        });
                    }
                }

                // 3. Simpan barcode baru & tracking
                if (barcodes && barcodes.length > 0) {
                    for (const barcode of barcodes) {
                        await fetch('/api/produk/barcode', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': DOM.meta.csrfToken
                            },
                            body: JSON.stringify({
                                produk_id: produkId,
                                kode_barcode: barcode.kode_barcode,
                                is_utama: barcode.is_utama
                            })
                        });

                        // Tracking barcode
                        await saveTracking({
                            tipe: 'Produk',
                            keterangan: `Barcode "${barcode.kode_barcode}" ditambahkan ke produk "${produkData.nama_produk}"`,
                            status: 'Tambah Barcode',
                            produk_id: produkId,
                            nama_produk: produkData.nama_produk
                        });
                    }
                }

                // 4. Simpan diskon baru & tracking
                if (diskon && diskon.length > 0) {
                    for (const d of diskon) {
                        await fetch('/api/produk/diskon', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': DOM.meta.csrfToken
                            },
                            body: JSON.stringify({
                                produk_id: produkId,
                                jumlah_minimum: d.jumlah_minimum,
                                diskon: d.diskon,
                                is_tanpa_waktu: d.is_tanpa_waktu,
                                tanggal_mulai: d.tanggal_mulai,
                                tanggal_berakhir: d.tanggal_berakhir
                            })
                        });

                        // Tracking diskon
                        await saveTracking({
                            tipe: 'Produk',
                            keterangan: `Diskon ${d.diskon}% ditambahkan ke produk "${produkData.nama_produk}"`,
                            status: 'Tambah Diskon',
                            produk_id: produkId,
                            nama_produk: produkData.nama_produk
                        });
                    }

                }
            }

            await Swal.fire({
                title: 'Berhasil!',
                text: isEditMode && state.selectedProduk.length > 1
                    ? 'Semua perubahan produk berhasil disimpan.'
                    : 'Produk lengkap berhasil disimpan',
                icon: 'success',
                confirmButtonText: 'OK',
                timer: 3000,
                timerProgressBar: true
            });

            DOM.modals.baru.hide();
            await loadData(state.currentSort.field, state.currentSort.direction);

        } catch (error) {
            console.error('Save error:', error);
            await Swal.fire({
                title: 'Gagal Menyimpan!',
                text: 'Terjadi kesalahan: ' + error.message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // SELECTION MANAGEMENT
    function handleTableClick(e) {
        const row = e.target.closest('tr');
        if (!row || !row.dataset.id) return;

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
            if (!state.selectedProduk.some(p => p.id === produkId)) {
                state.selectedProduk.push(produk);
            }
        } else {
            state.selectedProduk = state.selectedProduk.filter(p => p.id !== produkId);
        }

        updateSelectedCounter();
    }

    function handleSelectedRow() {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        const isChecked = DOM.table.selectAll.checked;

        checkboxes.forEach(checkbox => {
            const produkId = parseInt(checkbox.dataset.id);
            const produk = state.allProducts.find(p => p.id === produkId);

            checkbox.checked = isChecked;

            if (isChecked) {
                if (!state.selectedProduk.some(p => p.id === produkId)) {
                    state.selectedProduk.push(produk);
                }
            } else {
                state.selectedProduk = state.selectedProduk.filter(p => p.id !== produkId);
            }
        });

        updateSelectedCounter();
    }

    function updateSelectedCounter() {
        const selectedCount = state.selectedProduk.length;
        const counterElement = document.getElementById('selectedCounter');

        if (counterElement) {
            counterElement.textContent = selectedCount;
            counterElement.style.display = selectedCount > 0 ? 'inline' : 'none';
        }

        // const deleteBtn = document.getElementById('hapusProdukBtn');
        // if (deleteBtn) {
        //     deleteBtn.disabled = selectedCount === 0;
        // }

        // const restokBtn = document.getElementById('restokProdukBtn');
        // if (restokBtn) {
        //     restokBtn.disabled = selectedCount === 0;
        // }
    }

    // EDIT MODE - RESTORED IMPORTANT FUNCTION
    function enterEditMode() {
        state.isEditMode = true;

        const editBtn = document.getElementById('editTableBtn');
        const exitBtn = document.getElementById('exitEditModeBtn');
        const banner = document.getElementById('editModeBanner');

        if (editBtn) editBtn.classList.add('d-none');
        if (exitBtn) exitBtn.classList.remove('d-none');
        if (banner) banner.classList.remove('d-none');

        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.contentEditable = true;
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.border = '1px dashed #007bff';
            cell.style.cursor = 'text';

            // Remove existing listeners untuk avoid duplicate
            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);

            // Add event listeners
            cell.addEventListener('keypress', handleCellKeypress);
            cell.addEventListener('blur', handleCellBlur);
            cell.addEventListener('focus', handleCellFocus);
        });

        // Success notification
        Swal.fire({
            title: 'Mode Edit Aktif!',
            text: 'Klik sel untuk mengedit data. Tekan Enter atau klik di luar sel untuk menyimpan.',
            icon: 'info',
            timer: 3000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
        });
    }

    function exitEditMode() {
        state.isEditMode = false;

        const editBtn = document.getElementById('editTableBtn');
        const exitBtn = document.getElementById('exitEditModeBtn');
        const banner = document.getElementById('editModeBanner');

        if (editBtn) editBtn.classList.remove('d-none');
        if (exitBtn) exitBtn.classList.add('d-none');
        if (banner) banner.classList.add('d-none');

        document.querySelectorAll('.editable-cell').forEach(cell => {
            cell.contentEditable = false;
            cell.style.backgroundColor = '';
            cell.style.border = '';
            cell.style.cursor = '';

            // Remove event listeners
            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);
        });

        // Success notification
        Swal.fire({
            title: 'Mode Edit Dinonaktifkan',
            text: 'Tabel kembali ke mode normal',
            icon: 'success',
            timer: 2000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
        });
    }

    function handleCellKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // Trigger save
        }
    }

    function handleCellBlur(e) {
        saveCellEdit(e.target);
    }

    function handleCellFocus(e) {
        const cell = e.target;
        const field = cell.dataset.field;

        // Untuk field harga, hilangkan format saat editing
        if (field && field.includes('harga')) {
            const rawValue = cell.textContent.replace(/[^\d]/g, '');
            cell.textContent = rawValue;
        }

        // Untuk field stok, ambil angka dari badge
        if (field === 'stok') {
            const stokMatch = cell.textContent.match(/\d+/);
            if (stokMatch) {
                cell.textContent = stokMatch[0];
            }
        }

        cell.style.backgroundColor = '#fff3cd';
    }

    // DELETE FUNCTION - RESTORED
    async function deleteSelected() {
        if (state.selectedProduk.length === 0) {
            await Swal.fire({
                title: 'Tidak Ada Data',
                text: 'Pilih produk yang akan dihapus terlebih dahulu',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Prepare product list for display
        const produkNames = state.selectedProduk.slice(0, 3).map(p => p.nama_produk);
        const extraCount = state.selectedProduk.length > 3 ? state.selectedProduk.length - 3 : 0;

        // SweetAlert konfirmasi dengan input password
        const result = await Swal.fire({
            title: 'Konfirmasi Hapus Produk',
            html: `
                <div>
                    <p>Anda akan menghapus <strong>${state.selectedProduk.length} produk</strong> berikut:</p>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 5px;">
                        ${produkNames.map(name => `• ${name}`).join('<br>')}
                        ${extraCount > 0 ? `<br>• dan ${extraCount} produk lainnya...` : ''}
                    </div>
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 10px 0; border-radius: 5px; color: #721c24;">
                        <strong>Peringatan:</strong> Data yang dihapus tidak dapat dikembalikan!
                    </div>
                    <div style="margin-top: 15px;">
                        <label for="swal-password" style="display: block; margin-bottom: 5px; font-weight: bold;">
                            Masukkan Password untuk Konfirmasi:
                        </label>
                        <input type="password" id="swal-password" class="swal2-input"
                            placeholder="Password Anda" style="width: 100%; margin: 0;">
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
                if (!password) {
                    Swal.showValidationMessage('Password wajib diisi!');
                    return false;
                }
                if (password.length < 3) {
                    Swal.showValidationMessage('Password terlalu pendek!');
                    return false;
                }
                return password;
            }
        });

        // Jika user klik batal
        if (!result.isConfirmed) {
            return;
        }

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
                headers: {
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    ids: produkIds,
                    password: password
                })
            });

            // PERBAIKI: Check if response is JSON
            const contentType = response.headers.get('content-type');
            let responseData;

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                // If not JSON, get text and log it
                const responseText = await response.text();
                console.error('Non-JSON response:', responseText);
                throw new Error(`Server error: ${response.status} - ${responseText.substring(0, 100)}`);
            }

            console.log('Response data:', responseData); // Debug log

            if (response.ok && responseData.success) {
                // Success notification
                await Swal.fire({
                    title: 'Berhasil!',
                    text: `${state.selectedProduk.length} produk berhasil dihapus dari sistem.`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#198754',
                    timer: 3000,
                    timerProgressBar: true
                });

                // Reset selection dan reload data
                state.selectedProduk = [];
                updateSelectedCounter();
                await loadData(state.currentSort.field, state.currentSort.direction);
            } else if (response.status === 401) {
                // UNAUTHORIZED: Password salah
                await Swal.fire({
                    title: 'Password Salah!',
                    html: `
                        <div class="text-center">
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                Password yang Anda masukkan tidak sesuai dengan akun Anda.
                            </div>
                            <p class="text-muted">Silakan masukkan password yang benar untuk melanjutkan penghapusan data.</p>
                        </div>
                    `,
                    icon: 'error',
                    confirmButtonText: 'Coba Lagi',
                    confirmButtonColor: '#dc3545',
                    showCancelButton: true,
                    cancelButtonText: 'Batal',
                    cancelButtonColor: '#6c757d'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Panggil fungsi delete lagi untuk retry
                        setTimeout(() => deleteSelected(), 500);
                    }
                });
            } else {
                throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Delete error:', error);

            // Error notification dengan detail lebih lengkap
            await Swal.fire({
                title: 'Gagal Menghapus!',
                html: `
                    <div class="text-center">
                        <p class="mb-2">Terjadi kesalahan saat menghapus produk:</p>
                        <div class="alert alert-danger text-start">
                            <strong>Error:</strong> ${error.message}
                        </div>
                        <small class="text-muted">
                            Jika masalah ini terus berlanjut, silakan hubungi dukungan teknis.
                        </small>
                    </div>
                `,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // EXPORT FUNCTIONS - KEEP AS IS
    function exportToExcel() {
        try {
            const currentData = getCurrentFilteredData();
            if (currentData.length === 0) {
                showAlert('Tidak ada data untuk diekspor', 'warning');
                return;
            }

            const wb = XLSX.utils.book_new();

            const exportData = currentData.map((item, index) => ({
                'No': index + 1,
                'Nama Produk': item.nama_produk || '',
                'Kategori': item.kategori || '',
                'Supplier': item.supplier || '',
                'Satuan': item.satuan || '',
                'Stok': item.stok || 0,
                'Harga Beli': item.harga_beli || 0,
                'Harga Jual': item.harga_jual || 0
            }));



            const ws = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Data Produk');

            const filename = `data_produk_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, filename);

            showAlert('Excel berhasil diunduh', 'success');

        } catch (error) {
            showAlert('Gagal export Excel: ' + error.message, 'danger');
        }
    }

    function exportToPdf() {
        try {
            const currentData = getCurrentFilteredData();
            if (currentData.length === 0) {
                showAlert('Tidak ada data untuk diekspor', 'warning');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');

            doc.setFontSize(16);
            doc.text('DATA PRODUK', 148, 20, { align: 'center' });

            const tableData = currentData.map((item, index) => [
                index + 1,
                item.nama_produk || '',
                item.kategori || '',
                item.supplier || '',
                item.satuan || '',
                item.stok || 0,
                formatCurrency(item.harga_beli || 0).replace('Rp ', ''),
                formatCurrency(item.harga_jual || 0).replace('Rp ', '')
            ]);

            doc.autoTable({
                head: [['No', 'Nama Produk', 'Kategori', 'Supplier', 'Satuan', 'Stok', 'Harga Beli', 'Harga Jual']],
                body: tableData,
                startY: 30
            });

            const filename = `data_produk_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);

            showAlert('PDF berhasil diunduh', 'success');

        } catch (error) {
            showAlert('Gagal export PDF: ' + error.message, 'danger');
        }
    }

    function getCurrentFilteredData() {
        const searchTerm = document.getElementById('searchProdukInput').value.toLowerCase().trim();
        const kategori = DOM.filters.kategori.value;
        const supplier = DOM.filters.supplier.value;

        let filteredData = [...state.allProducts];

        if (searchTerm) {
            filteredData = filteredData.filter(item => {
                const nama = (item.nama_produk || '').toLowerCase();
                const kat = (item.kategori || '').toLowerCase();
                const sup = (item.supplier || '').toLowerCase();
                return nama.includes(searchTerm) || kat.includes(searchTerm) || sup.includes(searchTerm);
            });
        }

        if (kategori) {
            filteredData = filteredData.filter(item => item.kategori === kategori);
        }

        if (supplier) {
            filteredData = filteredData.filter(item => item.supplier === supplier);
        }

        return filteredData;
    }

    // UTILITY FUNCTIONS
    function populateFilters(data) {
        // Kategori
        const categories = [...new Set(data.map(item => item.kategori).filter(Boolean))];
        DOM.filters.kategori.innerHTML = '<option value="">Semua Kategori</option>' +
            categories.map(kat => `<option value="${kat}">${kat}</option>`).join('');

        // Supplier
        const suppliers = [...new Set(data.map(item => item.supplier).filter(Boolean))];
        DOM.filters.supplier.innerHTML = '<option value="">Semua Supplier</option>' +
            suppliers.map(sup => `<option value="${sup}">${sup}</option>`).join('');

        // Hitung total produk, stok, modal, nilai produk
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

        if (elements.totalProduk) elements.totalProduk.textContent = totals.produk.toLocaleString('id-ID');
        if (elements.totalStok) elements.totalStok.textContent = totals.stok.toLocaleString('id-ID');
        if (elements.totalModal) elements.totalModal.textContent = formatCurrency(totals.modal);
        if (elements.totalNilaiProduk) elements.totalNilaiProduk.textContent = formatCurrency(totals.nilaiProduk);
    }

    function formatCurrency(amount) {
        if (!amount || amount === 0) return 'Rp 0';
        return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
    }

    function formatRelativeDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;

        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} menit lalu`;
        if (diffHour < 24) return `${diffHour} jam lalu`;
        if (diffDay === 1) return 'Kemarin';
        if (diffDay <= 7) return `${diffDay} hari lalu`;
        if (diffDay <= 30) return `${Math.ceil(diffDay / 7)} minggu lalu`;
        return `${Math.ceil(diffDay / 365)} tahun lalu`;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function setupModalEventListeners() {
        // Currency formatting dengan clear value
        document.querySelectorAll('.currency-input').forEach(input => {
            input.removeEventListener('input', handleCurrencyInput);
            input.addEventListener('input', handleCurrencyInput);

            // Clear autocomplete
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');
        });

        // All input fields - prevent browser caching
        document.querySelectorAll('#formTambahProduk input').forEach(input => {
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Remove any stored values
            input.removeAttribute('value');
        });

        // Margin calculation
        const hargaBeli = document.querySelector('[name="harga_beli"]');
        const hargaJual = document.querySelector('[name="harga_jual"]');

        if (hargaBeli && hargaJual) {
            [hargaBeli, hargaJual].forEach(input => {
                input.removeEventListener('input', calculateMargin);
                input.addEventListener('input', calculateMargin);
            });
        }

        // Unit updates
        const satuanInput = document.querySelector('[name="satuan"]');
        if (satuanInput) {
            satuanInput.removeEventListener('input', handleSatuanInput);
            satuanInput.addEventListener('input', handleSatuanInput);
        }

        // Barcode input
        const barcodeInput = document.getElementById('newBarcodeInput');
        if (barcodeInput) {
            barcodeInput.removeEventListener('input', handleBarcodeInput);
            barcodeInput.addEventListener('input', handleBarcodeInput);

            barcodeInput.removeEventListener('keypress', handleBarcodeKeypress);
            barcodeInput.addEventListener('keypress', handleBarcodeKeypress);
        }

        // Diskon tanpa waktu checkbox
        const diskonTanpaWaktuCheckbox = document.getElementById('diskonTanpaWaktu');
        if (diskonTanpaWaktuCheckbox) {
            diskonTanpaWaktuCheckbox.removeEventListener('change', toggleWaktuDiskon);
            diskonTanpaWaktuCheckbox.addEventListener('change', toggleWaktuDiskon);
        }
    }

    function handleCurrencyInput(e) {
        let value = e.target.value.replace(/[^\d]/g, '');
        if (value) {
            e.target.value = parseInt(value).toLocaleString('id-ID');
        }
    }

    function handleSatuanInput(e) {
        const unit = e.target.value || 'pcs';
        const stokUnit = document.getElementById('stokUnit');
        const konversiUnit = document.getElementById('konversiUnit');
        const diskonUnit = document.getElementById('diskonUnit');

        if (stokUnit) stokUnit.textContent = unit;
        if (konversiUnit) konversiUnit.textContent = unit;
        if (diskonUnit) diskonUnit.textContent = unit;
    }

    function handleBarcodeInput(e) {
        const code = e.target.value.trim();
        previewBarcodeRealtime(code);
    }

    function handleBarcodeKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            tambahBarcodeBaru();
        }
    }

    function calculateMargin() {
        const hargaBeli = parseInt(document.querySelector('[name="harga_beli"]').value.replace(/[^\d]/g, '')) || 0;
        const hargaJual = parseInt(document.querySelector('[name="harga_jual"]').value.replace(/[^\d]/g, '')) || 0;

        if (hargaBeli > 0 && hargaJual > 0) {
            const margin = ((hargaJual - hargaBeli) / hargaBeli * 100).toFixed(1);
            const marginEl = document.getElementById('marginPreview');
            if (marginEl) {
                marginEl.textContent = margin + '%';
                marginEl.className = margin > 0 ? 'text-success' : 'text-danger';
            }
        }
    }

    function generateRandomBarcode() {
        let barcode = '';

        // Generate random 12 digit
        for (let i = 0; i < 12; i++) {
            barcode += Math.floor(Math.random() * 10);
        }

        // Check duplikasi di barcodes yang sudah ada
        if (state.newProduct.barcodes.find(b => b.kode_barcode === barcode)) {
            generateRandomBarcode(); // Generate ulang jika sama
            return;
        }

        // Set ke input
        document.getElementById('newBarcodeInput').value = barcode;
        previewBarcodeRealtime(barcode);
        showAlert('Barcode: ' + barcode, 'success');
    }

    function tambahBarcodeBaru() {
        const input = document.getElementById('newBarcodeInput');
        const isUtama = document.getElementById('newBarcodeUtama').checked;
        const kode = input.value.trim();

        if (!kode) {
            showAlert('Masukkan kode barcode', 'warning');
            return;
        }

        if (state.newProduct.barcodes.find(b => b.kode_barcode === kode)) {
            showAlert('Barcode sudah ada', 'warning');
            return;
        }

        // Auto set as primary if first barcode
        const isFirstBarcode = state.newProduct.barcodes.length === 0;

        state.newProduct.barcodes.push({
            id: Date.now(),
            kode_barcode: kode,
            is_utama: isUtama,
            isExisting: false
        });

        input.value = '';
        document.getElementById('newBarcodeUtama').checked = false;
        renderBarcodeList();
        updateBarcodeCounter();
        showAlert('Barcode ditambahkan', 'success');
    }

    function previewBarcodeRealtime(code) {
        const container = document.getElementById('barcodePreviewContainer');

        if (code && code.length > 3) {
            // Create canvas element for barcode
            container.innerHTML = `
                <div class="barcode-preview text-center">
                    <div class="mb-2">
                        <canvas id="barcodeCanvas"></canvas>
                    </div>
                    <div class="bg-dark text-white px-2 py-1 font-monospace small">${code}</div>
                </div>
            `;

            // Generate barcode using JSBarcode
            try {
                const canvas = document.getElementById('barcodeCanvas');
                if (canvas && window.JsBarcode) {
                    JsBarcode(canvas, code, {
                        format: "CODE128", // atau "EAN13", "UPC", dll
                        width: 2,
                        height: 50,
                        displayValue: false, // Karena sudah ada text di bawah
                        margin: 0,
                        background: "#ffffff",
                        lineColor: "#000000"
                    });
                }
            } catch (error) {
                console.error('Error generating barcode:', error);
                // Fallback jika error
                container.innerHTML = `
                    <div class="barcode-preview">
                        <div class="bg-dark text-white px-2 py-1 font-monospace small">${code}</div>
                        <div class="text-muted small">Preview barcode tidak tersedia</div>
                    </div>
                `;
            }
        } else {
            container.innerHTML = '<span class="text-muted">Preview akan muncul di sini</span>';
        }
    }

    function updateBarcodeCounter() {
        const counter = document.getElementById('barcodeCount');
        if (counter) {
            counter.textContent = state.newProduct.barcodes.length;
        }
    }

    function showAlert(message, type = 'info') {
        const iconMap = {
            'success': 'success',
            'danger': 'error',
            'warning': 'warning',
            'info': 'info'
        };

        const colorMap = {
            'success': '#198754',
            'danger': '#dc3545',
            'warning': '#ffc107',
            'info': '#0dcaf0'
        };

        Swal.fire({
            title: message,
            icon: iconMap[type] || 'info',
            timer: 3000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timerProgressBar: true,
            customClass: {
                popup: 'swal-toast'
            }
        });
    }

    async function saveTracking(trackingData) {
        try {
            await fetch('/api/tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken
                },
                body: JSON.stringify(trackingData),
                credentials: 'same-origin'
            });
        } catch (e) {
            console.error('Gagal menyimpan tracking:', e);
        }
    }

    // Make functions globally accessible
    window.tambahBarcode = tambahBarcode;
    window.hapusBarcode = hapusBarcode;
    window.tambahBarcodeBaru = tambahBarcodeBaru;
    window.generateRandomBarcode = generateRandomBarcode;
    window.tambahKonversiSatuan = tambahKonversiSatuan;
    window.hapusKonversiSatuan = hapusKonversiSatuan;
    window.tambahDiskonBaru = tambahDiskonBaru;
    window.hapusDiskon = hapusDiskon;
    window.toggleWaktuDiskon = toggleWaktuDiskon;
    window.generateRandomBarcode = generateRandomBarcode;

    // Initialize
    init();

    function showRestokModal() {
        const container = document.getElementById('restokProdukList');
        const selected = state.selectedProduk;
        if (!selected || selected.length === 0) return;

        // Tambahkan select produk di header modal
        let selectProdukHtml = '';
        if (selected.length > 1) {
            selectProdukHtml = `
                <select id="selectRestokProduk" class="form-select form-select-sm ms-2" style="width:auto;display:inline-block;min-width:120px;">
                    ${selected.map((p, idx) =>
                        `<option value="${idx}">${p.nama_produk || 'Produk Tanpa Nama'}</option>`
                    ).join('')}
                </select>
            `;
        }

        // Render form untuk produk pertama (default)
        renderRestokForm(selected[0]);

        // Tampilkan select produk di header modal
        const headerSelect = document.getElementById('restokProdukHeaderSelect');
        if (headerSelect) headerSelect.innerHTML = selectProdukHtml;

        // Event: Ganti produk di select
        if (selected.length > 1) {
            const selectProduk = document.getElementById('selectRestokProduk');
            selectProduk.addEventListener('change', function() {
                renderRestokForm(selected[this.value]);
            });
        }

        // Fungsi untuk render form restok satu produk
        function renderRestokForm(p) {
            // Daftar satuan (dasar + konversi)
            let satuanList = [];
            let konversiObj = {};
            if (Array.isArray(p.konversi_satuan)) {
                p.konversi_satuan.forEach(k => {
                    satuanList.push(k.satuan_besar);
                    konversiObj[k.satuan_besar] = k.konversi_satuan;
                });
            }
            satuanList = [...new Set(satuanList.filter(Boolean))];
            if (p.satuan && !satuanList.includes(p.satuan)) {
                satuanList.push(p.satuan);
            } else {
                satuanList = satuanList.filter(s => s !== p.satuan);
                satuanList.push(p.satuan);
            }

            container.innerHTML = `
            <form id="formRestokProduk" autocomplete="off">
            <div class="row">
                <div class="col-md-6 border-end">
                    <div class="mb-2">
                        <label class="form-label">Nama Produk</label>
                        <input type="text" class="form-control" value="${p.nama_produk}" readonly>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Supplier</label>
                        <input type="text" class="form-control" value="${p.supplier || ''}" readonly>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Jumlah</label>
                        <input type="number" class="form-control restok-jumlah" min="1" value="1" required>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Satuan</label>
                        <select class="form-select restok-satuan">
                            ${satuanList.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Harga Beli</label>
                        <input type="number" class="form-control restok-harga-beli" min="0" value="0" required>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Subtotal</label>
                        <input type="text" class="form-control restok-subtotal" value="0" readonly>
                    </div>
                </div>
                <div class="col-md-6">
                    <label class="form-label fw-bold mb-2">Multi Harga per Satuan</label>
                    <div id="multiHargaList"></div>
                </div>
            </div>
            <div class="mt-4 d-flex justify-content-between align-items-center">
                <div class="text-muted">
                    <i class="fas fa-list"></i>
                    ${state.selectedProduk.length} produk dipilih
                </div>
                <button type="submit" class="btn btn-warning">
                    <i class="fas fa-save me-2"></i> Simpan Restok
                </button>
            </div>
            </form>
            `;

            // Update subtotal otomatis
            const jumlahInput = container.querySelector('.restok-jumlah');
            const hargaBeliInput = container.querySelector('.restok-harga-beli');
            const satuanSelect = container.querySelector('.restok-satuan');
            const subtotalInput = container.querySelector('.restok-subtotal');
            function updateSubtotal() {
                const jumlah = parseInt(jumlahInput.value) || 0;
                const harga = parseInt(hargaBeliInput.value) || 0;
                subtotalInput.value = formatCurrency(jumlah * harga);
            }
            if (jumlahInput && hargaBeliInput) {
                jumlahInput.addEventListener('input', updateSubtotal);
                hargaBeliInput.addEventListener('input', updateSubtotal);
            }

            // Render multi harga pertama kali
            renderMultiHarga();

            // Update multi harga jika satuan/harga beli berubah
            satuanSelect.addEventListener('change', renderMultiHarga);
            hargaBeliInput.addEventListener('input', renderMultiHarga);

            // --- Tambahkan definisi fungsi ini di bawah event listener di atas ---
            function renderMultiHarga() {
                const multiHargaList = container.querySelector('#multiHargaList');
                const satuanDipilih = container.querySelector('.restok-satuan').value;
                const hargaBeli = parseInt(container.querySelector('.restok-harga-beli').value) || 0;

                // Ambil daftar satuan (dasar + konversi)
                let satuanList = [];
                if (Array.isArray(p.konversi_satuan)) {
                    satuanList = satuanList.concat(p.konversi_satuan.map(k => k.satuan_besar));
                }
                if (p.satuan && !satuanList.includes(p.satuan)) {
                    satuanList.push(p.satuan);
                }
                satuanList = [...new Set(satuanList.filter(Boolean))];

                // Render input multi harga
                multiHargaList.innerHTML = satuanList.map(s => `
                    <div class="input-group mb-2">
                        <span class="input-group-text">${s}</span>
                        <input type="number" class="form-control multi-harga-beli" data-satuan="${s}" placeholder="Harga Beli" value="${s === satuanDipilih ? hargaBeli : 0}">
                        <input type="number" class="form-control multi-harga-jual" data-satuan="${s}" placeholder="Harga Jual" value="0">
                    </div>
                `).join('');
            }
        }
    }

    // Handler submit restok (delegasi karena form dinamis)
    document.body.addEventListener('submit', async function(e) {
        if (e.target && e.target.id === 'formRestokProduk') {
            e.preventDefault();
            const container = document.getElementById('restokProdukList');
            const jumlah = parseInt(container.querySelector('.restok-jumlah').value) || 0;
            const satuan = container.querySelector('.restok-satuan').value;
            const hargaBeli = parseInt(container.querySelector('.restok-harga-beli').value) || 0;
            const subtotal = jumlah * hargaBeli;

            // Ambil multi harga
            const multiHarga = [];
            const beliInputs = container.querySelectorAll('.multi-harga-beli');
            const jualInputs = container.querySelectorAll('.multi-harga-jual');
            beliInputs.forEach((input, idx) => {
                const satuanMulti = input.dataset.satuan;
                const harga_beli = parseInt(input.value) || 0;
                const harga_jual = parseInt(jualInputs[idx].value) || 0;
                if (harga_beli > 0 || harga_jual > 0) {
                    multiHarga.push({ satuan: satuanMulti, harga_beli, harga_jual });
                }
            });

            // Validasi minimal
            if (jumlah <= 0 || hargaBeli <= 0) {
                Swal.fire({
                    title: 'Input Tidak Valid!',
                    text: 'Jumlah dan harga beli harus lebih dari 0.',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Kirim ke backend
            try {
                const res = await fetch('/restok', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': DOM.meta.csrfToken
                    },
                    body: JSON.stringify({
                        tanggal: new Date().toISOString(),
                        user_id: null, // atau isi sesuai user login
                        jumlah_produk: 1,
                        total_harga_beli: subtotal,
                        detail: [{
                            produk_id: state.selectedProduk[0].id,
                            nama_produk: state.selectedProduk[0].nama_produk,
                            supplier: state.selectedProduk[0].supplier,
                            jumlah,
                            satuan,
                            harga_beli: hargaBeli,
                            subtotal,
                            multi_harga: multiHarga
                        }]
                    })
                });

                if (res.ok) {
                    await saveTracking({
                        tipe: 'Restok',
                        keterangan: `Restok produk "${state.selectedProduk[0].nama_produk}" sejumlah ${jumlah} ${satuan} (harga beli: ${formatCurrency(hargaBeli)})`,
                        status: 'Restok',
                        produk_id: state.selectedProduk[0].id,
                        nama_produk: state.selectedProduk[0].nama_produk
                    });

                    await Swal.fire({
                        title: 'Berhasil!',
                        text: 'Restok produk berhasil disimpan.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    // Tutup modal dan reload agar backdrop hilang
                    const modal = bootstrap.Modal.getInstance(document.getElementById('restokProdukModal'));
                    if (modal) modal.hide();
                    const modalEl = document.getElementById('restokProdukModal');
                    if (modalEl) {
                        // Paksa hapus backdrop jika masih ada
                        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                        // Paksa hapus kelas modal-open dari body
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                    }
                    // Reload data produk agar stok update
                    await loadData(state.currentSort.field, state.currentSort.direction);
                } else {
                    const result = await res.json();
                    throw new Error(result.message || 'Gagal menyimpan restok');
                }
            } catch (error) {
                await Swal.fire({
                    title: 'Gagal!',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    });

    function showReturModal() {
        const container = document.getElementById('returProdukList');
        const selected = state.selectedProduk;
        if (!selected || selected.length === 0) return;

        let html = '';
        selected.forEach((p, idx) => {
            html += `
                <div class="card mb-3 shadow-sm border-0">
                    <div class="card-body py-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <span class="fw-bold">${p.nama_produk}</span>
                                <span class="badge bg-secondary ms-2">${p.stok} ${p.satuan}</span>
                            </div>
                            <span class="text-muted small">${p.supplier || ''}</span>
                        </div>
                        <div class="row align-items-center">
                            <div class="col-6 col-md-7">
                                <div class="input-group">
                                    <span class="input-group-text">Jumlah Retur</span>
                                    <input type="number" class="form-control retur-jumlah" min="1" max="${p.stok}" value="1" data-id="${p.id}" data-satuan="${p.satuan}">
                                    <span class="input-group-text">${p.satuan}</span>
                                </div>
                            </div>
                            <div class="col-6 col-md-5 text-end text-muted small">
                                <span>Stok tersedia: ${p.stok} ${p.satuan}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    document.body.addEventListener('submit', async function(e) {
        if (e.target && e.target.id === 'formReturProduk') {
            e.preventDefault();
            const container = document.getElementById('returProdukList');
            const jumlahInputs = container.querySelectorAll('.retur-jumlah');
            const detail = [];

            jumlahInputs.forEach(input => {
                const jumlah = parseInt(input.value) || 0;
                const produkId = parseInt(input.dataset.id);
                const satuan = input.dataset.satuan;
                const produk = state.selectedProduk.find(p => p.id === produkId);
                if (jumlah > 0 && produk) {
                    detail.push({
                        produk_id: produkId,
                        nama_produk: produk.nama_produk,
                        satuan,
                        jumlah
                    });
                }
            });

            if (detail.length === 0) {
                Swal.fire({
                    title: 'Input Tidak Valid!',
                    text: 'Jumlah retur harus lebih dari 0.',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            try {
                const res = await fetch('/retur', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': DOM.meta.csrfToken
                    },
                    body: JSON.stringify({
                        tanggal: new Date().toISOString(),
                        detail
                    })
                });

                if (res.ok) {
                    await Swal.fire({
                        title: 'Berhasil!',
                        text: 'Retur produk berhasil disimpan.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    for (const d of detail) {
                        await saveTracking({
                            tipe: 'Retur',
                            keterangan: `Retur produk "${d.nama_produk}" sejumlah ${d.jumlah} ${d.satuan}`,
                            status: 'Retur',
                            produk_id: d.produk_id,
                            nama_produk: d.nama_produk
                        });
                    }

                    const modal = bootstrap.Modal.getInstance(document.getElementById('returProdukModal'));
                    if (modal) modal.hide();
                    await loadData(state.currentSort.field, state.currentSort.direction);
                } else {
                    const result = await res.json();
                    throw new Error(result.message || 'Gagal menyimpan retur');
                }
            } catch (error) {
                await Swal.fire({
                    title: 'Gagal!',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        }
    });
});
