export function init() {
    if (localStorage.getItem('loginSuccess') === '1' && typeof Swal !== 'undefined') {
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

    // Abort terakhir untuk load list pengguna (hindari request menumpuk)
    let listReqAbort = null;

    function setupEventListeners() {
        const formTambah = document.querySelector('#formTambahPengguna'); // Update ID
        if (formTambah) {
            formTambah.addEventListener('submit', async function(e) {
                e.preventDefault();
                await handleAddSubmit(this);
            });
        }

        // Event listener untuk form edit pengguna
        const formEdit = document.querySelector('#formEditPengguna'); // Update ID
        if (formEdit) {
            formEdit.addEventListener('submit', async function(e) {
                e.preventDefault();
                await handleEditSubmit(this);
            });
        }
    }

    // TAMBAH: Handle submit form tambah pengguna
    async function handleAddSubmit(form) {
        // Validasi akses
        const aksesChecked = form.querySelectorAll('input[name="akses[]"]:checked');
        if (aksesChecked.length === 0) {
            Swal.fire('Error', 'Pilih minimal satu hak akses!', 'error');
            return false;
        }

        const isActiveElement = form.querySelector('input[name="is_active"]');
        console.log('is_active element:', isActiveElement);

        // Prepare data
        const formData = {
            nama: form.querySelector('input[name="nama"]').value,
            email: form.querySelector('input[name="email"]').value,
            password: form.querySelector('input[name="password"]').value,
            no_hp: form.querySelector('input[name="no_hp"]').value,
            akses: Array.from(aksesChecked).map(cb => cb.value),
            is_active: isActiveElement ? (isActiveElement.checked ? 1 : 0) : 0 // PERBAIKAN: C
        };

        try {
            await addPengguna(formData);
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', error.message, 'error');
        }
    }

    // TAMBAH: Fungsi untuk menambah pengguna
    async function addPengguna(formData) {
        // Buat FormData
        const data = new FormData();
        data.append('nama', formData.nama);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('no_hp', formData.no_hp);
        data.append('is_active', formData.is_active);

        // Append array akses
        if (Array.isArray(formData.akses) && formData.akses.length > 0) {
            formData.akses.forEach(akses => {
                data.append('akses[]', akses);
            });
        } else {
            throw new Error('Pilih minimal satu hak akses');
        }

        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort('timeout'), 2500);
            const response = await fetch('/api/pengguna', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                },
                body: data,
                credentials: 'same-origin',
                signal: ctrl.signal
            }).finally(() => clearTimeout(t));

            // Robust parse: baca text lalu coba JSON
            const text = await response.text();
            let result; try { result = text ? JSON.parse(text) : {}; } catch { result = { message: text }; }
            console.log('Response data:', result);

            if (!response.ok) {
                if (result.errors) {
                    let errorMessage = 'Validasi gagal:\n';
                    Object.values(result.errors).forEach(errorArray => {
                        errorArray.forEach(msg => {
                            errorMessage += `• ${msg}\n`;
                        });
                    });
                    throw new Error(errorMessage);
                }
                throw new Error(result.message || 'Gagal menambahkan pengguna');
            }

            console.log('=== ADD SUCCESS ===');
            Swal.fire('Berhasil!', 'Pengguna berhasil ditambahkan', 'success');
            hideAddModal();
            loadPenggunaData();
            resetAddForm();

        } catch (error) {
            console.error('=== ADD ERROR ===');
            console.error('Error:', error);
            throw error;
        }
    }

    // TAMBAH: Fungsi untuk menyembunyikan modal tambah
    function hideAddModal() {
        const el = document.getElementById('modalTambahPengguna');
        const m = el ? bootstrap.Modal.getOrCreateInstance(el) : null;
        m?.hide();
    }

    // TAMBAH: Fungsi untuk reset form tambah
    function resetAddForm() {
        const form = document.querySelector('#modalTambahPengguna form');
        if (form) {
            form.reset();
            // Uncheck semua checkbox akses
            form.querySelectorAll('input[name="akses[]"]').forEach(cb => cb.checked = false);
            // Set is_active ke checked (default)
            const isActiveCheckbox = form.querySelector('input[name="is_active"]');
            if (isActiveCheckbox) {
                isActiveCheckbox.checked = true;
            }
        }
    }

    // Fetch data pengguna dari API dan render ke tabel
    function loadPenggunaData() {
        const tbody = document.getElementById('penggunaTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Memuat...</td></tr>`;
        }

        // Batalkan request sebelumnya jika masih berjalan
        if (listReqAbort) { try { listReqAbort.abort(); } catch {} }

        const ctrl = new AbortController();
        listReqAbort = ctrl;
        const t = setTimeout(() => ctrl.abort('timeout'), 2500);
        fetch('/api/pengguna', {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            },
            credentials: 'same-origin',
            signal: ctrl.signal
        })
        .then(async res => {
            const text = await res.text();
            let json; try { json = text ? JSON.parse(text) : []; } catch {
                throw new Error(`Unexpected response: ${res.status} ${res.statusText}\n${text.substring(0,120)}`);
            }
             const list =
                 Array.isArray(json) ? json :
                 Array.isArray(json.data) ? json.data :
                 Array.isArray(json.users) ? json.users : [];

            // Normalisasi akses sekali (hindari JSON.parse berulang di render)
            list.forEach(u => {
                if (!u._akses) {
                    let arr = [];
                    if (Array.isArray(u.akses)) arr = u.akses;
                    else if (typeof u.akses === 'string') { try { arr = JSON.parse(u.akses || '[]'); } catch { arr = []; } }
                    Object.defineProperty(u, '_akses', { value: arr, enumerable: false });
                }
            });

            renderPenggunaTable(list);
            // Delegasi event sekali saja (hindari rebind per render)
            bindTableDelegation();
        })
        .catch(error => {
            if (error === 'aborted' || error?.message === 'aborted') return; // diabaikan
            console.error('Error loading pengguna data:', error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat data pengguna</td></tr>`;
            if (typeof Swal !== 'undefined') Swal.fire('Error', 'Gagal memuat data pengguna', 'error');
        })
        .finally(() => {
            clearTimeout(t);
            if (listReqAbort === ctrl) listReqAbort = null;
        });
    }

    // Render tabel pengguna (chunked + aman XSS)
    function renderPenggunaTable(data) {
        const tbody = document.getElementById('penggunaTableBody');
        if (!tbody) return;

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada data</td></tr>`;
            return;
        }

        tbody.innerHTML = '';

        const badgeMap = { dashboard: 'primary', produk: 'info', kasir: 'success', tracking: 'warning text-dark', pengguna: 'secondary' };
        const aksesOf = (u) => u._akses || [];

        const CHUNK = data.length > 800 ? 120 : 150;
        let i = 0;

        function createRow(u, idx) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">${idx + 1}</td>
                <td>
                    <div class="fw-bold js-nama"></div>
                    <div class="text-muted small js-email"></div>
                </td>
                <td class="js-nohp"></td>
                <td class="js-akses"></td>
                <td class="js-status"></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${u.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${u.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            // Set teks aman (hindari XSS)
            tr.querySelector('.js-nama').textContent = u.nama ?? '';
            tr.querySelector('.js-email').textContent = u.email ?? '';
            tr.querySelector('.js-nohp').textContent = u.no_hp ?? '';

            // Akses badge (whitelist)
            const aksesEl = tr.querySelector('.js-akses');
            const aksesArr = aksesOf(u);
            if (aksesArr.length) {
                aksesEl.innerHTML = aksesArr.map(a => {
                    const cls = badgeMap[a] || 'dark';
                    const label = ('' + a).toLowerCase();
                    return `<span class="badge bg-${cls} mb-1 text-capitalize me-1">${label}</span>`;
                }).join('');
            } else {
                aksesEl.innerHTML = `<span class="text-muted">-</span>`;
            }

            // Status
            const aktif = (u.is_active == 1 || u.is_active === true);
            tr.querySelector('.js-status').innerHTML =
                `<span class="badge bg-${aktif ? 'success' : 'danger'}">${aktif ? 'Aktif' : 'Nonaktif'}</span>`;

            return tr;
        }

        function appendChunk() {
            const frag = document.createDocumentFragment();
            const end = Math.min(i + CHUNK, data.length);
            for (; i < end; i++) {
                frag.appendChild(createRow(data[i], i));
            }
            tbody.appendChild(frag);

            if (i < data.length) {
                requestAnimationFrame(appendChunk);
            }
        }

        requestAnimationFrame(appendChunk);
    }

    // Delegasi klik untuk tombol edit/hapus (dipasang sekali)
    function bindTableDelegation() {
        const tbody = document.getElementById('penggunaTableBody');
        if (!tbody || tbody.dataset.bound === '1') return;

        tbody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const delBtn = e.target.closest('.btn-delete');
            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                editPengguna(id);
                return;
            }
            if (delBtn) {
                const id = delBtn.getAttribute('data-id');
                hapusPengguna(id);
                return;
            }
        }, { passive: true });

        tbody.dataset.bound = '1';
    }

    // Fungsi edit pengguna
    async function editPengguna(penggunaId) {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort('timeout'), 2500);
            const response = await fetch(`/api/pengguna/${penggunaId}`, {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Cache-Control': 'no-store', 'Pragma': 'no-cache' },
                signal: ctrl.signal
            }).finally(() => clearTimeout(t));
            if (!response.ok) {
                throw new Error('Gagal mengambil data pengguna');
            }

            const ct = response.headers.get('content-type') || '';
            const pengguna = ct.includes('application/json') ? await response.json() : await (async () => { throw new Error('Respon bukan JSON'); })();
            populateEditForm(pengguna);
            showEditModal();

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Gagal mengambil data pengguna', 'error');
        }
    }

    // Populate form edit dengan data pengguna
    function populateEditForm(pengguna) {
        document.getElementById('editPenggunaId').value = pengguna.id;
        document.getElementById('editNama').value = pengguna.nama;
        document.getElementById('editEmail').value = pengguna.email;
        document.getElementById('editNoHp').value = pengguna.no_hp;

        // Set checkbox akses
        const aksesArray = Array.isArray(pengguna.akses) ? pengguna.akses : JSON.parse(pengguna.akses || '[]');
        document.querySelectorAll('#modalEditPengguna input[name="akses[]"]').forEach(checkbox => {
            checkbox.checked = aksesArray.includes(checkbox.value);
        });

        // Set status aktif
        document.getElementById('editIsActive').checked = pengguna.is_active == 1 || pengguna.is_active === true;

        // Reset password field
        const passwordField = document.getElementById('editPassword');
        if (passwordField) {
            passwordField.value = '';
        }
    }

    // Tampilkan modal edit
    function showEditModal() {
        const el = document.getElementById('modalEditPengguna');
        const m = el ? bootstrap.Modal.getOrCreateInstance(el) : null;
        m?.show();
    }

    // Handle submit form edit
    async function handleEditSubmit(form) {
        const penggunaId = document.getElementById('editPenggunaId').value;

        // Validasi akses
        const aksesChecked = form.querySelectorAll('input[name="akses[]"]:checked');
        if (aksesChecked.length === 0) {
            Swal.fire('Error', 'Pilih minimal satu hak akses!', 'error');
            return false;
        }

        // Prepare data
        const formData = {
            nama: document.getElementById('editNama').value,
            email: document.getElementById('editEmail').value,
            no_hp: document.getElementById('editNoHp').value,
            akses: Array.from(aksesChecked).map(cb => cb.value),
            is_active: document.getElementById('editIsActive').checked ? 1 : 0
        };

        // Tambahkan password jika diisi
        const passwordField = document.getElementById('editPassword');
        if (passwordField && passwordField.value.trim() !== '') {
            formData.password = passwordField.value;
        }

        try {
            await updatePengguna(penggunaId, formData);
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', error.message, 'error');
        }
    }

    async function updatePengguna(penggunaId, formData) {

        // Buat FormData dengan method override
        const data = new FormData();
        data.append('_method', 'PUT');
        data.append('nama', formData.nama || '');
        data.append('email', formData.email || '');
        data.append('no_hp', formData.no_hp || '');

        // Handle is_active dengan benar
        data.append('is_active', formData.is_active ? '1' : '0');

        // Append array akses
        if (Array.isArray(formData.akses) && formData.akses.length > 0) {
            formData.akses.forEach(akses => {
                data.append('akses[]', akses);
            });
        } else {
            console.error('Akses tidak valid:', formData.akses);
            throw new Error('Pilih minimal satu hak akses');
        }

        // Append password jika ada
        if (formData.password && formData.password.trim() !== '') {
            data.append('password', formData.password);
        }

        // Debug FormData
        console.log('FormData entries:');
        for (let pair of data.entries()) {
            console.log(pair[0] + ':', pair[1]);
        }

        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort('timeout'), 3000);
            const response = await fetch(`/api/pengguna/${penggunaId}`, {
                method: 'POST', // POST dengan method override
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache'
                },
                body: data,
                credentials: 'same-origin',
                signal: ctrl.signal
            }).finally(() => clearTimeout(t));

            const text = await response.text();
            let body; try { body = text ? JSON.parse(text) : {}; } catch { body = text; }

            if (!response.ok) {
                const result = typeof body === 'string' ? null : body;
                if (result?.errors) {
                    let errorMessage = 'Validasi gagal:\n';
                    Object.values(result.errors).forEach(errorArray => {
                        errorArray.forEach(msg => {
                            errorMessage += `• ${msg}\n`;
                        });
                    });
                    throw new Error(errorMessage);
                }
                throw new Error((result && result.message) || (typeof body === 'string' ? body : 'Gagal mengupdate pengguna'));
            }

            Swal.fire('Berhasil!', 'Data pengguna berhasil diupdate', 'success');
            hideEditModal();
            loadPenggunaData();

        } catch (error) {
            throw error;
        }
    }

    // Sembunyikan modal edit
    function hideEditModal() {
        const modalEdit = bootstrap.Modal.getInstance(document.getElementById('modalEditPengguna'));
        if (modalEdit) {
            modalEdit.hide();
        }
    }

    // Fungsi hapus pengguna
    async function hapusPengguna(penggunaId) {
        const result = await Swal.fire({
            title: 'Hapus Pengguna?',
            text: 'Data pengguna akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                await deletePengguna(penggunaId);
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', error.message, 'error');
            }
        }
    }

    // Delete pengguna via API
    async function deletePengguna(penggunaId) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort('timeout'), 2500);
        const response = await fetch(`/api/pengguna/${penggunaId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
            },
            credentials: 'same-origin',
            signal: ctrl.signal
        }).finally(() => clearTimeout(t));

        const text = await response.text();
        let body; try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
        if (!response.ok) {
            const msg = typeof body === 'string' ? body : (body?.message || 'Gagal menghapus pengguna');
            throw new Error(msg);
        }

        Swal.fire('Berhasil!', 'Pengguna berhasil dihapus', 'success');
        loadPenggunaData();
    }

    // Start
    loadPenggunaData();
    setupEventListeners();
}
