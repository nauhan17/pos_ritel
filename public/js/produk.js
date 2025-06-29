document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tablebody = document.getElementById('tableBody');
    const sortableHeaders = document.querySelectorAll('.sortable');
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    const addRowBtn = document.getElementById('addRowBtn');
    const addModal = new bootstrap.Modal(document.getElementById('addModal'));
    const saveNewBtn = document.getElementById('saveNewBtn');
    const supplierFilter = document.getElementById('supplierFilter');
    const kategoriFilter = document.getElementById('kategoriFilter');
    const rakFilter = document.getElementById('rakFilter');
    const deleteBtn = document.getElementById('deleteBtn');
    const diskonBtn = document.getElementById('diskonBtn');

    // Discount Modal Elements
    const diskonModal = new bootstrap.Modal(document.getElementById('diskonModal'));
    const saveDiskonBtn = document.getElementById('saveDiskonBtn');
    const isTanpaWaktuCheckbox = document.getElementById('is_tanpa_waktu');

    // State Management
    let currentSort = { field: 'nama_produk', direction: 'asc' };
    let totalProduk = 0;
    let totalStok = 0;
    let totalModal = 0;
    let nilaiTotalProduk = 0;
    let allProducts = [];
    let isEditMode = false;

    // Initialization
    init();

    function init() {
        loadData(currentSort.field, currentSort.direction);
        setupEventListeners();
    }

    function setupEventListeners() {
        // Sorting
        sortableHeaders.forEach(header => {
            header.addEventListener('click', handleSort);
        });

        // Filtering
        supplierFilter.addEventListener('change', applyFilters);
        kategoriFilter.addEventListener('change', applyFilters);
        rakFilter.addEventListener('change', applyFilters);

        // Product CRUD
        addRowBtn.addEventListener('click', () => addModal.show());
        saveNewBtn.addEventListener('click', handleAddProduct);
        deleteBtn.addEventListener('click', deleteSelected);
        tablebody.addEventListener('click', (e) => makeCellEditable(e));

        // Discount Feature
        saveDiskonBtn.addEventListener('click', saveDiskon);

        document.getElementById('editToggleBtn').addEventListener('click', toggleEditMode);
    }

    // Data Loading Functions
    async function loadData(sortField, sortDirection) {
        try {
            const response = await fetch(`/api/produk?sort=${sortField}&order=${sortDirection}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Network response was not ok');
            }

            allProducts = await response.json();
            renderTable(allProducts);
            updateTotals(allProducts);
            populateFilters(allProducts);
        } catch (error) {
            handleDataLoadError(error);
        }
    }

    function handleDataLoadError(error) {
        console.error('Error fetching data:', error);
        tablebody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">GAGAL MEMUAT DATA: ${error.message}</td></tr>`;
        updateTotals([]);
    }

    // Filter Functions
    function applyFilters() {
        const selectedSupplier = supplierFilter.value;
        const selectedKategori = kategoriFilter.value;
        const selectedRak = rakFilter.value;

        const filteredData = allProducts.filter(produk => {
            const matchSupplier = !selectedSupplier || produk.supplier === selectedSupplier;
            const matchKategori = !selectedKategori || produk.kategori === selectedKategori;
            const matchRak = !selectedRak || produk.rak === selectedRak;

            return matchSupplier && matchKategori && matchRak;
        });

        renderTable(filteredData);
        updateTotals(filteredData);
    }

    function populateFilters(data) {
        populateDropdown(supplierFilter, data, 'supplier');
        populateDropdown(kategoriFilter, data, 'kategori');
        populateDropdown(rakFilter, data, 'rak');
    }

    function populateDropdown(selectElement, data, property) {
        const uniqueValues = [...new Set(data.map(p => p[property]))].filter(Boolean);
        selectElement.innerHTML = '<option selected value="">Semua ' + property.charAt(0).toUpperCase() + property.slice(1) + '</option>' +
            uniqueValues.map(value => `<option value="${value}">${value}</option>`).join('');
    }

    // Table Rendering
    function renderTable(data) {
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', data);
            tablebody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">FORMAT DATA TIDAK VALID</td></tr>`;
            return;
        }

        if (data.length === 0) {
            tablebody.innerHTML = `<tr><td colspan="8" class="text-center">TIDAK ADA DATA</td></tr>`;
            return;
        }

        tablebody.innerHTML = data.map(item => `
            <tr data-id="${item.id}">
                <td><input type="checkbox" class="row-checkbox" data-id="${item.id}"></td>
                <td class="editable-cell" data-field="nama_produk">${item.nama_produk || ''}</td>
                <td class="editable-cell" data-field="barcode">${item.barcode || ''}</td>
                <td class="editable-cell" data-field="stok">${item.stok || 0}</td>
                <td class="editable-cell" data-field="harga_beli">${formatCurrency(item.harga_beli)}</td>
                <td class="editable-cell" data-field="harga_jual">${formatCurrency(item.harga_jual)}</td>
                <td class="editable-cell" data-field="diskon">${item.diskon ? parseFloat(item.diskon).toFixed(2) : '0.00'}</td>
                <td class="editable-cell" data-field="kadaluwarsa">${formatDate(item.kadaluwarsa)}</td>
            </tr>
        `).join('');
    }

    // Sorting Functions
    function handleSort() {
        const sortField = this.getAttribute('data-sort');

        if (currentSort.field === sortField) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = sortField;
            currentSort.direction = 'asc';
        }

        loadData(currentSort.field, currentSort.direction);
        updateSortIcons();
    }

    function updateSortIcons() {
        sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (header.getAttribute('data-sort') === currentSort.field) {
                icon.className = `fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    // Product CRUD Functions
    async function handleAddProduct() {
        const form = document.getElementById('addForm');
        const formData = new FormData(form);

        try {
            const response = await fetch('/api/produk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(Object.fromEntries(formData))
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to add product');
            }

            addModal.hide();
            form.reset();
            loadData(currentSort.field, currentSort.direction);
        } catch (error) {
            console.error('Error:', error);
            alert(`GAGAL MENAMBAHAKAN DATA: ${error.message}`);
        }
    }

    async function deleteSelected() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

        if (ids.length === 0) {
            alert('Pilih data dulu!');
            return;
        }

        if (!confirm(`Hapus ${ids.length} data?`)) return;

        try {
            const response = await fetch('/api/produk/delete-multiple', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ ids })
            });

            const result = await response.json();

            if (result.error) throw new Error(result.error);

            alert('Data terhapus!');
            loadData(currentSort.field, currentSort.direction);
        } catch (error) {
            alert(error.message);
        }
    }

    function toggleEditMode(){
        isEditMode = !isEditMode;
        const btn = document.getElementById('editToggleBtn');

        if(isEditMode){
            btn.style.border = '3px solid #10B981';
        } else {
            btn.style.border = '';
        }
    }

    // Cell Editing
    function makeCellEditable(e) {
        if(!isEditMode){
            console.log('EDIT MODE IS OFF');
            return;
        }
        if (e.target.classList.contains('row-checkbox') || e.target.tagName === 'INPUT') return;

        const cell = e.target.closest('.editable-cell');
        if (!cell) return;

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
        cell.removeEventListener('click', makeCellEditable);
    }

    function getInputType(field) {
        if (field === 'stok' || field === 'diskon') return 'number';
        if (field === 'kadaluwarsa') return 'date';
        return 'text';
    }

    async function handleSaveChanges(input, field, rowId, cell, originalValue) {
        let newValue = input.value;

        try {
            newValue = processFieldValue(field, newValue);

            console.log('Mengirim Data: ', {
                field: field,
                value: newValue,
                rowId: rowId,
            });

            const response = await fetch(`/api/produk/${rowId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({ [field]: newValue })
            });

            if (!response.ok) throw new Error('Gagal menyimpan perubahan');

            displayUpdatedValue(cell, field, newValue);
            loadData(currentSort.field, currentSort.direction);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
            cell.textContent = originalValue;
        } finally {
            cell.addEventListener('click', makeCellEditable);
        }
    }

    function processFieldValue(field, value) {
        if (field === 'harga_beli' || field === 'harga_jual') {
            return parseFloat(value.replace(/[^0-9]/g, '')) || 0;
        } else if (field === 'stok' || field === 'diskon') {
            return parseInt(value) || 0;
        } else if (field === 'diskon'){
            return parseFloat(value) || 0;
        }
        return value;
    }

    function displayUpdatedValue(cell, field, value) {
        if (field === 'harga_beli' || field === 'harga_jual') {
            cell.textContent = 'Rp ' + value.toLocaleString('id-ID');
        } else if(field === 'diskon') {
            cell.textContent = value.toFixed(2);
        } else {
            cell.textContent = value;
        }
    }

    async function saveDiskon() {
        const form = document.getElementById('diskonForm');
        const formData = new FormData(form);
        const produkId = formData.get('produk_id');

        const diskonData = {
            produk_id: produkId,
            jumlah_minimum: formData.get('jumlah_minimum'),
            diskon: formData.get('diskon'),
            is_tanpa_waktu: formData.get('is_tanpa_waktu') === 'on',
            tanggal_mulai: formData.get('tanggal_mulai'),
            tanggal_berakhir: formData.get('tanggal_berakhir')
        };

        try {
            const response = await fetch('/api/produk/diskon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(diskonData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal menyimpan diskon');
            }

            alert('Diskon berhasil disimpan!');
            loadDiskonProduk(produkId);
            diskonModal.hide();
            form.reset();
            loadData(currentSort.field, currentSort.direction);
        } catch (error) {
            console.error('Error:', error);
            alert('Gagal menyimpan diskon: ' + error.message);
        }
    }

    // Utility Functions
    function updateTotals(data) {
        updateTotalProduk(data.length);
        updateTotalStok(calculateTotalStok(data));
        updateTotalModal(calculateTotalModal(data));
        updateNilaiTotalProduk(calculateNilaiTotalProduk(data));
    }

    function calculateTotalStok(data) {
        return data.reduce((sum, item) => sum + (parseInt(item.stok) || 0), 0);
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

    function updateTotalProduk(count) {
        document.getElementById('totalProdukCount').textContent = count;
    }

    function updateTotalStok(count) {
        document.getElementById('totalStokCount').textContent = count;
    }

    function updateTotalModal(count) {
        document.getElementById('totalModalCount').textContent = formatNumber(count);
    }

    function updateNilaiTotalProduk(count) {
        document.getElementById('nilaiTotalProdukCount').textContent = formatNumber(count);
    }

    function formatCurrency(value) {
        if (!value) return 'Rp 0';
        return 'Rp ' + parseFloat(value).toLocaleString('id-ID');
    }

    function formatNumber(value) {
        if (!value) return '0';
        return parseFloat(value).toLocaleString('id-ID');
    }

    function formatDate(dateString) {
        if(!dateString || dateString === '-') return '-';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch(e){
            console.error('Error formatting date: ', e);
            return dateString;
        }
    }
});
