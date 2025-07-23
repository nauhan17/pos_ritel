document.addEventListener('DOMContentLoaded', function () {
    let pengguna = null;

    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.email.value.trim();
        const password = this.password.value.trim();

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
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
        window.location.href = '/dashboard';
    }
});
