document.addEventListener('DOMContentLoaded', function () {
    let pengguna = null;

    const DOM = {
        meta: {
            csrfToken: document.querySelector('meta[name="csrf-token"]').content
        }
    };

    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nama = this.nama.value.trim();
        const password = this.password.value.trim();

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': DOM.meta.csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ nama, password }),
            credentials: 'same-origin'
        })
        .then(res => res.json())
        .then(res => {
            if(res.success && res.pengguna) {
                pengguna = res.pengguna;
                showAksesPengguna();
            } else {
                document.getElementById('loginError').innerHTML = `<div class="alert alert-danger">${res.message || 'Nama atau password salah'}</div>`;
            }
        })
        .catch(() => {
            document.getElementById('loginError').innerHTML = '<div class="alert alert-danger">Terjadi kesalahan server!</div>';
        });
    });

    function showAksesPengguna() {
        const aksesRoute = {
            dashboard: '/dashboard',
            kasir: '/kasir',
            produk: '/produk',
            tracking: '/tracking',
            pengguna: '/pengguna'
        };

        let aksesArr = Array.isArray(pengguna.akses)
            ? pengguna.akses
            : JSON.parse(pengguna.akses || '[]');

        for (const akses of Object.keys(aksesRoute)) {
            if (aksesArr.includes(akses)) {
                // Simpan flag login sukses di localStorage
                localStorage.setItem('loginSuccess', '1');
                window.location.href = aksesRoute[akses];
                return;
            }
        }

        document.getElementById('loginError').innerHTML = '<div class="alert alert-danger">Anda tidak memiliki hak akses ke halaman manapun.</div>';
    }

    // Tambahkan ini di setiap halaman utama (dashboard/kasir/produk/dll) JS:
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
    });
});
