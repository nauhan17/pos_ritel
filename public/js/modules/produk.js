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
            edit: new bootstrap.Modal('#editProdukModal')
        },

        buttons: {
            product: {
                edit: document.getElementById('editProdukBtn'),
                delete: document.getElementById('deleteBtn'),
                editToggle: document.getElementById('editToggleBtn')
            }
        },

        filters: {
            kategori: document.getElementById('kategoriFilter'),
            supplier: document.getElementById('supplierFilter'),
            unit: document.getElementById('satuanFilter')
        },

        discount: {
            container: document.getElementById('waktuDiskonContainer'),
            listBody: document.getElementById('diskonListBody'),
            emptyMessage: document.getElementById('emptyDiskonMessage'),
            form: document.getElementById('diskonForm')
        }
    };

    const state = {
        currentSort: { field: 'nama_produk', direction: 'asc' },
        totals: {
            produk: 0,
            stok: 0,
            modal: 0,
            nilaiProduk: 0
        },
        allProducts: [],
        isEditMode: false,
        selectedProduk: [],
        konversiSatuan: {},
        barcodes: {}
    };

    // INITIALIZATION FUNCTIONS
    function init() {
        loadData(state.currentSort.field, state.currentSort.direction);
        setupEventListeners();
    }

    function setupEventListeners() {
        // --- TABLE & FILTER EVENTS ---
        DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));
        DOM.filters.kategori.addEventListener('change', applyFilters);
        DOM.filters.supplier.addEventListener('change', applyFilters);
        DOM.filters.unit.addEventListener('change', applyFilters);
        DOM.table.selectAll.addEventListener('change', handleSelectedRow);

        DOM.table.body.removeEventListener('click', handleTableClick);
        DOM.table.body.addEventListener('click', handleTableClick);
        DOM.table.body.addEventListener('change', function(e) {
            if (e.target.classList.contains('row-checkbox')) {
                handleRowCheckboxChange(e.target);
            }
        });

        // --- PRODUK CRUD EVENTS ---
        DOM.buttons.product.editToggle.addEventListener('click', enterEditMode);

        document.getElementById('exitEditModeBtn').addEventListener('click', exitEditMode);
        document.getElementById('saveEditProdukBtn').addEventListener('click', saveEditProduk);

        document.addEventListener('click', async function(e) {
            if (e.target.classList.contains('btn-save-edit-tab')) {
                const produkId = e.target.dataset.produkId;
                const form = e.target.closest('.edit-produk-form');
                await saveEditProdukSingle(form, produkId);
            }

            if (e.target.classList.contains('btn-save-add-tab')) {
                const form = e.target.closest('.add-produk-form');
                await saveAddProduk(form);
            }
        });

        // Event listener sidebar
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.btn-sidebar-modal');
            if (!btn) return;
            renderAturProdukSidebar(btn.dataset.menu);
        });

        // Ganti event tombol utama
        DOM.buttons.product.edit.addEventListener('click', function() {
            showAturProdukModal('auto');
        });

        // --- DISKON EVENTS ---
        document.addEventListener('click', function(e) {
            // Simpan per tab diskon
            if (e.target.classList.contains('btn-save-diskon-tab')) {
                const form = e.target.closest('.diskon-form');
                const produkId = form.dataset.produkId;
                saveDiskon(form, produkId);
            }

            if (e.target.closest('.btn-hapus-diskon')) {
                const button = e.target.closest('.btn-hapus-diskon');
                const diskonId = button.closest('tr').dataset.id;
                hapusDiskon(diskonId, button);
            }
        });

        // --- BARCODE EVENTS ---
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-save-barcode')) {
                const form = e.target.closest('.barcode-form');
                const produkId = form.dataset.produkId;
                saveBarcode(form, produkId);
            }
            if (e.target.closest('.btn-hapus-barcode')) {
                const button = e.target.closest('.btn-hapus-barcode');
                const barcodeId = button.dataset.barcodeId;
                const produkId = button.dataset.produkId;
                hapusBarcode(barcodeId, produkId, button);
            }
            if (e.target.closest('.btn-set-utama-barcode')) {
                const button = e.target.closest('.btn-set-utama-barcode');
                const barcodeId = button.dataset.barcodeId;
                const produkId = button.dataset.produkId;
                setAsUtamaBarcode(barcodeId, produkId);
            }
            if (e.target.classList.contains('btn-generate-barcode')) {
                const produkId = e.target.dataset.produkId;
                generateRandomUPC(produkId);
            }
            if (e.target.closest('.btn-cetak-barcode')) {
                const button = e.target.closest('.btn-cetak-barcode');
                const barcodeData = button.dataset.barcode;
                printBarcode(barcodeData);
            }
            if (e.target.closest('.btn-cetak-semua-barcode')) {
                const button = e.target.closest('.btn-cetak-semua-barcode');
                const produkId = button.dataset.produkId;
                const barcodes = state.barcodes[produkId] || [];
                if (barcodes.length === 0) {
                    showAlert('Tidak ada barcode untuk dicetak', 'warning');
                    return;
                }
                printAllBarcodes(barcodes);
            }
        });

        // --- SATUAN EVENTS ---
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('btn-save-satuan')) {
                const form = e.target.closest('.satuan-form');
                const produkId = form.dataset.produkId;
                saveSatuan(form, produkId);
            }
            if (e.target.closest('.btn-hapus-satuan')) {
                const button = e.target.closest('.btn-hapus-satuan');
                const satuanId = button.dataset.satuanId;
                const produkId = button.dataset.produkId;
                hapusSatuan(satuanId, produkId, button);
            }
        });

        // --- DISKON TOGGLE (PERIODE) ---
        document.addEventListener('change', handleDiscountToggle);
    }

    // DATA LOADING AND TABLE FUNCTIONS
    async function loadData(sortField, sortDirection) {
        try {
            const response = await fetch(`/api/produk?sort=${sortField}&order=${sortDirection}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memuat data');
            }
            const produkList = await response.json();
            state.allProducts = produkList;

            state.konversiSatuan = {};
            produkList.forEach(p => {
                state.konversiSatuan[p.id] = p.konversi_satuan || [];
            });

            renderTable(state.allProducts);
            updateTotals(state.allProducts);
            populateFilters(state.allProducts);
            populateSatuanFilter();
        } catch (error) {
            handleDataLoadError(error);
        }
    }

    function handleDataLoadError(error) {
        console.error('Error:', error);
        DOM.table.body.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-danger">
                    GAGAL MEMUAT DATA: ${error.message}
                </td>
            </tr>
        `;
        updateTotals([]);
    }

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

    function renderTable(data) {
        if (!Array.isArray(data)) {
            console.error('Invalid data format:', data);
            DOM.table.body.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        FORMAT DATA TIDAK VALID
                    </td>
                </tr>
            `;
            return;
        }

        if (data.length === 0) {
            DOM.table.body.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        TIDAK ADA DATA
                    </td>
                </tr>
            `;
            return;
        }

        const satuanFilterValue = DOM.filters.unit.value;

        DOM.table.body.innerHTML = data.map(item => {
            const isSelected = state.selectedProduk.some(p => p.id == item.id);
            // Hitung stok sesuai filter satuan
            const stokTampil = getStokBySatuan(item, satuanFilterValue);

            return `
                <tr data-id="${item.id}">
                    <td>
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}"
                            ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="editable-cell" data-field="nama_produk">${item.nama_produk || ''}</td>
                    <td class="editable-cell" data-field="kategori">${item.kategori || ''}</td>
                    <td class="editable-cell" data-field="supplier">${item.supplier || ''}</td>
                    <td class="editable-cell" data-field="stok">${stokTampil}</td>
                    <td class="editable-cell" data-field="harga_beli">${formatCurrency(item.harga_beli)}</td>
                    <td class="editable-cell" data-field="harga_jual">${formatCurrency(item.harga_jual)}</td>
                    <td>${formatRelativeDate(item.updated_at || item.timestamps)}</td>
                </tr>
            `;
        }).join('');

        DOM.table.selectAll.checked = state.selectedProduk.length > 0 &&
        state.selectedProduk.length === data.length;
    }

    function applyFilters() {
        const { supplier, kategori, unit } = DOM.filters;

        const filteredData = state.allProducts.filter(produk => {
            const matchKategori = !kategori.value || produk.kategori === kategori.value;
            const matchSupplier = !supplier.value || produk.supplier === supplier.value;
            let matchSatuan = !unit.value
                || produk.satuan === unit.value
                || (state.konversiSatuan[produk.id] || []).some(
                    k => k.satuan_besar === unit.value || k.satuan_dasar === unit.value
                );
                        return matchKategori && matchSupplier && matchSatuan;
                    });

        renderTable(filteredData);
        updateTotals(filteredData);
    }

    function populateFilters(data) {
        Object.entries(DOM.filters).forEach(([key, element]) => {
            const uniqueValues = [...new Set(data.map(p => p[key]))].filter(Boolean);
            element.innerHTML = `
                <option value="">Semua ${key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ${uniqueValues.map(value => `<option value="${value}">${value}</option>`).join('')}
            `;
        });
    }

    function populateSatuanFilter() {
        const satuanMap = {};

        state.allProducts.forEach(p => {
            const satuan = (p.satuan || '').trim();
            if (satuan) satuanMap[satuan.toLowerCase()] = satuan;
        });

        Object.values(state.konversiSatuan).forEach(arr => {
            arr.forEach(k => {
                const satuanDasar = (k.satuan_dasar || '').trim();
                if (satuanDasar) satuanMap[satuanDasar.toLowerCase()] = satuanDasar;

                const satuanBesar = (k.satuan_besar || '').trim();
                if (satuanBesar) satuanMap[satuanBesar.toLowerCase()] = satuanBesar;
            });
        });

        const allSatuan = Object.values(satuanMap);

        DOM.filters.unit.innerHTML = `
            <option value="">Semua Satuan</option>
            ${allSatuan.map(s => `<option value="${s}">${s}</option>`).join('')}
        `;
    }

    function handleSelectedRow(){
        const checkboxes = DOM.table.body.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkboxes => {
            checkboxes.checked = DOM.table.selectAll.checked;
        });

        state.selectedProduk = DOM.table.selectAll.checked
        ? Array.from(state.allProducts)
        : [];
    }

    function handleRowCheckboxChange(checkbox){
        const rowId = checkbox.dataset.id;
        const produk = state.allProducts.find(p => p.id == rowId);

        if(checkbox.checked){
            if (!state.selectedProduk.some(p => p.id == rowId)) {
                state.selectedProduk.push(produk);
            }
        } else {
            state.selectedProduk = state.selectedProduk.filter(p => p.id != rowId);
        }

        DOM.table.selectAll.checked = state.selectedProduk.length === state.allProducts.length;
    }

    // SIDEBAR RENDER
    function renderAturProdukSidebar(menu = 'add') {
        document.querySelectorAll('#produkSidebarMenu .nav-link').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.menu === menu);
        });

        const content = document.getElementById('produkSidebarContent');
        switch (menu) {
            case 'add':
                content.innerHTML = renderAddProdukForm();
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'edit':
                renderEditProdukTabs(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'satuan':
                renderSatuanSidebar(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'barcode':
                renderBarcodeSidebar(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'restok':
                renderRestokSidebar(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'diskon':
                renderDiskonSidebar(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
            case 'delete':
                renderDeleteSidebar(content);
                document.getElementById('saveEditProdukBtn').style.display = '';
                break;
        }
    }

    function renderSatuanSidebar(content) {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkboxes.length === 0) {
            content.innerHTML = `<div class="alert alert-info">Pilih produk untuk mengatur satuan.</div>`;
            return;
        }
        state.selectedProduk = Array.from(checkboxes).map(checkbox => {
            return state.allProducts.find(p => p.id == checkbox.dataset.id);
        });

        // Render container, lalu panggil fungsi tab
        content.innerHTML = `
            <div class="mb-2">Produk terpilih: <span id="jumlahProdukSatuanTerpilih"></span></div>
            <ul class="nav nav-tabs" id="satuanTabsContainer"></ul>
            <div class="tab-content" id="satuanTabContent"></div>
        `;
        renderSatuanModalTabs();
    }

    function renderBarcodeSidebar(content) {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkboxes.length === 0) {
            content.innerHTML = `<div class="alert alert-info">Pilih produk untuk mengatur barcode.</div>`;
            return;
        }
        state.selectedProduk = Array.from(checkboxes).map(checkbox => {
            return state.allProducts.find(p => p.id == checkbox.dataset.id);
        });

        content.innerHTML = `
            <div class="mb-2">Produk terpilih: <span id="jumlahProdukBarcodeTerpilih"></span></div>
            <ul class="nav nav-tabs" id="barcodeTabsContainer"></ul>
            <div class="tab-content" id="barcodeTabContent"></div>
        `;
        renderBarcodeModalTabs();
    }

    function renderDiskonSidebar(content) {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkboxes.length === 0) {
            content.innerHTML = `<div class="alert alert-info">Pilih produk untuk mengatur diskon.</div>`;
            return;
        }
        state.selectedProduk = Array.from(checkboxes).map(checkbox => {
            return state.allProducts.find(p => p.id == checkbox.dataset.id);
        });

        content.innerHTML = `
            <div class="mb-2">Produk terpilih: <span id="jumlahProdukTerpilih"></span></div>
            <ul class="nav nav-tabs" id="produkDiskonTabs"></ul>
            <div class="tab-content" id="produkDiskonTabContent"></div>
        `;
        renderDiskonModalTabs();
    }

    function renderDeleteSidebar(content) {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkboxes.length === 0) {
            content.innerHTML = `<div class="alert alert-info">Pilih produk yang akan dihapus.</div>`;
            return;
        }
        const produkList = Array.from(checkboxes).map(checkbox => {
            const produk = state.allProducts.find(p => p.id == checkbox.dataset.id);
            return `<li>${produk.nama_produk}</li>`;
        }).join('');
        content.innerHTML = `
            <div class="alert alert-danger">
                <strong>PERINGATAN!</strong> Produk berikut akan dihapus permanen:
                <ul>${produkList}</ul>
                <button class="btn btn-danger mt-2" id="btnDeleteSelectedSidebar">Hapus Produk</button>
            </div>
        `;
        document.getElementById('btnDeleteSelectedSidebar').onclick = deleteSelected;
    }

    // PRODUK MANAGEMENT
    async function saveAddProduk(form) {
        const formData = new FormData(form);
        const namaProduk = formData.get('nama_produk');
        try {
            const response = await fetch('/api/produk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(Object.fromEntries(formData))
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'GAGAL MENAMBAHKAN PRODUK');
            }

            DOM.modals.edit.hide();
            form.reset();
            showAlert(`PRODUK ${namaProduk} BERHASIL DITAMBAHKAN`, 'success');
            loadData(state.currentSort.field, state.currentSort.direction);
        } catch (error) {
            showAlert(
                `GAGAL MENAMBAHKAN PRODUK: ${error.message}`,
                'danger',
                5000
            );
        }
    }

    async function saveEditProduk() {
        const forms = document.querySelectorAll('.edit-produk-form');
        const results = [];
        for (const form of forms) {
            const formData = new FormData(form);
            const produkId = formData.get('produk_id');
            const data = Object.fromEntries(formData.entries());

            ['harga_beli', 'harga_jual', 'stok'].forEach(field => {
                if (data[field] !== undefined && data[field] !== null) {
                    data[field] = parseInt(
                        String(data[field]).replace(/[.,]/g, '')
                    ) || 0;
                }
            });

            try {
                const response = await fetch(`/api/produk/${produkId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': DOM.meta.csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                results.push({
                    success: response.ok,
                    produk: data.nama_produk,
                    message: result.message || (response.ok ? 'Berhasil disimpan' : 'Gagal menyimpan')
                });
            } catch (error) {
                results.push({
                    success: false,
                    produk: data.nama_produk,
                    message: 'Terjadi kesalahan jaringan'
                });
            }
        }
        let message = `<div class="text-start"><ul>`;
        results.forEach(r => {
            message += `<li class="${r.success ? 'text-success' : 'text-danger'}"><strong>${r.produk}:</strong> ${r.message}</li>`;
        });
        message += `</ul></div>`;
        await Swal.fire({
            title: 'Hasil Penyimpanan',
            html: message,
            icon: results.some(r => !r.success) ? 'warning' : 'success',
            confirmButtonText: 'OK'
        });
        if (results.every(r => r.success)) {
            DOM.modals.edit.hide();
            loadData(state.currentSort.field, state.currentSort.direction);
        }
    }

    async function deleteSelected() {
        if (state.selectedProduk.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Tidak ada produk dipilih',
                text: 'Silakan pilih produk yang akan dihapus',
                confirmButtonText: 'Mengerti'
            });
            return;
        }

        const productNames = state.selectedProduk
            .slice(0, 5)
            .map(p => `[${p.nama_produk}]`)
            .join('\n');

        const otherProducts = state.selectedProduk.length > 5
            ? `\n dan ${state.selectedProduk.length - 5} produk lainnya...`
            : '';

        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Produk?',
            text: `${productNames}\n${otherProducts}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (!isConfirmed) return;

        try {
            const response = await fetch('/api/produk/delete-multiple', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken
                },
                body: JSON.stringify({
                    ids: state.selectedProduk.map(p => p.id)
                })
            });

            if (!response.ok) {
                throw new Error('Gagal menghapus produk');
            }

            await Swal.fire({
                icon: 'success',
                title: 'Terhapus!',
                text: `${state.selectedProduk.length} produk berhasil dihapus`,
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh data dan reset selection
            loadData(state.currentSort.field, state.currentSort.direction);
            state.selectedProduk = [];
            DOM.table.selectAll.checked = false;

        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: error.message || 'Terjadi kesalahan saat menghapus',
                confirmButtonText: 'Mengerti'
            });
        }
    }

    function showAturProdukModal(menu = 'add') {
        if (menu === 'auto') {
            const checkboxes = document.querySelectorAll('.row-checkbox:checked');
            menu = checkboxes.length === 0 ? 'add' : 'edit';
        }
        renderAturProdukSidebar(menu);
        DOM.modals.edit.show();
    }

    function renderAddProdukForm() {
        return `
            <form class="add-produk-form">
                <div class="mb-3">
                    <label class="form-label">Nama Produk</label>
                    <input type="text" class="form-control" name="nama_produk" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Kategori</label>
                    <input type="text" class="form-control" name="kategori">
                </div>
                <div class="mb-3">
                    <label class="form-label">Supplier</label>
                    <input type="text" class="form-control" name="supplier">
                </div>
                <div class="mb-3">
                    <label class="form-label">Stok</label>
                    <input type="number" class="form-control" name="stok" value="0">
                </div>
                <div class="mb-3">
                    <label class="form-label">Satuan</label>
                    <input type="text" class="form-control" name="satuan">
                </div>
                <div class="mb-3">
                    <label class="form-label">Harga Beli</label>
                    <input type="text" class="form-control" name="harga_beli">
                </div>
                <div class="mb-3">
                    <label class="form-label">Harga Jual</label>
                    <input type="text" class="form-control" name="harga_jual">
                </div>
                <button type="button" class="btn btn-primary btn-save-add-tab">
                    Simpan Produk Baru
                </button>
            </form>
        `;
    }

    function renderEditProdukTabs(container) {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkboxes.length === 0) {
            container.innerHTML = `<div class="alert alert-info">Pilih produk untuk diedit.</div>`;
            document.getElementById('saveEditProdukBtn').style.display = 'none';
            return;
        }
        state.selectedProduk = Array.from(checkboxes).map(checkbox => {
            return state.allProducts.find(p => p.id == checkbox.dataset.id);
        });

        let tabsHtml = `<ul class="nav nav-tabs" id="produkEditTabs">`;
        let contentHtml = `<div class="tab-content" id="produkEditTabContent">`;

        state.selectedProduk.forEach((produk, index) => {
            const isActive = index === 0;
            const tabId = `edit-tab-${produk.id}`;
            const contentId = `edit-content-${produk.id}`;
            const hargaBeli = produk.harga_beli ? parseInt(produk.harga_beli).toLocaleString('id-ID') : '0';
            const hargaJual = produk.harga_jual ? parseInt(produk.harga_jual).toLocaleString('id-ID') : '0';

            tabsHtml += `
                <li class="nav-item">
                    <button class="nav-link ${isActive ? 'active' : ''}"
                            id="${tabId}"
                            data-bs-toggle="tab"
                            data-bs-target="#${contentId}"
                            type="button">
                        ${produk.nama_produk}
                    </button>
                </li>
            `;
            contentHtml += `
                <div class="tab-pane fade ${isActive ? 'show active' : ''}" id="${contentId}">
                    <form class="edit-produk-form" data-produk-id="${produk.id}">
                        <input type="hidden" name="produk_id" value="${produk.id}">
                        <div class="mb-3">
                            <label class="form-label">Nama Produk</label>
                            <input type="text" class="form-control" name="nama_produk" value="${produk.nama_produk || ''}" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Kategori</label>
                            <input type="text" class="form-control" name="kategori" value="${produk.kategori || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Supplier</label>
                            <input type="text" class="form-control" name="supplier" value="${produk.supplier || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Stok</label>
                            <input type="number" class="form-control" name="stok" value="${produk.stok || 0}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Satuan</label>
                            <input type="text" class="form-control" name="satuan" value="${produk.satuan || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Harga Beli</label>
                            <input type="text" class="form-control" name="harga_beli" value="${hargaBeli}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Harga Jual</label>
                            <input type="text" class="form-control" name="harga_jual" value="${hargaJual}">
                        </div>
                        <button type="button" class="btn btn-primary btn-save-edit-tab" data-produk-id="${produk.id}">
                            Simpan ${produk.nama_produk}
                        </button>
                    </form>
                </div>
            `;
        });

        tabsHtml += `</ul>`;
        contentHtml += `</div>`;

        container.innerHTML = tabsHtml + contentHtml;
        document.getElementById('saveEditProdukBtn').style.display = '';
    }

    // SATUAN
    function renderSatuanModalTabs() {
        const tabsContainer = document.getElementById('satuanTabsContainer');
        const tabContentContainer = document.getElementById('satuanTabContent');

        document.getElementById('jumlahProdukSatuanTerpilih').textContent = state.selectedProduk.length;

        tabsContainer.innerHTML = '';
        tabContentContainer.innerHTML = '';

        state.selectedProduk.forEach((produk, index) => {
            const isActive = index === 0;
            const tabId = `satuan-tab-${produk.id}`;
            const contentId = `satuan-content-${produk.id}`;

            const satuanSet = new Map();

            if (produk.satuan) satuanSet.set(produk.satuan.trim().toLowerCase(), produk.satuan.trim());

            (state.konversiSatuan[produk.id] || []).forEach(k => {
                if (k.satuan_dasar) satuanSet.set(k.satuan_dasar.trim().toLowerCase(), k.satuan_dasar.trim());
                if (k.satuan_besar) satuanSet.set(k.satuan_besar.trim().toLowerCase(), k.satuan_besar.trim());
            });

            const satuanOptions = Array.from(satuanSet.values());

            // Tab Item
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}"
                        id="${tabId}"
                        data-bs-toggle="tab"
                        data-bs-target="#${contentId}"
                        type="button">
                    ${produk.nama_produk}
                </button>
            `;
            tabsContainer.appendChild(tabItem);

            // Tab Content
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            tabContent.id = contentId;
            tabContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <form class="satuan-form" data-produk-id="${produk.id}">
                            <input type="hidden" name="produk_id" value="${produk.id}">
                            <div class="mb-3">
                                <label class="form-label">Satuan Dasar</label>
                                <input type="text" class="form-control" name="satuan_dasar" required
                                    value="${produk.satuan || ''}" placeholder="Masukkan satuan dasar">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Satuan Besar</label>
                                <input type="text" class="form-control" name="satuan_besar" required
                                    placeholder="lusin/kg/dus">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Jumlah Satuan Dasar</label>
                                <input type="number" class="form-control" name="jumlah"
                                    value="1" min="0.01" step="0.01">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Nilai Konversi</label>
                                <input type="number" class="form-control" name="konversi" required
                                    min="0.01" step="0.01" placeholder="12 (1 lusin = 12 pcs)">
                            </div>
                            <button type="button" class="btn btn-primary btn-save-satuan"
                                    data-produk-id="${produk.id}">
                                Simpan Konversi Satuan
                            </button>
                        </form>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">DAFTAR KONVERSI</h6>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Konversi</th>
                                        <th>Satuan Besar</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="satuan-list-body" data-produk-id="${produk.id}">
                                    <tr>
                                        <td colspan="3" class="text-center">
                                            <div class="spinner-border spinner-border-sm"></div>
                                            Memuat data konversi...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            tabContentContainer.appendChild(tabContent);

            loadKonversiSatuan(produk.id);
        });
    }

    async function loadKonversiSatuan(produkId) {
        const satuanListBody = document.querySelector(`.satuan-list-body[data-produk-id="${produkId}"]`);

        try {
            const response = await fetch(`/api/produk/${produkId}/satuan`);
            const satuanList = await response.json();

            // Update state
            state.konversiSatuan[produkId] = satuanList;

            if (!satuanList || satuanList.length === 0) {
                satuanListBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center text-muted">
                            Tidak ada konversi satuan yang tersedia
                        </td>
                    </tr>
                `;
                return;
            }

            satuanListBody.innerHTML = satuanList.map(satuan => `
                <tr data-id="${satuan.id}">
                    <td>${satuan.konversi} ${satuan.satuan_dasar}</td>
                    <td>= ${satuan.jumlah} ${satuan.satuan_besar}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-danger btn-hapus-satuan"
                                    data-satuan-id="${satuan.id}"
                                    data-produk-id="${produkId}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error("Gagal memuat konversi satuan:", error);
            satuanListBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger">
                        Gagal memuat data konversi<br>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }

    async function saveSatuan(form, produkId) {
        const inputs = form.querySelectorAll('[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            }
        });

        if (!isValid) {
            showAlert('Harap isi semua field yang wajib diisi', 'warning');
            return;
        }
        const formData = new FormData(form);
        const produk = state.selectedProduk.find(p => p.id == produkId);

        const loadingSwal = Swal.fire({
            title: 'MENYIMPAN KONVERSI',
            html: 'SEDANG MEMPROSES KONVERSI SATUAN...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const satuanData = {
                produk_id: produkId,
                satuan_dasar: formData.get('satuan_dasar'),
                satuan_besar: formData.get('satuan_besar'),
                jumlah: formData.get('jumlah'),
                konversi: formData.get('konversi')
            };

            const response = await fetch('/api/produk/satuan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken
                },
                body: JSON.stringify(satuanData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal menyimpan konversi satuan');
            }

            await loadKonversiSatuan(produkId);
            populateSatuanFilter();

            await loadingSwal.close();

            await Swal.fire({
                title: 'Berhasil!',
                text: 'Konversi satuan berhasil disimpan',
                icon: 'success',
                confirmButtonText: 'OK'
            });

            form.querySelector('[name="satuan_besar"]').value = '';
            form.querySelector('[name="jumlah"]').value = '1';
            form.querySelector('[name="konversi"]').value = '';

        } catch (error) {
            await loadingSwal.close();
            console.error('Error:', error);
            await Swal.fire({
                title: 'Error',
                text: error.message || 'Terjadi kesalahan saat menyimpan konversi satuan',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    async function hapusSatuan(satuanId, produkId, button) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Konversi Satuan?',
            text: 'Konversi satuan akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (!isConfirmed) return;

        const originalHtml = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;

        try {
            const response = await fetch(`/api/produk/satuan/${satuanId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Gagal menghapus konversi satuan');
            }

            await loadKonversiSatuan(produkId);
            populateSatuanFilter();
            showAlert('Konversi satuan berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showAlert(`Gagal menghapus konversi satuan: ${error.message}`, 'danger');
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    // BARCODE
    function renderBarcodeModalTabs() {
        const tabsContainer = document.getElementById('barcodeTabsContainer');
        const tabContentContainer = document.getElementById('barcodeTabContent');

        document.getElementById('jumlahProdukBarcodeTerpilih').textContent = state.selectedProduk.length;

        tabsContainer.innerHTML = '';
        tabContentContainer.innerHTML = '';

        state.selectedProduk.forEach((produk, index) => {
            const isActive = index === 0;
            const tabId = `barcode-tab-${produk.id}`;
            const contentId = `barcode-content-${produk.id}`;

            // Tab Item
            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}"
                        id="${tabId}"
                        data-bs-toggle="tab"
                        data-bs-target="#${contentId}"
                        type="button">
                    ${produk.nama_produk}
                </button>
            `;
            tabsContainer.appendChild(tabItem);

            // Tab Content
            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            tabContent.id = contentId;
            tabContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <form class="barcode-form" data-produk-id="${produk.id}">
                            <input type="hidden" name="produk_id" value="${produk.id}">
                            <div class="mb-3">
                                <label class="form-label">Kode Barcode</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" name="kode_barcode" required
                                        placeholder="Masukkan kode barcode">
                                    <button class="btn btn-outline-secondary btn-generate-barcode" type="button"
                                            data-produk-id="${produk.id}">
                                        <i class="fas fa-barcode"></i> Generate Barcode
                                    </button>
                                </div>
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input" name="is_utama" id="is_utama_${produk.id}">
                                <label class="form-check-label" for="is_utama_${produk.id}">Jadikan barcode utama</label>
                            </div>
                            <div class="mb-3">
                                <div id="barcode-preview-${produk.id}" class="barcode-preview-container"></div>
                            </div>
                            <button type="button" class="btn btn-primary btn-save-barcode" data-produk-id="${produk.id}">
                                Simpan Barcode
                            </button>
                        </form>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">DAFTAR BARCODE</h6>
                            <button class="btn btn-sm btn-outline-secondary btn-cetak-semua-barcode"
                                    data-produk-id="${produk.id}">
                                <i class="fas fa-print"></i> Cetak Semua
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Status</th>
                                        <th>Preview</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="barcode-list-body" data-produk-id="${produk.id}">
                                    <tr>
                                        <td colspan="4" class="text-center">
                                            <div class="spinner-border spinner-border-sm"></div>
                                            Memuat data barcode...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            tabContentContainer.appendChild(tabContent);

            loadBarcodeProduk(produk.id);
        });
    }

    async function loadBarcodeProduk(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/barcode`);
            const barcodeList = await response.json();

            state.barcodes[produkId] = barcodeList;

            const barcodeListBody = document.querySelector(`.barcode-list-body[data-produk-id="${produkId}"]`);

            if (!barcodeList || barcodeList.length === 0) {
                barcodeListBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">
                            Tidak ada barcode yang tersedia
                        </td>
                    </tr>
                `;
                return;
            }

            barcodeListBody.innerHTML = barcodeList.map(barcode => `
                <tr data-id="${barcode.id}">
                    <td>${barcode.kode_barcode}</td>
                    <td>
                        <span class="badge ${barcode.is_utama ? 'bg-success' : 'bg-secondary'}">
                            ${barcode.is_utama ? 'Utama' : 'Tambahan'}
                        </span>
                    </td>
                    <td>
                        <div class="barcode-small-preview" id="barcode-small-${barcode.id}"></div>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-cetak-barcode"
                                    data-barcode="${barcode.kode_barcode}">
                                <i class="fas fa-print"></i>
                            </button>
                            <button class="btn btn-outline-success btn-set-utama-barcode"
                                    data-barcode-id="${barcode.id}"
                                    data-produk-id="${produkId}"
                                    ${barcode.is_utama ? 'disabled' : ''}>
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-hapus-barcode"
                                    data-barcode-id="${barcode.id}"
                                    data-produk-id="${produkId}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Render all barcode previews
            barcodeList.forEach(barcode => {
                renderBarcodePreview(
                    `barcode-small-${barcode.id}`,
                    barcode.kode_barcode,
                    {
                        height: 40,
                        displayValue: false,
                        format: detectBarcodeFormat(barcode.kode_barcode)
                    }
                );
            });
        } catch (error) {
            console.error("Gagal memuat barcode:", error);
            const barcodeListBody = document.querySelector(`.barcode-list-body[data-produk-id="${produkId}"]`);
            barcodeListBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        Gagal memuat data barcode<br>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }

    function detectBarcodeFormat(barcode) {
        // Auto-detect barcode format based on the input
        if (/^\d{12,13}$/.test(barcode)) return "EAN13"; // UPC/EAN
        if (/^[A-Za-z0-9]+$/.test(barcode)) return "CODE128"; // Alphanumeric
        return "CODE128"; // Default
    }

    function renderBarcodePreview(containerId, barcode, options = {}) {
        if (!barcode || barcode.trim() === '') {
            document.getElementById(containerId).innerHTML = `
                <div class="text-danger small">Kode barcode kosong</div>
            `;
            return;
        }

        const defaultOptions = {
            format: detectBarcodeFormat(barcode),
            lineColor: "#000",
            width: 2,
            height: 100,
            displayValue: true,
            fontSize: 16,
            margin: 10
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            // Clear previous content
            document.getElementById(containerId).innerHTML = '';

            // Create new canvas/svg element
            const element = document.createElement(mergedOptions.format === "EAN13" ? "canvas" : "svg");
            element.id = `${containerId}-element`;
            document.getElementById(containerId).appendChild(element);

            // Generate barcode
            JsBarcode(`#${containerId}-element`, barcode, mergedOptions);
        } catch (error) {
            console.error("Error generating barcode:", error);
            document.getElementById(containerId).innerHTML = `
                <div class="text-danger small">Gagal render barcode: ${error.message}</div>
            `;
        }
    }

    async function saveBarcode(form, produkId) {
        const barcodeForms = document.querySelectorAll('.barcode-form');
        const results = [];
        const loadingSwal = Swal.fire({
            title: 'MENYIMPAN BARCODE',
            html: 'SEDANG MEMPROSES BARCODE...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            for (const form of barcodeForms) {
                const formData = new FormData(form);
                const produkId = form.dataset.produkId;
                const produk = state.selectedProduk.find(p => p.id == produkId);
                const kodeBarcode = formData.get('kode_barcode');

                if (!kodeBarcode) {
                    results.push({
                        success: false,
                        produk: produk.nama_produk,
                        message: 'Barcode kosong, dilewati'
                    });
                    continue;
                }

                const barcodeData = {
                    produk_id: produkId,
                    kode_barcode: kodeBarcode,
                    is_utama: formData.get('is_utama') === 'on'
                };

                try {
                    const response = await fetch('/api/produk/barcode', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': DOM.meta.csrfToken
                        },
                        body: JSON.stringify(barcodeData)
                    });

                    const result = await response.json();
                    results.push({
                        success: response.ok,
                        produk: produk.nama_produk,
                        message: result.message || (response.ok ? 'Barcode berhasil disimpan' : 'Gagal menyimpan barcode')
                    });

                    if (response.ok) {
                        await loadBarcodeProduk(produkId);
                        form.reset();
                        document.getElementById(`barcode-preview-${produkId}`).innerHTML = '';
                    }
                } catch (error) {
                    results.push({
                        success: false,
                        produk: produk.nama_produk,
                        message: 'Terjadi kesalahan jaringan'
                    });
                }
            }

            await loadingSwal.close();

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;

            let message = `<div class="text-start">`;
            message += `<p><strong>Ringkasan Penyimpanan Barcode:</strong></p>`;
            message += `<ul>`;

            results.forEach(result => {
                message += `<li class="${result.success ? 'text-success' : 'text-danger'}">`;
                message += `<strong>${result.produk}:</strong> ${result.message}`;
                message += `</li>`;
            });

            message += `</ul>`;
            message += `</div>`;

            await Swal.fire({
                title: `Hasil Penyimpanan`,
                html: message,
                icon: errorCount > 0 ? (successCount > 0 ? 'warning' : 'error') : 'success',
                confirmButtonText: 'OK'
            });

            if (errorCount === 0) {
                const tabPanes = document.querySelectorAll('.barcode-tab-pane');
                tabPanes.forEach(tab => {
                    tab.classList.remove('show', 'active');
                });

                const tabLinks = document.querySelectorAll('.barcode-tab-link');
                tabLinks.forEach(link => {
                    link.classList.remove('active');
                });
            }

        } catch (error) {
            await loadingSwal.close();
            console.error('Error:', error);
            await Swal.fire({
                title: 'Error',
                text: 'Terjadi kesalahan saat memproses barcode',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    async function hapusBarcode(barcodeId, produkId, button) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Barcode?',
            text: 'Barcode akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (!isConfirmed) return;

        const originalHtml = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;

        try {
            const response = await fetch(`/api/produk/barcode/${barcodeId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
            });

            if (!response.ok) throw new Error('Gagal menghapus');

            await loadBarcodeProduk(produkId);
            showAlert('Barcode berhasil dihapus!', 'success');
        } catch (error) {
            showAlert(`Gagal menghapus: ${error.message}`, 'danger');
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    async function setAsUtamaBarcode(barcodeId, produkId) {
        try {
            const response = await fetch(`/api/produk/barcode/${barcodeId}/set-utama`, {
                method: 'PUT',
                headers: { 'X-CSRF-TOKEN': DOM.meta.csrfToken }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Gagal mengubah barcode utama');
            }

            await loadBarcodeProduk(produkId);
            showAlert('Barcode utama berhasil diubah!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showAlert(`Gagal mengubah barcode utama: ${error.message}`, 'danger');
        }
    }

    function generateRandomUPC(produkId) {
        const form = document.querySelector(`.barcode-form[data-produk-id="${produkId}"]`);
        const barcodeInput = form.querySelector('[name="kode_barcode"]');
        const previewContainer = document.getElementById(`barcode-preview-${produkId}`);

        let barcode = '';
        for (let i = 0; i < 12; i++) {
            barcode += Math.floor(Math.random() * 10);
        }

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        barcode += checkDigit;

        barcodeInput.value = barcode;

        previewContainer.innerHTML = `
            <div class="text-center border p-2">
                <div id="barcode-preview-element-${produkId}"></div>
                <div class="mt-2">${barcode}</div>
            </div>
        `;

        renderBarcodePreview(`barcode-preview-element-${produkId}`, barcode, {
            format: "EAN13",
            height: 100,
            displayValue: false
        });
    }

    function printBarcode(barcodeData) {
        if (!barcodeData || barcodeData.trim() === '') {
            showAlert('Kode barcode tidak valid', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        const format = detectBarcodeFormat(barcodeData);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Barcode</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                    }
                    .barcode-container {
                        text-align: center;
                        margin: 20px 0;
                        padding: 20px;
                        border: 1px solid #eee;
                    }
                    .barcode-value {
                        margin-top: 10px;
                        font-size: 16px;
                        font-weight: bold;
                        letter-spacing: 2px;
                    }
                    .no-print {
                        margin-top: 20px;
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                        .barcode-container { border: none; }
                    }
                </style>
            </head>
            <body>
                <div class="barcode-container">
                    <${format === "EAN13" ? "canvas" : "svg"} id="barcode-print-element"></${format === "EAN13" ? "canvas" : "svg"}>
                    <div class="barcode-value">${barcodeData}</div>
                </div>
                <div class="no-print">
                    <button onclick="window.print()" class="btn btn-primary">Cetak</button>
                    <button onclick="window.close()" class="btn btn-secondary" style="margin-left:10px">Tutup</button>
                </div>
                <script>
                    window.onload = function() {
                        try {
                            JsBarcode("#barcode-print-element", "${barcodeData}", {
                                format: "${format}",
                                lineColor: "#000",
                                width: ${format === "EAN13" ? 1.5 : 2},
                                height: 80,
                                displayValue: false,
                                margin: 10
                            });
                        } catch(e) {
                            document.querySelector(".barcode-container").innerHTML =
                                '<p class="text-danger">Error: ' + e.message + '</p>';
                        }
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    function printAllBarcodes(barcodes) {
        if (!barcodes || barcodes.length === 0) {
            showAlert('Tidak ada barcode untuk dicetak', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Semua Barcode</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                    }
                    .page {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        page-break-after: always;
                    }
                    .barcode-item {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 15px;
                        border: 1px dashed #ddd;
                        page-break-inside: avoid;
                    }
                    .barcode-value {
                        margin-top: 8px;
                        font-size: 12px;
                        word-break: break-all;
                        text-align: center;
                    }
                    .no-print {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                        .barcode-item { border: none; }
                    }
                </style>
            </head>
            <body>
                <h1 class="no-print">Preview Cetakan (${barcodes.length} barcode)</h1>
                <div id="barcodes-container"></div>
                <div class="no-print">
                    <button onclick="window.print()" class="btn btn-primary">Cetak</button>
                    <button onclick="window.close()" class="btn btn-secondary" style="margin-left:10px">Tutup</button>
                </div>
                <script>
                    window.onload = function() {
                        const container = document.getElementById('barcodes-container');
                        const barcodes = ${JSON.stringify(barcodes)};

                        // Organize into pages (9 per page)
                        const itemsPerPage = 9;
                        const pageCount = Math.ceil(barcodes.length / itemsPerPage);

                        for (let page = 0; page < pageCount; page++) {
                            const pageDiv = document.createElement('div');
                            pageDiv.className = 'page';

                            const start = page * itemsPerPage;
                            const end = start + itemsPerPage;
                            const pageItems = barcodes.slice(start, end);

                            pageItems.forEach(barcode => {
                                const format = ${detectBarcodeFormat.toString()}(barcode.kode_barcode);
                                const itemDiv = document.createElement('div');
                                itemDiv.className = 'barcode-item';
                                itemDiv.innerHTML = \`
                                    <\${format === "EAN13" ? "canvas" : "svg"}
                                        id="barcode-\${barcode.id}"></\${format === "EAN13" ? "canvas" : "svg"}>
                                    <div class="barcode-value">\${barcode.kode_barcode}</div>
                                \`;
                                pageDiv.appendChild(itemDiv);

                                try {
                                    JsBarcode("#barcode-\${barcode.id}", barcode.kode_barcode, {
                                        format: format,
                                        lineColor: "#000",
                                        width: \${format === "EAN13" ? 1.5 : 2},
                                        height: 60,
                                        displayValue: false,
                                        margin: 5
                                    });
                                } catch(e) {
                                    itemDiv.innerHTML = '<p class="text-danger">Error: ' + e.message + '</p>';
                                }
                            });

                            container.appendChild(pageDiv);
                        }

                        setTimeout(() => window.print(), 300);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // DISKON
    function renderDiskonModalTabs() {
        const tabsContainer = document.getElementById('produkDiskonTabs');
        const tabContentContainer = document.getElementById('produkDiskonTabContent');

        document.getElementById('jumlahProdukTerpilih').textContent = state.selectedProduk.length;

        tabsContainer.innerHTML = '';
        tabContentContainer.innerHTML = '';

        state.selectedProduk.forEach((produk, index) => {
            const isActive = index === 0;
            const tabId = `produk-tab-${produk.id}`;
            const contentId = `produk-content-${produk.id}`;

            const tabItem = document.createElement('li');
            tabItem.className = 'nav-item';
            tabItem.innerHTML = `
                <button class="nav-link ${isActive ? 'active' : ''}"
                        id="${tabId}"
                        data-bs-toggle="tab"
                        data-bs-target="#${contentId}"
                        type="button">
                    ${produk.nama_produk}
                </button>
            `;
            tabsContainer.appendChild(tabItem);

            const tabContent = document.createElement('div');
            tabContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
            tabContent.id = contentId;
            tabContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <form class="diskon-form" data-produk-id="${produk.id}">
                            <input type="hidden" name="produk_id" value="${produk.id}">
                            <div class="mb-3">
                                <label class="form-label">Jumlah Minimum</label>
                                <input type="number" class="form-control" name="jumlah_minimum" required min="1">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Diskon (%)</label>
                                <input type="number" class="form-control" name="diskon" required min="0" max="100" step="0.01">
                            </div>
                            <div class="mb-3 form-check">
                                <input type="checkbox" class="form-check-input is_tanpa_waktu"
                                    id="is_tanpa_waktu_${produk.id}" name="is_tanpa_waktu">
                                <label class="form-check-label" for="is_tanpa_waktu_${produk.id}">Diskon Tanpa Batas Waktu</label>
                            </div>
                            <div class="waktu-diskon-container">
                                <div class="mb-3">
                                    <label class="form-label">Tanggal Mulai</label>
                                    <input type="date" class="form-control" name="tanggal_mulai">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tanggal Berakhir</label>
                                    <input type="date" class="form-control" name="tanggal_berakhir">
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary btn-save-diskon-tab"
                                    data-produk-id="${produk.id}">
                                Simpan Diskon
                            </button>
                        </form>
                    </div>
                    <div class="col-md-6">
                        <h6>DAFTAR DISKON YANG BERLAKU</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>Min. Qty</th>
                                        <th>Diskon</th>
                                        <th>Periode</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody class="diskon-list-body" data-produk-id="${produk.id}">
                                    <tr>
                                        <td colspan="5" class="text-center">
                                            <div class="spinner-border spinner-border-sm" role="status"></div>
                                            Memuat data diskon...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            tabContentContainer.appendChild(tabContent);

            loadDiskonProduk(produk.id);

            const toggleEl = tabContent.querySelector('.is_tanpa_waktu');
            const waktuContainer = tabContent.querySelector('.waktu-diskon-container');

            toggleEl.addEventListener('change', function() {
                waktuContainer.style.display = this.checked ? 'none' : 'block';
            });
        });
    }

    async function loadDiskonProduk(produkId) {
        try {
            const response = await fetch(`/api/produk/${produkId}/diskon`);
            const diskonList = await response.json();

            const diskonListBody = document.querySelector(`.diskon-list-body[data-produk-id="${produkId}"]`);

            if (!diskonList || diskonList.length === 0) {
                diskonListBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            Tidak ada diskon yang tersedia
                        </td>
                    </tr>
                `;
                return;
            }

            diskonListBody.innerHTML = diskonList.map(diskon => `
                <tr data-id="${diskon.id}">
                    <td>${diskon.jumlah_minimum}</td>
                    <td>${diskon.diskon}%</td>
                    <td>
                        ${diskon.is_tanpa_waktu ? 'Selamanya' : `
                            ${formatDate(diskon.tanggal_mulai)} - ${formatDate(diskon.tanggal_berakhir)}
                        `}
                    </td>
                    <td>
                        <span class="badge ${getDiskonStatusBadge(diskon)}">
                            ${getDiskonStatusText(diskon)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger btn-hapus-diskon" id="">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading diskon:', error);
            const diskonListBody = document.querySelector(`.diskon-list-body[data-produk-id="${produkId}"]`);
            diskonListBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Gagal memuat data diskon
                    </td>
                </tr>
            `;
        }
    }

    async function saveDiskon(form, produkId) {
        const inputs = form.querySelectorAll('[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
            }
        });

        if (!isValid) {
            showAlert('Harap isi semua field yang wajib diisi', 'warning');
            return;
        }

        const formData = new FormData(form);
        const produk = state.selectedProduk.find(p => p.id == produkId);

        const loadingSwal = Swal.fire({
            title: 'MENYIMPAN DISKON',
            html: 'SEDANG MEMPROSES DISKON...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const diskonData = {
                produk_id: produkId,
                jumlah_minimum: formData.get('jumlah_minimum'),
                diskon: formData.get('diskon'),
                is_tanpa_waktu: formData.get('is_tanpa_waktu') === 'on',
                tanggal_mulai: formData.get('tanggal_mulai'),
                tanggal_berakhir: formData.get('tanggal_berakhir')
            };

            const response = await fetch('/api/produk/diskon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken
                },
                body: JSON.stringify(diskonData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal menyimpan diskon');
            }

            await loadDiskonProduk(produkId);

            await loadingSwal.close();

            await Swal.fire({
                title: 'Berhasil!',
                text: `Diskon untuk ${produk.nama_produk} berhasil disimpan`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            // Reset form jika perlu
            // form.reset();

        } catch (error) {
            await loadingSwal.close();
            showAlert(`Gagal menyimpan diskon: ${error.message}`, 'danger');
        }
    }

    async function hapusDiskon(diskonId, button) {
        const { isConfirmed } = await Swal.fire({
            title: 'Hapus Diskon?',
            text: 'Diskon akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (!isConfirmed) return;

        const originalHtml = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        button.disabled = true;

        try {
            const response = await fetch(`/api/produk/diskon/${diskonId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Gagal menghapus diskon');
            }

            const row = button.closest('tr');
            const produkId = row.closest('.tab-pane').id.replace('produk-content-', '');
            await loadDiskonProduk(produkId);

            showAlert('Diskon berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error:', error);
            showAlert(`Gagal menghapus diskon: ${error.message}`, 'danger');
        } finally {
            button.innerHTML = originalHtml;
            button.disabled = false;
        }
    }

    function handleDiscountToggle(e) {
        if (!e.target.classList.contains('is_tanpa_waktu')) return;

        const waktuContainer = e.target.closest('.tab-pane')
                            .querySelector('.waktu-diskon-container');

        if (waktuContainer) {
            waktuContainer.style.display = e.target.checked ? 'none' : 'block';
        }
    }

    function getDiskonStatusBadge(diskon) {
        const now = new Date();

        if (diskon.is_tanpa_waktu) return 'bg-success';

        const start = new Date(diskon.tanggal_mulai);
        const end = new Date(diskon.tanggal_berakhir);

        if (now < start) return 'bg-warning text-dark';
        if (now > end) return 'bg-secondary';
        return 'bg-primary';
    }

    function getDiskonStatusText(diskon) {
        const now = new Date();

        if (diskon.is_tanpa_waktu) return 'Aktif';

        const start = new Date(diskon.tanggal_mulai);
        const end = new Date(diskon.tanggal_berakhir);

        if (now < start) return 'Akan Datang';
        if (now > end) return 'Kadaluwarsa';
        return 'Aktif';
    }

    // TABLE INLINE EDIT
    function enterEditMode() {
        if (state.isEditMode) return;
        state.isEditMode = true;
        const banner = document.getElementById('editModeBanner');
        banner.classList.remove('d-none');
        document.querySelectorAll('.editable-cell').forEach(cell => cell.classList.add('edit-mode'));
    }

    function exitEditMode() {
        if (!state.isEditMode) return;
        state.isEditMode = false;
        const banner = document.getElementById('editModeBanner');
        banner.classList.add('d-none');
        document.querySelectorAll('.editable-cell').forEach(cell => cell.classList.remove('edit-mode'));
    }

    function handleTableClick(e) {
        if (!state.isEditMode) return;
        if (e.target.classList.contains('row-checkbox') || e.target.tagName === 'INPUT') return;

        const cell = e.target.closest('.editable-cell');
        if (!cell) return;

        makeCellEditable(cell);
    }

    function makeCellEditable(cell) {
        const field = cell.getAttribute('data-field');
        const rowId = cell.closest('tr').getAttribute('data-id');
        let currentValue = cell.textContent.trim();

        if (field === 'harga_beli' || field === 'harga_jual') {
            currentValue = currentValue.replace('Rp ', '').replace(/\./g, '');
        }

        const inputType = getInputType(field);
        cell.innerHTML = `<input type="${inputType}" class="form-control form-control-sm" value="${currentValue}">`;

        const input = cell.querySelector('input');
        input.focus();

        const saveChanges = () => handleSaveChanges(input, field, rowId, cell, currentValue);

        input.addEventListener('blur', saveChanges);
        input.addEventListener('keypress', (e) => e.key === 'Enter' && saveChanges());
    }

    async function handleSaveChanges(input, field, rowId, cell, originalValue) {
        let newValue = input.value;
        const row = cell.closest('tr');
        const produk = state.allProducts.find(p => p.id == rowId);

        if (field === 'stok') {
            const satuanFilter = DOM.filters.unit.value.trim().toLowerCase();
            const satuanProduk = (produk.satuan || '').trim().toLowerCase();

            if (satuanFilter && satuanFilter !== satuanProduk) {
                const konversiArr = state.konversiSatuan[produk.id] || [];
                const konversiDasar = konversiArr.find(
                    k => (k.satuan_dasar || '').trim().toLowerCase() === satuanFilter
                );
                if (konversiDasar && konversiDasar.konversi > 0) {
                    newValue = Math.floor(parseInt(newValue) / konversiDasar.konversi);
                } else {
                    const konversiBesar = konversiArr.find(
                        k => (k.satuan_besar || '').trim().toLowerCase() === satuanFilter
                    );
                    if (konversiBesar && konversiBesar.konversi > 0) {
                        newValue = parseInt(newValue) * konversiBesar.konversi;
                    }
                }
            }
        }

        try {
            newValue = processFieldValue(field, newValue);

            const response = await fetch(`/api/produk/${rowId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ [field]: newValue })
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'GAGAL MENYIMPAN PRODUK');
            }

            displayUpdatedValue(cell, field, newValue);

            const updatedNamaProduk = data.data?.nama_produk ||
                                    row.querySelector('[data-field="nama_produk"]').textContent.trim();

            showAlert(`PRODUK ${updatedNamaProduk} BERHASIL DIPERBARUI`, 'success', 3000);

            loadData(state.currentSort.field, state.currentSort.direction);
        } catch (error) {
            console.error('Error:', error);
            showAlert(
                `GAGAL MEMPERBARUI PRODUK: ${error.message}`,
                'danger',
                5000
            );
            cell.textContent = originalValue;
        }
    }

    // UTILITY
    function showAlert(message, type = 'success', duration = 3000) {
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

    function processFieldValue(field, value) {
        const processors = {
            harga_beli: v => parseFloat(v.replace(/[^0-9]/g, '')) || 0,
            harga_jual: v => parseFloat(v.replace(/[^0-9]/g, '')) || 0,
            stok: v => parseInt(v) || 0
        };
        return processors[field] ? processors[field](value) : value;
    }

    function displayUpdatedValue(cell, field, value) {
        const formatters = {
            harga_beli: v => 'Rp ' + v.toLocaleString('id-ID'),
            harga_jual: v => 'Rp ' + v.toLocaleString('id-ID')
        };
        cell.textContent = formatters[field] ? formatters[field](value) : value;
    }

    function formatCurrency(value) {
        return value ? 'Rp ' + parseInt(value).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : 'Rp 0';
    }

    function formatNumber(value) {
        return value ? parseFloat(value).toLocaleString('id-ID') : '0';
    }

    function formatDate(dateString) {
        if (!dateString || dateString === '-') return '-';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateString;
        }
    }

    function formatRelativeDate(dateString){
        if(!dateString) return '-';

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        const intervals = {
            tahun: 31536000,
            bulan: 2592000,
            minggu: 604800,
            hari: 86400,
            jam: 3600,
            menit: 60
        };

        for (const [unit, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `${interval} ${unit} yang lalu`;
            }
        }

        return 'Baru saja';
    }

    function getInputType(field) {
        const inputTypes = {
            stok: 'number'
        };
        return inputTypes[field] || 'text';
    }

    function updateTotals(data) {
        state.totals = {
            produk: data.length,
            stok: calculateTotalStok(data),
            modal: calculateTotalModal(data),
            nilaiProduk: calculateNilaiTotalProduk(data)
        };

        updateDisplayedTotals();
    }

    function updateDisplayedTotals() {
        document.getElementById('totalProdukCount').textContent = state.totals.produk;
        document.getElementById('totalStokCount').textContent = state.totals.stok;
        document.getElementById('totalModalCount').textContent = formatNumber(state.totals.modal);
        document.getElementById('nilaiTotalProdukCount').textContent = formatNumber(state.totals.nilaiProduk);
    }

    function calculateTotalStok(data) {
        const satuanFilterValue = DOM.filters.unit.value;
        return data.reduce((sum, item) => sum + (parseInt(getStokBySatuan(item, satuanFilterValue)) || 0), 0);
    }

    function getStokBySatuan(produk, satuanValue) {
        if (!satuanValue) return produk.stok;

        const satuanProduk = (produk.satuan || '').trim().toLowerCase();
        const satuanFilter = satuanValue.trim().toLowerCase();

        if (satuanFilter === satuanProduk) {
            return produk.stok;
        }

        const konversiArr = state.konversiSatuan[produk.id] || [];

        const konversiBesar = konversiArr.find(
            k => (k.satuan_besar || '').trim().toLowerCase() === satuanFilter
        );
        if (konversiBesar && konversiBesar.konversi > 0) {
            return Math.floor(produk.stok / konversiBesar.konversi);
        }

        const konversiDasar = konversiArr.find(
            k => (k.satuan_dasar || '').trim().toLowerCase() === satuanFilter
        );
        if (konversiDasar && konversiDasar.konversi > 0) {
            return produk.stok * konversiDasar.konversi;
        }

        return 0;
    }

    function calculateTotalModal(data) {
        return data.reduce((sum, item) => {
            const hargaBeli = parseFloat(item.harga_beli) || 0;
            const stok = parseInt(item.stok) || 0;
            return sum + (hargaBeli * stok);
        }, 0);
    }

    function calculateNilaiTotalProduk(data) {
        return data.reduce((sum, item) => {
            const hargaJual = parseFloat(item.harga_jual) || 0;
            const stok = parseInt(item.stok) || 0;
            return sum + (hargaJual * stok);
        }, 0);
    }

    init();
});
