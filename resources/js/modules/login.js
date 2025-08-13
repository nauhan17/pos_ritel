export function init() {
    let pengguna = null;
    let loginReqAbort = null;
    let isRedirecting = false;

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
        const timeout = options.timeout ?? 5000;
        const t = setTimeout(() => ctrl.abort('timeout'), timeout);
        const onAbort = () => { try { ctrl.abort('aborted'); } catch {} };
        if (outerSignal) {
            if (outerSignal.aborted) onAbort();
            else outerSignal.addEventListener('abort', onAbort, { once: true });
        }
        try {
            const res = await fetch(url, {
                ...options,
                signal: ctrl.signal,
                credentials: options.credentials ?? 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-store',
                    'Pragma': 'no-cache',
                    ...(options.headers || {})
                },
                keepalive: options.keepalive ?? false
            });
            const ct = res.headers.get('content-type') || '';
            const isJson = ct.includes('application/json');
            const text = await res.text(); // baca sekali
            let body = text;
            if (isJson) { try { body = text ? JSON.parse(text) : {}; } catch {} }
            if (!res.ok) {
                const msg = typeof body === 'string' ? body : (body?.message || `HTTP ${res.status}`);
                const err = new Error(msg);
                err.status = res.status;
                err.raw = text;
                throw err;
            }
            if (!isJson) {
                const err = new Error(`Respon tidak valid dari server (bukan JSON). HTTP ${res.status}`);
                err.status = res.status;
                err.raw = text;
                throw err;
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
            // Batalkan request sebelumnya agar tidak menumpuk
            if (loginReqAbort) { try { loginReqAbort.abort(); } catch {} }
            loginReqAbort = new AbortController();
            const data = await fetchJSON('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': DOM.meta.csrfToken,
                    // Accept/X-Requested-With ditambahkan di fetchJSON
                },
                body: JSON.stringify({ nama, password }),
                credentials: 'same-origin',
                timeout: 5000,
                signal: loginReqAbort.signal
            });

            if (data.success && data.pengguna) {
                pengguna = data.pengguna;
                // Jika server mengirim next_url gunakan langsung
                if (typeof data.next_url === 'string' && data.next_url) {
                    return redirectNow(data.next_url);
                }
                return showAksesPengguna();
            } else {
                showError(data.message || 'Nama atau password salah');
            }
        } catch (err) {
            if (err?.message === 'aborted') return;
            if (err?.message === 'timeout') return showError('Koneksi lambat, coba lagi.');
            if (err?.status === 419) return showError('Sesi kedaluwarsa/CSRF tidak valid. Muat ulang halaman.');
            if (err?.status === 401) return showError('Nama atau password salah.');
            if (err?.status === 404) return showError('Endpoint /api/login tidak ditemukan.');
            if (typeof err?.raw === 'string' && err.raw.includes('<html')) {
                return showError('Server mengirim HTML (kemungkinan redirect). Periksa route /api/login & middleware.');
            }
            showError(err?.message || 'Terjadi kesalahan server!');
        } finally {
            // Jangan ubah UI saat sedang redirect agar terasa cepat
            if (!isRedirecting) toggleLoading(false);
        }
    });

    function redirectNow(url) {
        try { localStorage.setItem('loginSuccess', '1'); } catch {}
        isRedirecting = true;
        document.body.style.pointerEvents = 'none';
        window.location.replace(url);
    }

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
                return redirectNow(aksesRoute[akses]);
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

    // Batalkan request saat user meninggalkan halaman/tab
    const abortOnLeave = () => { if (loginReqAbort) { try { loginReqAbort.abort(); } catch {} } };
    window.addEventListener('beforeunload', abortOnLeave, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') abortOnLeave();
    });
}
