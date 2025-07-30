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
                document.getElementById('loginError').innerHTML = `<div class="alert alert-danger">${res.message || 'Login gagal!'}</div>`;
            }
        })
        .catch(() => {
            document.getElementById('loginError').innerHTML = '<div class="alert alert-danger">Terjadi kesalahan server!</div>';
        });
    });

    function showAksesPengguna() {
        // Daftar prioritas hak akses dan route
        const aksesRoute = {
            dashboard: '/dashboard',
            kasir: '/kasir',
            produk: '/produk',
            tracking: '/tracking',
            pengguna: '/pengguna'
            // tambahkan sesuai kebutuhan
        };

        // akses bisa array atau string json
        let aksesArr = Array.isArray(pengguna.akses)
            ? pengguna.akses
            : JSON.parse(pengguna.akses || '[]');

        // Cari hak akses pertama yang ada di aksesRoute
        for (const akses of Object.keys(aksesRoute)) {
            if (aksesArr.includes(akses)) {
                window.location.href = aksesRoute[akses];
                return;
            }
        }

        document.getElementById('loginError').innerHTML = '<div class="alert alert-danger">Anda tidak memiliki hak akses ke halaman manapun.</div>';
    }
});
