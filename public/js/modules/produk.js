// SIMPLIFIED: Keep only essential functions
document.addEventListener('DOMContentLoaded', function () {
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

    // STATE MANAGEMENT
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

    // PAGINATION STATE
    const pagination = {
        page: 1,
        pageSize: 10
    };

    // INITIALIZATION
    function init() {
        loadData(state.currentSort.field, state.currentSort.direction);
        setupEventListeners();
    }

    // Initialize on DOM ready
    function setupEventListeners() {
        // Cegah duplikasi event listener jika sudah pernah dipasang
        if (window.produkEventListenersAttached) return;

        // Event klik pada tabel dan pagination
        document.addEventListener('click', function (e) {
            // Jika klik pada baris tabel produk
            if (e.target.closest('#tableBody')) {
                handleTableClick(e);
            }
            // Jika klik pada pagination
            if (e.target.closest('#produkPagination')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (!isNaN(page) && page > 0) {
                    pagination.page = page;
                    performSimpleSearch();
                }
            }
        });

        // Event perubahan page size pada pagination
        const pageSizeSelect = document.getElementById('produkPageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', function (e) {
                pagination.pageSize = parseInt(e.target.value);
                pagination.page = 1; // Reset ke halaman 1 saat page size berubah
                performSimpleSearch();
            });
        }

        // Event perubahan checkbox baris (pilih produk)
        document.addEventListener('change', function (e) {
            if (e.target.classList.contains('row-checkbox')) {
                handleRowCheckboxChange(e.target);
            }
        });

        // Event pencarian produk (input search)
        const searchInput = document.getElementById('searchProdukInput');
        if (searchInput) {
            searchInput.addEventListener('input', performSimpleSearch);
        }

        // Event export Excel dan PDF
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                exportToExcel();
            });
        }
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                exportToPdf();
            });
        }

        // Event sorting dan filter kategori/supplier
        DOM.table.sortableHeaders.forEach(header => header.addEventListener('click', handleSort));
        DOM.filters.kategori.addEventListener('change', performSimpleSearch);
        DOM.filters.supplier.addEventListener('change', performSimpleSearch);
        DOM.table.selectAll.addEventListener('change', handleSelectedRow);

        // Event tombol aksi utama (tambah, simpan, hapus produk)
        document.getElementById('baruProdukBtn').addEventListener('click', initializeProductModal);
        document.getElementById('saveProductBtn').addEventListener('click', saveCompleteProduct);
        document.getElementById('hapusProdukBtn').addEventListener('click', deleteSelected);

        // Event modal tambah produk (reset form saat modal ditutup)
        const modalElement = document.getElementById('baruProdukModal');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', function () {
                setupModalEventListeners();
            });

            modalElement.addEventListener('hidden.bs.modal', function () {
                // Reset state produk baru dan form saat modal ditutup
                state.newProduct = {
                    barcodes: [],
                    konversiSatuan: [],
                    diskon: []
                };

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

        // Event tombol edit mode dan keluar edit mode
        const editTableBtn = document.getElementById('editTableBtn');
        const exitEditModeBtn = document.getElementById('exitEditModeBtn');
        if (editTableBtn) editTableBtn.addEventListener('click', enterEditMode);
        if (exitEditModeBtn) exitEditModeBtn.addEventListener('click', exitEditMode);

        // Event tombol restok produk
        const restokBtn = document.getElementById('restokProdukBtn');
        if (restokBtn) {
            restokBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Validasi: harus ada produk yang dipilih
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

        // Event tombol retur produk
        const returBtn = document.getElementById('returProdukBtn');
        if (returBtn) {
            returBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Validasi: harus ada produk yang dipilih
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

        // Event saat modal restok ditutup: bersihkan backdrop dan body
        const restokModalEl = document.getElementById('restokProdukModal');
        if (restokModalEl) {
            restokModalEl.addEventListener('hidden.bs.modal', function () {
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
        }

        // Event saat modal retur ditutup: bersihkan backdrop dan body
        const returModalEl = document.getElementById('returProdukModal');
        if (returModalEl) {
            returModalEl.addEventListener('hidden.bs.modal', function () {
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            });
        }

        // Tandai bahwa event listener sudah dipasang agar tidak dobel
        window.produkEventListenersAttached = true;
    }

    // LOAD DATA FUNCTION
    async function loadData(sortField, sortDirection) {
        try {
            // Ambil data produk dari API dengan parameter sorting
            const response = await fetch(`/api/produk?sort=${sortField}&order=${sortDirection}`, {
                credentials: 'same-origin',
            });

            // Jika gagal, tampilkan pesan error
            if (!response.ok) {
                throw new Error('Gagal memuat data');
            }

            // Simpan data produk ke state
            const produkList = await response.json();
            state.allProducts = produkList;

            // Render tabel, update statistik, dan filter
            renderTable(state.allProducts);
            updateTotals(state.allProducts);
            populateFilters(state.allProducts);

        } catch (error) {
            // Jika error, tampilkan pesan error di tabel
            console.error('Error:', error);
            DOM.table.body.innerHTML = `
                <tr><td colspan="9" class="text-center text-danger">GAGAL MEMUAT DATA: ${error.message}</td></tr>
            `;
        }
    }

    // Fungsi untuk melakukan pencarian/filter sederhana pada data produk
    function performSimpleSearch() {
        // Ambil data yang sudah difilter (berdasarkan search, kategori, supplier)
        const filteredData = getCurrentFilteredData();
        // Render tabel dan update statistik dengan data hasil filter
        renderTable(filteredData);
        updateTotals(filteredData);

        // Sinkronkan page size select jika berubah
        const pageSizeSelect = document.getElementById('produkPageSize');
        if (pageSizeSelect && pageSizeSelect.value != pagination.pageSize) {
            pageSizeSelect.value = pagination.pageSize;
        }
    }

    // Get current filtered data based on search and filters
    function renderTable(data) {
        // Jika data kosong atau bukan array, tampilkan pesan tidak ada data dan kosongkan pagination
        if (!Array.isArray(data) || data.length === 0) {
            DOM.table.body.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">TIDAK ADA DATA</td></tr>`;
            renderPagination(0, 1);
            return;
        }

        // Hitung total halaman berdasarkan jumlah data dan page size
        const totalPages = Math.ceil(data.length / pagination.pageSize);
        // Pastikan halaman aktif tidak melebihi total halaman
        if (pagination.page > totalPages) pagination.page = totalPages;
        if (pagination.page < 1) pagination.page = 1;
        // Hitung index awal dan akhir data untuk halaman ini
        const startIdx = (pagination.page - 1) * pagination.pageSize;
        const endIdx = startIdx + pagination.pageSize;
        // Ambil data yang akan ditampilkan pada halaman ini
        const pagedData = data.slice(startIdx, endIdx);
        // Buat set id produk yang sedang dipilih (checkbox)
        const selectedIds = new Set(state.selectedProduk.map(p => p.id));

        // Fungsi untuk menghitung stok berdasarkan satuan
        function getStokBySatuan(stokPcs, satuan, satuanDasar, konversiObj) {
            if (satuan === satuanDasar) return stokPcs;
            const konversi = Number(konversiObj[satuan]);
            if (konversi && konversi > 0) {
                return Math.floor(stokPcs / konversi);
            }
            return 0;
        }

        // Buat baris-baris tabel produk
        const rows = pagedData.map(item => {
            const isSelected = selectedIds.has(item.id);

            // --- BARCODE ---
            // Tampilkan barcode utama, jika lebih dari satu tampilkan badge 1+ dengan tooltip barcode lain
            let barcodeText = '';
            if (Array.isArray(item.barcodes) && item.barcodes.length > 0) {
                const utama = item.barcodes.find(b => b.is_utama);
                const mainBarcode = utama ? utama.kode_barcode : item.barcodes[0].kode_barcode;
                if (item.barcodes.length === 1) {
                    barcodeText = `<span>${mainBarcode}</span>`;
                } else {
                    // Barcode lain (selain utama/pertama) untuk tooltip
                    const otherBarcodes = item.barcodes
                        .filter(b => (utama ? b.kode_barcode !== utama.kode_barcode : b !== item.barcodes[0]))
                        .map(b => b.kode_barcode)
                        .join('<br>');
                    barcodeText = `
                        <span>${mainBarcode}</span>
                        <span class="badge bg-info ms-1"
                            data-bs-toggle="tooltip"
                            data-bs-html="true"
                            title="${otherBarcodes}">
                            1+
                        </span>
                    `;
                }
            } else {
                barcodeText = '<span class="text-muted">-</span>';
            }

            // --- DISKON ---
            // Tampilkan diskon terbesar, jika lebih dari satu tampilkan badge 1+ dengan tooltip diskon lain
            let diskonText = '';
            if (Array.isArray(item.diskon) && item.diskon.length > 0) {
                if (item.diskon.length === 1) {
                    diskonText = `<span class="badge bg-success">${item.diskon[0].diskon}%</span>`;
                } else {
                    const sortedDiskon = [...item.diskon].sort((a, b) => b.diskon - a.diskon);
                    const maxDiskon = sortedDiskon[0].diskon;
                    const otherDiskon = sortedDiskon.slice(1)
                        .map(d => `${d.diskon}%`)
                        .join('<br>');
                    diskonText = `
                        <span class="badge bg-success">${maxDiskon}%</span>
                        <span class="badge bg-info ms-1"
                            data-bs-toggle="tooltip"
                            data-bs-html="true"
                            title="${otherDiskon}">
                            1+
                        </span>
                    `;
                }
            } else {
                diskonText = '<span class="text-muted">-</span>';
            }

            // --- SATUAN ---
            // Ambil semua satuan (dasar + konversi) dan buat dropdown jika lebih dari satu
            let satuanList = [item.satuan || ''];
            let konversiObj = {};
            if (Array.isArray(item.konversi_satuan)) {
                satuanList = satuanList.concat(item.konversi_satuan.map(k => k.satuan_besar));
                item.konversi_satuan.forEach(k => {
                    konversiObj[k.satuan_besar] = Number(k.konversi) || 0;
                });
            }
            satuanList = [...new Set(satuanList.filter(Boolean))];

            // --- HARGA BELI & JUAL ---
            // Harga default satuan dasar, jika ada multi harga ambil sesuai satuan
            let hargaBeli = item.harga_beli || 0;
            let hargaJual = item.harga_jual || 0;
            if (Array.isArray(item.multi_harga) && item.multi_harga.length > 0) {
                const hargaSatuan = item.multi_harga.find(h => h.satuan === item.satuan);
                if (hargaSatuan) {
                    hargaBeli = hargaSatuan.harga_beli || hargaBeli;
                    hargaJual = hargaSatuan.harga_jual || hargaJual;
                }
            }

            // --- DROPDOWN SATUAN ---
            // Jika multi harga, enable semua satuan, jika tidak hanya satuan dasar
            let multiHarga = Array.isArray(item.multi_harga) ? item.multi_harga : [];
            let satuanDasar = item.satuan;
            let enabledSatuan = multiHarga.length > 1 ? satuanList : [satuanDasar];

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

            // --- STOK ---
            // Hitung stok sesuai satuan terpilih (default satuan dasar)
            let satuanTerpilih = satuanDasar;
            let stokTampil = getStokBySatuan(item.stok || 0, satuanTerpilih, satuanDasar, konversiObj);
            const stokBadge = stokTampil <= 10
                ? `<span class="badge bg-danger">${stokTampil}</span>`
                : `<span class="badge bg-secondary">${stokTampil}</span>`;

            // --- RETURN: Baris HTML untuk tabel produk ---
            return `
                <tr data-id="${item.id}">
                    <td class="text-center">
                        <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                    </td>
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

        // Tampilkan baris-baris tabel ke DOM
        DOM.table.body.innerHTML = rows.join('');
        // Render pagination dan info jumlah data
        renderPagination(totalPages, pagination.page);
        updatePaginationInfo(data.length, startIdx + 1, Math.min(endIdx, data.length));

        // Aktifkan tooltip Bootstrap pada badge barcode/diskon
        setTimeout(() => {
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                if (!el._tooltip) {
                    el._tooltip = new bootstrap.Tooltip(el);
                }
            });
        }, 10);

        // Event listener: update harga beli/jual & stok saat satuan diubah
        document.querySelectorAll('.satuan-table-select').forEach(select => {
            select.addEventListener('change', function () {
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
                        konversiObj[k.satuan_besar] = Number(k.konversi) || 0;
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

    // PAGINATION
    function updatePaginationInfo(totalData, startItem, endItem) {
        // Ambil elemen info pagination di halaman
        const infoElement = document.getElementById('paginationInfo');
        if (infoElement) {
            // Tampilkan informasi jumlah data yang sedang ditampilkan pada halaman ini
            // Contoh: "Menampilkan 11-20 dari 57 data"
            infoElement.textContent = `Menampilkan ${startItem}-${endItem} dari ${totalData} data`;
        }
    }

    // Render pagination dengan tombol navigasi
    function renderPagination(totalPages, currentPage) {
        // Ambil elemen pagination dari DOM
        const paginationEl = document.getElementById('produkPagination');
        // Jika tidak ada elemen pagination atau hanya 1 halaman, kosongkan pagination
        if (!paginationEl || totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        let html = '';

        // --- Tombol Previous ---
        // Disabled jika di halaman pertama
        html += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>`;

        // --- Penentuan range halaman yang akan ditampilkan ---
        // Tampilkan maksimal 5 halaman di sekitar halaman aktif
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        // Jika di awal, geser range ke kanan
        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        // Jika di akhir, geser range ke kiri
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        // --- Tombol halaman pertama dan ellipsis jika perlu ---
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

        // --- Tombol nomor halaman utama (dinamis) ---
        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item${i === currentPage ? ' active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }

        // --- Tombol halaman terakhir dan ellipsis jika perlu ---
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

        // --- Tombol Next ---
        // Disabled jika di halaman terakhir
        html += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>`;

        // Tampilkan HTML pagination ke elemen
        paginationEl.innerHTML = html;
    }


    // Fungsi untuk menyimpan perubahan pada sel tabel yang diedit secara inline
    async function saveCellEdit(cell) {
        const row = cell.closest('tr');
        const produkId = row.dataset.id;
        const field = cell.dataset.field;
        let newValue = cell.textContent.trim();

        // Cari data produk asli dari state
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

        // Jika tidak ada perubahan, skip
        if (originalProduct[field] == newValue) return;

        try {
            cell.style.backgroundColor = '#fff3cd'; // Indikator loading

            let updateData = {};

            // Parsing nilai sesuai tipe field
            switch (field) {
                case 'stok':
                    // Ambil angka dari badge
                    const stokMatch = newValue.match(/\d+/);
                    updateData[field] = stokMatch ? parseInt(stokMatch[0]) : 0;
                    break;
                case 'harga_beli':
                case 'harga_jual':
                    // Parse format currency (Rp 123.456)
                    updateData[field] = parseInt(newValue.replace(/[^\d]/g, '')) || 0;
                    break;
                default:
                    updateData[field] = newValue;
            }

            // Kirim update ke backend (PUT)
            const response = await fetch(`/api/produk/${produkId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const responseData = await response.json();

            // Simpan tracking perubahan
            await saveTracking({
                tipe: 'Produk',
                keterangan: `Edit produk: Edit Tabel kolom ${field} (${originalProduct.nama_produk})`,
                status: 'Update Data',
                produk_id: produkId,
                nama_produk: originalProduct.nama_produk
            });

            if (response.ok) {
                // Update state produk dengan data terbaru
                Object.assign(originalProduct, updateData);

                // Update waktu updated_at ke sekarang
                const now = new Date();
                originalProduct.updated_at = now.toISOString();

                // Update tampilan sel sesuai format
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

                // Styling sukses
                cell.style.backgroundColor = '#d1e7dd';
                setTimeout(() => {
                    cell.style.backgroundColor = state.isEditMode ? '#f8f9fa' : '';
                }, 2000);

                // Notifikasi sukses
                await Swal.fire({
                    title: 'Berhasil!',
                    text: `${field.replace('_', ' ')} berhasil diperbarui`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });

                // Update total jika perlu
                updateTotals(state.allProducts);

            } else {
                throw new Error(responseData.message || 'Gagal menyimpan perubahan');
            }

        } catch (error) {
            console.error('Save error:', error);

            // Kembalikan nilai lama jika gagal
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

            // Notifikasi error
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

    // Fungsi untuk menghitung dan menampilkan total produk, stok, modal, dan nilai produk
    function updateTotals(data) {
        // Hitung total dari data produk
        const totals = data.reduce((acc, item) => {
            acc.produk += 1;
            acc.stok += item.stok || 0;
            acc.modal += (item.harga_beli || 0) * (item.stok || 0);
            acc.nilaiProduk += (item.harga_jual || 0) * (item.stok || 0);
            return acc;
        }, { produk: 0, stok: 0, modal: 0, nilaiProduk: 0 });

        // Update tampilan elemen total di halaman
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

    // Fungsi untuk menangani klik sorting pada header tabel
    function handleSort() {
        const sortField = this.getAttribute('data-sort');

        // Jika field sama, toggle arah sorting
        if (state.currentSort.field === sortField) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Jika field berbeda, set field baru dan arah default asc
            state.currentSort.field = sortField;
            state.currentSort.direction = 'asc';
        }

        // Muat ulang data dengan sorting baru
        loadData(state.currentSort.field, state.currentSort.direction);
        updateSortIcons();
    }

    // Fungsi untuk memperbarui ikon sort pada header tabel sesuai field dan arah aktif
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

    // Fungsi untuk menginisialisasi modal tambah/edit produk.
    // Menyiapkan state produk baru atau mengisi form dengan data produk yang dipilih untuk diedit.
    // Juga menyiapkan event listener dan tampilan tab pada modal.
    function initializeProductModal() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const isEditMode = selectedCheckboxes.length > 0;

        // Reset state produk baru
        state.newProduct = {
            barcodes: [],
            konversiSatuan: [],
            diskon: []
        };

        if (isEditMode) {
            // Jika mode edit, isi state.selectedProduk dengan produk yang dipilih
            state.selectedProduk = Array.from(selectedCheckboxes).map(checkbox => {
                return state.allProducts.find(p => p.id == checkbox.dataset.id);
            });
            // Isi form dengan data produk pertama yang dipilih
            populateFormWithProduct(state.selectedProduk[0]);
            loadExistingBarcodes(state.selectedProduk[0].id);
            loadExistingSatuan(state.selectedProduk[0].id);
            loadExistingDiskon(state.selectedProduk[0].id);
        } else {
            // Jika tambah produk baru, reset form dan input
            const form = document.getElementById('formTambahProduk');
            form.reset();
            form.querySelectorAll('input').forEach(input => {
                input.value = '';
                input.removeAttribute('value');
            });
            form.querySelector('[name="stok"]').value = '0';
            form.querySelector('#newJumlahSatuan').value = '1';
            state.selectedProduk = [];
        }

        // Tampilkan modal tambah/edit produk
        DOM.modals.baru.show();

        // Setup event listener dan tampilan tab setelah modal muncul
        setTimeout(() => {
            setupModalEventListeners();
            renderBarcodeList();
            renderKonversiSatuanList();
            renderDiskonList();
            setupTabNavigation();
        }, 100);
    }

    // Fungsi untuk mengatur tampilan dan event tab navigasi pada modal tambah/edit produk.
    // Mengatur tab aktif, reset tab ke posisi awal, dan update step counter.
    function setupTabNavigation() {
        // Tampilkan navigasi tab
        const tabNavigation = document.getElementById('tambahProdukTabs');
        if (tabNavigation) {
            tabNavigation.style.display = 'flex';
        }

        // Reset semua tab content ke state awal (tab pertama aktif)
        document.querySelectorAll('.tab-pane').forEach((pane, index) => {
            pane.classList.remove('show', 'active');
            if (index === 0) {
                pane.classList.add('show', 'active');
            }
        });

        // Reset tab navigation ke tab pertama
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach((link, index) => {
            link.classList.remove('active');
            if (index === 0) {
                link.classList.add('active');
            }
        });

        // Pasang event click pada setiap tab
        document.querySelectorAll('#tambahProdukTabs .nav-link').forEach(tab => {
            tab.removeEventListener('click', handleTabClick);
            tab.addEventListener('click', handleTabClick);
        });

        // Update jumlah step pada badge tab
        updateStepCounters();

        // Update judul modal sesuai mode (edit/tambah)
        updateModalHeader();
    }

    // Fungsi untuk mengupdate judul/header pada modal tambah/edit produk.
    // Menampilkan nama produk jika edit satu produk, atau jumlah produk jika multi-edit.
    function updateModalHeader() {
        const modalTitle = document.querySelector('#baruProdukModal .modal-title');
        const isEditMode = state.selectedProduk.length > 0;

        if (isEditMode) {
            if (state.selectedProduk.length === 1) {
                // Jika hanya satu produk dipilih, tampilkan nama produk
                const productName = state.selectedProduk[0].nama_produk || 'Produk Tanpa Nama';
                modalTitle.innerHTML = `
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <i class="fas fa-edit"></i>
                        <span>Edit Produk:</span>
                        <span class="text-warning fw-bold">${productName}</span>
                    </div>
                `;
            } else {
                // Jika multi-edit, tampilkan jumlah produk dan dropdown untuk memilih produk
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
                // Event: ganti produk yang diedit pada dropdown
                setTimeout(() => {
                    const select = document.getElementById('selectEditProduk');
                    if (select) {
                        let lastSelectedId = parseInt(select.value);

                        select.addEventListener('change', function () {
                            // Simpan draft produk sebelumnya
                            saveCurrentProductDraft(lastSelectedId);

                            // Load produk baru ke form
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
            // Jika tambah produk baru
            modalTitle.innerHTML = `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <i class="fas fa-plus-circle"></i>
                    <span>Tambah Produk Baru</span>
                </div>
            `;
        }
    }

    // Fungsi untuk menyimpan draft data produk yang sedang diedit (multi-edit).
    // Draft ini digunakan agar perubahan pada form tidak hilang saat berpindah produk pada dropdown.
    function saveCurrentProductDraft(produkId) {
        const form = document.getElementById('formTambahProduk');
        if (!produkId || !form) return;

        // Ambil data dari form dan state lalu simpan ke state.productDrafts
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

    // Fungsi untuk mengisi form tambah/edit produk dengan data draft (jika ada) atau data produk asli.
    // Jika draft tersedia (misal pada multi-edit), isi form dari draft agar perubahan tidak hilang saat berpindah produk.
    // Jika tidak ada draft, isi form dari data produk asli.
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

    // Fungsi untuk menangani klik pada tab navigasi di modal tambah/edit produk.
    // Mengaktifkan tab yang diklik dan menampilkan konten tab yang sesuai.
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

    // Fungsi untuk mengupdate jumlah badge pada setiap tab (barcode, satuan, diskon) di modal tambah/edit produk.
    // Badge akan menampilkan jumlah data pada masing-masing tab, dan disembunyikan jika jumlahnya 0.
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

    // Fungsi untuk mengisi form tambah/edit produk dengan data produk asli (bukan draft).
    // Digunakan saat membuka modal tambah/edit produk atau saat reset form.
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

    // Fungsi untuk mengambil daftar barcode dari backend berdasarkan produkId.
    // Barcode yang diambil akan di-set ke state.newProduct.barcodes dan dirender ulang ke tampilan.
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

    // Fungsi untuk menambah barcode baru ke daftar barcode produk (state.newProduct.barcodes).
    // Melakukan validasi agar barcode tidak kosong dan tidak duplikat, lalu render ulang daftar barcode.
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
    }

    // Fungsi untuk menghapus barcode dari daftar barcode produk.
    // Jika barcode sudah ada di database, juga menghapusnya di backend.
    // Setelah dihapus, render ulang daftar barcode dan simpan tracking.
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

    // Fungsi untuk menampilkan daftar barcode pada tampilan (container barcodeListContainer).
    // Jika tidak ada barcode, tampilkan pesan kosong. Juga update badge jumlah barcode pada tab.
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

    // Fungsi untuk mengambil daftar konversi satuan dari backend berdasarkan produkId.
    // Data satuan yang diambil akan di-set ke state.newProduct.konversiSatuan dan dirender ulang ke tampilan.
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

    // Fungsi untuk menambah konversi satuan baru ke daftar konversi satuan produk.
    // Melakukan validasi agar input tidak kosong, tidak duplikat, dan bernilai valid, lalu render ulang daftar satuan.
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

    // Fungsi untuk menghapus konversi satuan dari daftar konversi satuan produk.
    // Jika satuan sudah ada di database, juga menghapusnya di backend.
    // Setelah dihapus, render ulang daftar satuan dan simpan tracking.
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

    // Fungsi untuk menampilkan daftar konversi satuan pada tampilan (container konversiSatuanList).
    // Jika tidak ada satuan, tampilkan pesan kosong. Juga update badge jumlah satuan pada tab.
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

    // Fungsi untuk mengupdate jumlah badge satuan pada tab dan counter satuan di form.
    // Hanya menghitung satuan yang valid.
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

    // Fungsi untuk mengambil daftar diskon dari backend berdasarkan produkId.
    // Data diskon yang diambil akan di-set ke state.newProduct.diskon dan dirender ulang ke tampilan.
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

    // Fungsi untuk menambah diskon baru ke daftar diskon produk.
    // Melakukan validasi input, menambah data ke state, reset form, dan render ulang daftar diskon.
    function tambahDiskonBaru() {
        const jumlahMinimum = parseInt(document.getElementById('newDiskonMinimum').value) || 0;
        const diskonPersen = parseFloat(document.getElementById('newDiskonPersen').value) || 0;
        const tanpaWaktu = document.getElementById('diskonTanpaWaktu').checked;
        const mulai = document.getElementById('diskonMulai').value;
        const berakhir = document.getElementById('diskonBerakhir').value;

        // Validasi input diskon
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

        // Tambahkan diskon ke state
        state.newProduct.diskon.push({
            id: Date.now(),
            jumlah_minimum: jumlahMinimum,
            diskon: diskonPersen,
            is_tanpa_waktu: tanpaWaktu,
            tanggal_mulai: tanpaWaktu ? null : mulai,
            tanggal_berakhir: tanpaWaktu ? null : berakhir,
            isExisting: false // <-- Penting!
        });

        // Reset form input diskon
        document.getElementById('newDiskonMinimum').value = '';
        document.getElementById('newDiskonPersen').value = '';
        document.getElementById('diskonTanpaWaktu').checked = true;
        document.getElementById('diskonMulai').value = '';
        document.getElementById('diskonBerakhir').value = '';
        toggleWaktuDiskon();

        renderDiskonList();
        showAlert('Diskon ditambahkan', 'success');
    }

    // Fungsi untuk menghapus diskon dari daftar diskon produk.
    // Jika diskon sudah ada di database, juga menghapusnya di backend.
    // Setelah dihapus, render ulang daftar diskon dan simpan tracking.
    async function hapusDiskon(id) {
        if (!state.newProduct.diskon) return;
        const diskonDihapus = state.newProduct.diskon.find(d => d.id === id);

        // Jika data sudah ada di database, hapus di backend
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

    // Fungsi untuk menampilkan daftar diskon pada tampilan (container diskonListContainer).
    // Jika tidak ada diskon, tampilkan pesan kosong. Juga update badge jumlah diskon pada tab.
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

    // Fungsi untuk mengupdate jumlah badge diskon pada tab dan counter diskon di form.
    function updateDiskonCounter() {
        const counter = document.getElementById('diskonCount');
        if (counter) {
            const count = state.newProduct.diskon ? state.newProduct.diskon.length : 0;
            counter.textContent = count;
        }
    }

    // Fungsi untuk menampilkan atau menyembunyikan input tanggal pada form diskon
    // sesuai dengan status checkbox "Tanpa Waktu".
    function toggleWaktuDiskon() {
        const checkbox = document.getElementById('diskonTanpaWaktu');
        const container = document.getElementById('waktuDiskonContainer');

        if (container) {
            container.style.display = checkbox.checked ? 'none' : 'block';
        }
    }

    // Fungsi untuk menyimpan seluruh data produk (tambah atau edit, single/multi produk).
    // Mengambil data dari form atau draft, melakukan validasi, lalu mengirim ke backend (PUT/POST).
    // Setelah produk utama tersimpan, juga menyimpan data satuan, barcode, dan diskon terkait.
    // Menampilkan notifikasi sukses/gagal dan reload data setelah selesai.
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

                    // Tracking tambah produk
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

                // Simpan satuan baru & tracking
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

                        await saveTracking({
                            tipe: 'Produk',
                            keterangan: `Satuan "${konversi.satuan_besar}" ditambahkan ke produk "${produkData.nama_produk}"`,
                            status: 'Tambah Satuan',
                            produk_id: produkId,
                            nama_produk: produkData.nama_produk
                        });
                    }
                }

                // Simpan barcode baru & tracking
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

                        await saveTracking({
                            tipe: 'Produk',
                            keterangan: `Barcode "${barcode.kode_barcode}" ditambahkan ke produk "${produkData.nama_produk}"`,
                            status: 'Tambah Barcode',
                            produk_id: produkId,
                            nama_produk: produkData.nama_produk
                        });
                    }
                }

                // Simpan diskon baru & tracking
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

    // Fungsi untuk menangani klik pada baris tabel produk.
    // Jika klik pada baris (bukan checkbox), akan toggle checkbox dan update selection.
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

    // Fungsi untuk menangani perubahan pada checkbox baris produk.
    // Menambah atau menghapus produk dari daftar produk yang dipilih (state.selectedProduk).
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

    // Fungsi untuk menangani perubahan pada checkbox "select all" di tabel produk.
    // Akan memilih atau membatalkan semua produk di halaman saat ini.
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

    // Fungsi untuk mengupdate tampilan jumlah produk yang dipilih pada UI.
    // Menampilkan atau menyembunyikan counter sesuai jumlah produk yang dipilih.
    function updateSelectedCounter() {
        const selectedCount = state.selectedProduk.length;
        const counterElement = document.getElementById('selectedCounter');

        if (counterElement) {
            counterElement.textContent = selectedCount;
            counterElement.style.display = selectedCount > 0 ? 'inline' : 'none';
        }

        // Contoh: bisa juga mengaktifkan/menonaktifkan tombol aksi lain berdasarkan selection
        // const deleteBtn = document.getElementById('hapusProdukBtn');
        // if (deleteBtn) {
        //     deleteBtn.disabled = selectedCount === 0;
        // }
    }

    // Fungsi untuk mengaktifkan mode edit pada tabel produk.
    // Membuat setiap sel dengan class .editable-cell menjadi editable, menambahkan style khusus,
    // dan memasang event listener untuk keypress, blur, dan focus pada sel.
    // Menampilkan notifikasi bahwa mode edit aktif.
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

            // Hapus event listener lama untuk menghindari duplikasi
            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);

            // Tambahkan event listener baru
            cell.addEventListener('keypress', handleCellKeypress);
            cell.addEventListener('blur', handleCellBlur);
            cell.addEventListener('focus', handleCellFocus);
        });

        // Notifikasi sukses mode edit aktif
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

    // Fungsi untuk menonaktifkan mode edit pada tabel produk.
    // Membuat sel tidak lagi editable, menghapus style khusus, dan menghapus event listener.
    // Menampilkan notifikasi bahwa mode edit dinonaktifkan.
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

            // Hapus event listener
            cell.removeEventListener('keypress', handleCellKeypress);
            cell.removeEventListener('blur', handleCellBlur);
            cell.removeEventListener('focus', handleCellFocus);
        });

        // Notifikasi sukses mode edit dinonaktifkan
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

    // Fungsi event handler untuk keypress pada sel editable.
    // Jika tombol Enter ditekan, simpan perubahan dengan blur (keluar dari sel).
    function handleCellKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // Trigger save
        }
    }

    // Fungsi event handler untuk blur pada sel editable.
    // Saat sel kehilangan fokus, simpan perubahan yang dilakukan pada sel tersebut.
    function handleCellBlur(e) {
        saveCellEdit(e.target);
    }

    // Fungsi event handler untuk focus pada sel editable.
    // Saat sel mendapat fokus, hilangkan format pada field harga dan ambil angka pada field stok.
    // Juga mengubah background sel untuk menandakan sedang diedit.
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

    // Fungsi untuk menghapus produk yang dipilih (multi-delete).
// Menampilkan konfirmasi dengan password, mengirim permintaan hapus ke backend,
// menampilkan notifikasi sukses/gagal, dan reload data setelah selesai.
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

        // Tampilkan konfirmasi dan input password sebelum hapus
        const produkNames = state.selectedProduk.slice(0, 3).map(p => p.nama_produk);
        const extraCount = state.selectedProduk.length > 3 ? state.selectedProduk.length - 3 : 0;

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

        // Jika user batal, keluar
        if (!result.isConfirmed) {
            return;
        }

        const password = result.value;

        try {
            const produkIds = state.selectedProduk.map(p => p.id);
            const allProdukNames = state.selectedProduk.map(p => p.nama_produk);

            // Simpan tracking penghapusan
            await saveTracking({
                tipe: 'Produk',
                keterangan: `Produk "${allProdukNames.join(', ')}" dihapus permanen`,
                status: 'Produk Dihapus',
                produk_id: produkIds.join(','),
                nama_produk: allProdukNames.join(', ')
            });

            // Kirim permintaan hapus ke backend
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

            // Cek response JSON
            const contentType = response.headers.get('content-type');
            let responseData;
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                const responseText = await response.text();
                console.error('Non-JSON response:', responseText);
                throw new Error(`Server error: ${response.status} - ${responseText.substring(0, 100)}`);
            }

            if (response.ok && responseData.success) {
                // Notifikasi sukses
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
                // Jika password salah
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
                        setTimeout(() => deleteSelected(), 500);
                    }
                });
            } else {
                throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Delete error:', error);

            // Notifikasi error detail
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

    // Fungsi untuk export data produk ke PDF.
    // Mengambil data yang sudah difilter, membuat file PDF dengan jsPDF dan autoTable,
    // lalu mengunduh file PDF ke user.
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

    function exportToExcel() {
        const currentData = getCurrentFilteredData();
        if (currentData.length === 0) {
            showAlert('Tidak ada data untuk diekspor', 'warning');
            return;
        }

        // Siapkan data untuk sheet
        const sheetData = [
            ['No', 'Nama Produk', 'Kategori', 'Supplier', 'Satuan', 'Stok', 'Harga Beli', 'Harga Jual', 'Diskon']
        ];
        currentData.forEach((item, idx) => {
            // Gabungkan diskon jadi string
            let diskonStr = '-';
            if (Array.isArray(item.diskon) && item.diskon.length > 0) {
                diskonStr = item.diskon.map(d => `${d.diskon}% min ${d.jumlah_minimum}`).join(', ');
            }
            sheetData.push([
                idx + 1,
                item.nama_produk || '',
                item.kategori || '',
                item.supplier || '',
                item.satuan || '',
                item.stok || 0,
                item.harga_beli || 0,
                item.harga_jual || 0,
                diskonStr
            ]);
        });

        // Buat workbook dan sheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, 'Produk');

        // Download file
        XLSX.writeFile(wb, `data_produk_${new Date().toISOString().slice(0,10)}.xlsx`);
        showAlert('Excel berhasil diunduh', 'success');
    }

    // Fungsi untuk mengambil data produk yang sudah difilter berdasarkan pencarian, kategori, dan supplier.
    // Digunakan untuk menampilkan tabel, export, dan statistik.
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

    // Fungsi untuk mengisi filter kategori dan supplier pada UI berdasarkan data produk yang ada.
    // Juga menghitung dan menampilkan total produk, stok, modal, dan nilai produk.
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

    // Fungsi untuk memformat angka menjadi format mata uang Rupiah.
    // Contoh: 15000 => "Rp 15.000"
    function formatCurrency(amount) {
        if (!amount || amount === 0) return 'Rp 0';
        return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
    }

    // Fungsi untuk memformat tanggal relatif dari sekarang (misal: "2 hari lalu", "Baru saja", dll)
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

    // Fungsi untuk memformat tanggal ke format lokal Indonesia (misal: "05 Agu 2025")
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Fungsi untuk memasang event listener pada elemen-elemen di modal tambah/edit produk.
    // Termasuk formatting currency, update satuan, barcode, diskon, dan lain-lain.
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

    // Fungsi untuk memformat input currency (hanya angka, tanpa karakter lain, lalu format ribuan)
    function handleCurrencyInput(e) {
        let value = e.target.value.replace(/[^\d]/g, '');
        if (value) {
            e.target.value = parseInt(value).toLocaleString('id-ID');
        }
    }

    // Fungsi untuk mengupdate label satuan pada beberapa elemen di form/modal sesuai input satuan
    function handleSatuanInput(e) {
        const unit = e.target.value || 'pcs';
        const stokUnit = document.getElementById('stokUnit');
        const konversiUnit = document.getElementById('konversiUnit');
        const diskonUnit = document.getElementById('diskonUnit');

        if (stokUnit) stokUnit.textContent = unit;
        if (konversiUnit) konversiUnit.textContent = unit;
        if (diskonUnit) diskonUnit.textContent = unit;
    }

    // Fungsi untuk menampilkan preview barcode secara realtime saat input barcode berubah
    function handleBarcodeInput(e) {
        const code = e.target.value.trim();
        previewBarcodeRealtime(code);
    }

    // Fungsi untuk menambah barcode baru saat tombol Enter ditekan di input barcode
    function handleBarcodeKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            tambahBarcodeBaru();
        }
    }

    // Fungsi untuk menghitung margin (%) antara harga jual dan harga beli, lalu update preview di UI.
    // Margin akan diberi warna hijau jika positif, merah jika negatif.
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

    // Fungsi untuk menghasilkan barcode acak 12 digit, memastikan tidak duplikat dengan barcode yang sudah ada.
    // Barcode hasil generate langsung diisi ke input dan ditampilkan preview-nya.
    function generateRandomBarcode() {
        let barcode = '';

        // Generate random 12 digit
        for (let i = 0; i < 12; i++) {
            barcode += Math.floor(Math.random() * 10);
        }

        // Cek duplikasi barcode
        if (state.newProduct.barcodes.find(b => b.kode_barcode === barcode)) {
            generateRandomBarcode(); // Generate ulang jika sama
            return;
        }

        // Set ke input dan tampilkan preview
        document.getElementById('newBarcodeInput').value = barcode;
        previewBarcodeRealtime(barcode);
        showAlert('Barcode: ' + barcode, 'success');
    }

    // Fungsi untuk menambah barcode baru ke daftar barcode produk.
    // Melakukan validasi agar barcode tidak kosong dan tidak duplikat, lalu render ulang daftar barcode.
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

    // Fungsi untuk menampilkan preview barcode secara realtime di form/modal menggunakan JSBarcode.
    // Jika kode valid, tampilkan barcode dalam canvas, jika tidak tampilkan pesan placeholder.
    function previewBarcodeRealtime(code) {
        const container = document.getElementById('barcodePreviewContainer');

        if (code && code.length > 3) {
            // Buat canvas barcode
            container.innerHTML = `
                <div class="barcode-preview text-center">
                    <div class="mb-2">
                        <canvas id="barcodeCanvas"></canvas>
                    </div>
                    <div class="bg-dark text-white px-2 py-1 font-monospace small">${code}</div>
                </div>
            `;

            // Generate barcode menggunakan JSBarcode
            try {
                const canvas = document.getElementById('barcodeCanvas');
                if (canvas && window.JsBarcode) {
                    JsBarcode(canvas, code, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: false,
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

    // Fungsi untuk mengupdate jumlah barcode pada badge di tab/modal.
    // Mengambil jumlah barcode dari state dan update tampilan counter.
    function updateBarcodeCounter() {
        const counter = document.getElementById('barcodeCount');
        if (counter) {
            counter.textContent = state.newProduct.barcodes.length;
        }
    }

    // Fungsi untuk menampilkan notifikasi/toast menggunakan SweetAlert2.
    // Mendukung tipe: success, danger, warning, info.
    function showAlert(message, type = 'info') {
        const iconMap = {
            'success': 'success',
            'danger': 'error',
            'warning': 'warning',
            'info': 'info'
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

    // Fungsi async untuk menyimpan data tracking aktivitas ke backend.
    // Digunakan untuk mencatat perubahan data produk (tambah, edit, hapus, dsb).
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
            selectProduk.addEventListener('change', function () {
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
    document.body.addEventListener('submit', async function (e) {
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

    document.body.addEventListener('submit', async function (e) {
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
