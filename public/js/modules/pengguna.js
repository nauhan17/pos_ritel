document.addEventListener('DOMContentLoaded', function () {
    // Validasi form register (sudah ada di kode Anda)
    const form = document.querySelector('#modalTambahPengguna form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const aksesChecked = form.querySelectorAll('input[name="akses[]"]:checked');
            const password = form.querySelector('input[name="password"]').value;
            if (aksesChecked.length === 0) {
                alert('Pilih minimal satu hak akses!');
                e.preventDefault();
                return false;
            }
            if (password.length < 6) {
                alert('Password minimal 6 karakter!');
                e.preventDefault();
                return false;
            }
        });
    }

    // Fetch data pengguna dari API dan render ke tabel
    fetch('/api/pengguna')
        .then(res => res.json())
        .then(data => {
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
                    <td>${idx + 1}</td>
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
                    <td>
                        <button class="btn btn-sm btn-warning" data-id="${pengguna.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" data-id="${pengguna.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        });
});
