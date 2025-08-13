export function init() {
    let pengguna = null;

    // Abort controller untuk membatalkan request login yang sedang berjalan
    let loginReqAbort = null;

    const DOM = {
        meta: {
            csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        form: document.getElementById('loginForm'),
        error: document.getElementById('loginError'),
    };

    if (!DOM.form) return;

    function toggleLoading(isLoading) {
        const btn = DOM.form.querySelector('button[type="submit"]');
        if (!btn) return;
        if (isLoading) {
            btn.dataset._text = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Masuk...';
        } else {
            btn.disabled = false;
            if (btn.dataset._text) btn.textContent = btn.dataset._text;
        }
    }

    async function fetchJSON(url, options = {}) {
        const ctrl = new AbortController();
        const outerSignal = options.signal;
        const timeout = options.timeout ?? 1500; // percepat fail
        const t = setTimeout(() => ctrl.abort('timeout'), timeout);
        const onAbort = () => { try { ctrl.abort('aborted'); } catch {} };
        if (outerSignal) {
            if (outerSignal.aborted) onAbort();
            else outerSignal.addEventListener('abort', onAbort, { once: true });
        }
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache',
                    ...(options.headers || {})
                },
                credentials: options.credentials ?? 'same-origin',
                signal: ctrl.signal,
                keepalive: options.keepalive ?? false
            });
            const text = await res.text(); // baca sekali
            let body;
            try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
            if (!res.ok) {
                const msg = typeof body === 'string' ? body : (body?.message || `HTTP ${res.status}`);
                throw new Error(msg);
            }
            return body;
        } finally {
            clearTimeout(t);
            if (outerSignal) outerSignal.removeEventListener?.('abort', onAbort);
        }
    }

    DOM.form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const nama = this.nama?.value.trim() || '';
        const password = this.password?.value.trim() || '';
        toggleLoading(true);
        DOM.error && (DOM.error.textContent = '');

        try {
            // Batalkan request sebelumnya jika ada
            if (loginReqAbort) { try { loginReqAbort.abort(); } catch {} }
            loginReqAbort = new AbortController();
             const data = await fetchJSON('/api/login', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'X-CSRF-TOKEN': DOM.meta.csrfToken,
                 },
                 body: JSON.stringify({ nama, password }),
                 credentials: 'same-origin',
                 timeout: 1500,
                 signal: loginReqAbort.signal
             });

             if (data.success && data.pengguna) {
                 pengguna = data.pengguna;
                 showAksesPengguna();
             } else {
                 showError(data.message || 'Nama atau password salah');
             }
        } catch (err) {
            showError(err?.message || 'Terjadi kesalahan server!');
        } finally {
            // Jika akan redirect, tombol tidak sempat diaktifkan lagi (tidak masalah)
            toggleLoading(false);
        }
    });

    // Batalkan request saat user menutup/berpindah tab agar tidak menggantung
    const abortOnLeave = () => { if (loginReqAbort) try { loginReqAbort.abort(); } catch {} };
    window.addEventListener('beforeunload', abortOnLeave, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') abortOnLeave();
    });
    // Optional: bersihkan listener saat SPA teardown (jika ada mekanisme dispose)
    // window.removeEventListener('beforeunload', abortOnLeave);

    function showAksesPengguna() {
        const aksesRoute = {
            dashboard: '/dashboard',
            kasir: '/kasir',
            produk: '/produk',
            tracking: '/tracking',
            pengguna: '/pengguna'
        };

        const aksesArr = Array.isArray(pengguna.akses)
            ? pengguna.akses
            : (pengguna.akses ? (safeParseJSON(pengguna.akses) || []) : []);

        for (const akses of Object.keys(aksesRoute)) {
            if (aksesArr.includes(akses)) {
                localStorage.setItem('loginSuccess', '1');
                // replace agar tidak menambah history (sedikit lebih mulus saat back)
                window.location.replace(aksesRoute[akses]);
                return;
            }
        }
        showError('Anda tidak memiliki hak akses ke halaman manapun.');
    }

    function showError(msg) {
        if (!DOM.error) return;
        DOM.error.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
    }

    function safeParseJSON(s) {
        try { return JSON.parse(s); } catch { return null; }
    }
}
