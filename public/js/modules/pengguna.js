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
        console.log('=== ADD DEBUG START ===');
        console.log('Form Data:', formData);

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

        // Debug FormData
        console.log('FormData entries:');
        for (let pair of data.entries()) {
            console.log(pair[0] + ':', pair[1]);
        }

        try {
            const response = await fetch('/api/pengguna', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                },
                body: data,
                credentials: 'same-origin'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers.get('content-type'));

            // Cek apakah response adalah JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Non-JSON response:', textResponse);
                throw new Error('Server returned non-JSON response: ' + textResponse.substring(0, 100));
            }

            const result = await response.json();
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
        const modalAdd = bootstrap.Modal.getInstance(document.getElementById('modalTambahPengguna'));
        if (modalAdd) {
            modalAdd.hide();
        }
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
        fetch('/api/pengguna', {
                credentials: 'same-origin'
            })
            .then(res => res.json())
            .then(data => {
                renderPenggunaTable(data);
                addButtonListeners(); // Setup button listeners setelah render
            })
            .catch(error => {
                console.error('Error loading pengguna data:', error);
                Swal.fire('Error', 'Gagal memuat data pengguna', 'error');
            });
    }

    // Render tabel pengguna
    function renderPenggunaTable(data) {
        const badgeMap = {
            dashboard: 'primary',
            produk: 'info',
            kasir: 'success',
            tracking: 'warning text-dark',
            pengguna: 'secondary'
        };

        const tbody = document.getElementById('penggunaTableBody');
        tbody.innerHTML = data.map((pengguna, idx) => `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td>
                    <div class="fw-bold">${pengguna.nama}</div>
                    <div class="text-muted small">${pengguna.email}</div>
                </td>
                <td>${pengguna.no_hp}</td>
                <td>
                    ${(Array.isArray(pengguna.akses) ? pengguna.akses : JSON.parse(pengguna.akses || '[]')).map(akses =>
                        `<span class="badge bg-${badgeMap[akses] || 'dark'} mb-1 text-capitalize">${akses}</span>`
                    ).join(' ')}
                </td>
                <td>
                    <span class="badge bg-${pengguna.is_active ? 'success' : 'danger'}">
                        ${pengguna.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${pengguna.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${pengguna.id}" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Setup event listener untuk tombol edit dan hapus (dipanggil setelah render tabel)
    function addButtonListeners() {
        // Event listener untuk tombol edit
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const penggunaId = this.getAttribute('data-id');
                editPengguna(penggunaId);
            });
        });

        // Event listener untuk tombol hapus
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                const penggunaId = this.getAttribute('data-id');
                hapusPengguna(penggunaId);
            });
        });
    }

    // Fungsi edit pengguna
    async function editPengguna(penggunaId) {
        try {
            const response = await fetch(`/api/pengguna/${penggunaId}`, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Gagal mengambil data pengguna');
            }

            const pengguna = await response.json();
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
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditPengguna'));
        modalEdit.show();
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
        console.log('=== UPDATE DEBUG START ===');
        console.log('Pengguna ID:', penggunaId);
        console.log('Form Data:', formData);

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
            const response = await fetch(`/api/pengguna/${penggunaId}`, {
                method: 'POST', // POST dengan method override
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                    'Accept': 'application/json'
                },
                body: data,
                credentials: 'same-origin'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers.get('content-type'));

            // Ambil response sebagai text dulu untuk debug
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            // Coba parse JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Server response tidak valid: ' + responseText.substring(0, 200));
            }

            console.log('Parsed result:', result);

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
                throw new Error(result.message || 'Gagal mengupdate pengguna');
            }

            console.log('=== UPDATE SUCCESS ===');
            Swal.fire('Berhasil!', 'Data pengguna berhasil diupdate', 'success');
            hideEditModal();
            loadPenggunaData();

        } catch (error) {
            console.error('=== UPDATE ERROR ===');
            console.error('Error:', error);
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
        const response = await fetch(`/api/pengguna/${penggunaId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gagal menghapus pengguna');
        }

        Swal.fire('Berhasil!', 'Pengguna berhasil dihapus', 'success');
        loadPenggunaData();
    }

    // Initialize aplikasi
    function init() {
        setupEventListeners();
        loadPenggunaData();
    }

    // Jalankan aplikasi
    init();
});
