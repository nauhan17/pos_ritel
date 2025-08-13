import { ensureSwal, ensureChart } from '../utils/vendors';

export async function init() {
    const cache = {
        get(key) {
            try {
                const raw = sessionStorage.getItem(key);
                if (!raw) return null;
                const { exp, data } = JSON.parse(raw);
                if (exp && Date.now() > exp) { sessionStorage.removeItem(key); return null; }
                return data;
            } catch { return null; }
        },
        set(key, data, ttlMs = 300000) { // default 5 menit
            try {
                sessionStorage.setItem(key, JSON.stringify({ exp: Date.now() + ttlMs, data }));
            } catch {}
        }
    };

    // Helper fetch
    const fetchJSON = (url, { timeout = 0, headers = {}, signal } = {}) => {
        const ctrl = new AbortController();
        const onAbort = () => { try { ctrl.abort('aborted'); } catch {} };
        if (signal) {
            if (signal.aborted) onAbort();
            else signal.addEventListener('abort', onAbort, { once: true });
        }
        const t = timeout ? setTimeout(() => ctrl.abort('timeout'), timeout) : null;
        return fetch(url, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...headers },
            credentials: 'same-origin',
            signal: ctrl.signal
        }).then(async res => {
            if (t) clearTimeout(t);
            if (signal) signal.removeEventListener?.('abort', onAbort);
            const ct = res.headers.get('content-type') || '';
            const body = ct.includes('application/json') ? await res.json() : await res.text();
            if (!res.ok) throw new Error(typeof body === 'string' ? body : (body?.message || `HTTP ${res.status}`));
            return body;
        }).catch(e => {
            if (t) clearTimeout(t);
            if (signal) signal.removeEventListener?.('abort', onAbort);
            throw e;
        });
    };

    // Toast login sukses (non-blocking)
    if (localStorage.getItem('loginSuccess') === '1') {
        ensureSwal().then(Swal => {
            Swal?.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Login berhasil!', showConfirmButton: false, timer: 2000 });
        }).finally(() => localStorage.removeItem('loginSuccess'));
    }

    // Render insight dari cache (jika ada), lalu refresh
    const formatCurrency = (amount) => (!amount ? 'Rp 0' : 'Rp ' + parseInt(amount, 10).toLocaleString('id-ID'));
    const renderInsight = (data) => {
        if (!data) return;
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setText('totalProdukCountDashboard', data.total_produk ?? 0);
        setText('totalStokCountDashboard', data.total_stok ?? 0);
        setText('totalModalCountDashboard', formatCurrency(data.total_modal ?? 0));
        setText('nilaiTotalProdukCountDashboard', formatCurrency(data.nilai_total_produk ?? 0));
        setText('totalPenjualanHariIni', formatCurrency(data.total_penjualan_hari_ini ?? 0));
        setText('totalProdukTerjual', data.total_produk_terjual ?? 0);
        setText('keuntunganHariIni', formatCurrency(data.keuntungan_hari_ini ?? 0));
        setText('rataRataPenjualan', formatCurrency(data.rata_rata_penjualan ?? 0));
    };

    const cachedInsight = cache.get('dash:insight');
    if (cachedInsight) renderInsight(cachedInsight);
    fetchJSON('/dashboard/insight')
        .then(data => { cache.set('dash:insight', data, 300000); renderInsight(data); })
        .catch(e => console.warn('insight gagal:', e));

    // Render produk hampir habis dari cache (jika ada), lalu refresh
    const renderHampirHabis = (list) => {
        const tbody = document.querySelector('#tableProdukHampirHabis tbody');
        if (!tbody) return;
        tbody.innerHTML = (Array.isArray(list) && list.length > 0)
            ? list.map(p => `<tr><td>${p.nama_produk}</td><td><span class="badge bg-danger">${p.stok}</span></td></tr>`).join('')
            : `<tr><td colspan="2" class="text-center text-muted">Tidak ada produk hampir habis</td></tr>`;
    };

    const cachedLow = cache.get('dash:lowStock');
    if (cachedLow) renderHampirHabis(cachedLow);
    fetchJSON('/dashboard/produk-hampir-habis')
        .then(list => { cache.set('dash:lowStock', list, 300000); renderHampirHabis(list); })
        .catch(e => console.warn('hampir habis gagal:', e));

    // Animasi default untuk transisi antar range
    const DEFAULT_ANIM = { duration: 300, easing: 'easeOutCubic' };

    // Chart penjualan
    const canvas = document.getElementById('chartPenjualan');
    let chartPenjualan = null;
    let chartReqAbort = null;

    if (canvas) {
        if (!canvas.style.height) canvas.style.height = '320px';

        const rangeEl = document.getElementById('penjualanRange');
        const getRange = () => (rangeEl?.value || 'minggu');
        const buildKey = (range) => `dash:chart:${range}`;

        const initRange = getRange();
        const cacheKey = buildKey(initRange);
        const cachedChart = cache.get(cacheKey);

        // Mulai paralel: import Chart.js dan fetch data awal
        const chartLibP = ensureChart().catch(() => null);
        const initialDataP = fetchJSON(`/dashboard/penjualan?range=${encodeURIComponent(initRange)}`)
            .catch(() => ({ labels: [], penjualan: [], keuntungan: [] }));

        // Placeholder ringan saat tidak ada cache
        if (!cachedChart) {
            const holder = canvas.parentElement?.querySelector('.chart-loading');
            if (!holder) {
                const div = document.createElement('div');
                div.className = 'chart-loading text-center text-muted small';
                div.style.minHeight = '2rem';
                div.textContent = 'Memuat grafik...';
                canvas.parentElement?.insertBefore(div, canvas);
            }
        }

        const Chart = await chartLibP;
        if (!Chart) return;

        // Pakai cache bila ada untuk render cepat; jika tidak ada, tunggu initialDataP
        const initData = cachedChart || await initialDataP;
        const ctx = canvas.getContext('2d');

        chartPenjualan = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.isArray(initData.labels) ? initData.labels : [],
                datasets: [
                    { label: 'Penjualan', data: Array.isArray(initData.penjualan) ? initData.penjualan : [], borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,.2)', tension: 0.3, fill: false },
                    { label: 'Keuntungan', data: Array.isArray(initData.keuntungan) ? initData.keuntungan : [], borderColor: '#198754', backgroundColor: 'rgba(25,135,84,.2)', tension: 0.3, fill: false }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // initial render tanpa animasi
                plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Aktifkan animasi untuk update berikutnya (transisi antar range)
        chartPenjualan.options.animation = DEFAULT_ANIM;

        // Hapus placeholder jika ada
        canvas.parentElement?.querySelector('.chart-loading')?.remove();

        // Jika pakai cache, update dengan data fresh ketika siap
        if (cachedChart) {
            initialDataP.then(data => {
                cache.set(cacheKey, data, 300000);
                chartPenjualan.data.labels = Array.isArray(data.labels) ? data.labels : [];
                chartPenjualan.data.datasets[0].data = Array.isArray(data.penjualan) ? data.penjualan : [];
                chartPenjualan.data.datasets[1].data = Array.isArray(data.keuntungan) ? data.keuntungan : [];
                chartPenjualan.options.animation = DEFAULT_ANIM;
                chartPenjualan.update(); // transisi halus ke data fresh
            }).catch(() => {});
        } else {
            cache.set(cacheKey, initData, 300000);
        }

        // Bind listener resize/tab hanya sekali per canvas
        if (canvas.dataset.boundResize !== '1') {
            document.querySelectorAll('a[data-bs-toggle="tab"],button[data-bs-toggle="tab"]').forEach(el => {
                el.addEventListener('shown.bs.tab', () => { chartPenjualan?.resize(); });
            });
            window.addEventListener('resize', () => chartPenjualan?.resize(), { passive: true });
            canvas.dataset.boundResize = '1';
        }

        // Ganti range: cache-first, lalu refresh dengan abort request lama
        if (rangeEl && rangeEl.dataset.bound !== '1') {
            let reqSeq = 0;
            const debounce = (fn, wait = 250) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; };
            rangeEl.addEventListener('change', debounce(async function () {
                const range = getRange();
                const key = buildKey(range);
                const seq = ++reqSeq;

                if (chartReqAbort) { try { chartReqAbort.abort(); } catch {} }
                chartReqAbort = new AbortController();

                const cacheData = cache.get(key);
                if (cacheData) {
                    chartPenjualan.data.labels = Array.isArray(cacheData.labels) ? cacheData.labels : [];
                    chartPenjualan.data.datasets[0].data = Array.isArray(cacheData.penjualan) ? cacheData.penjualan : [];
                    chartPenjualan.data.datasets[1].data = Array.isArray(cacheData.keuntungan) ? cacheData.keuntungan : [];
                    chartPenjualan.options.animation = DEFAULT_ANIM;
                    chartPenjualan.update(); // transisi ke data cache
                } else {
                    // kosongkan dulu tanpa animasi (loading ringan)
                    chartPenjualan.data.labels = [];
                    chartPenjualan.data.datasets[0].data = [];
                    chartPenjualan.data.datasets[1].data = [];
                    chartPenjualan.update('none');
                }

                try {
                    const fresh = await fetchJSON(`/dashboard/penjualan?range=${encodeURIComponent(range)}`, { signal: chartReqAbort.signal });
                    if (seq !== reqSeq) return;
                    cache.set(key, fresh, 300000);
                    chartPenjualan.data.labels = Array.isArray(fresh.labels) ? fresh.labels : [];
                    chartPenjualan.data.datasets[0].data = Array.isArray(fresh.penjualan) ? fresh.penjualan : [];
                    chartPenjualan.data.datasets[1].data = Array.isArray(fresh.keuntungan) ? fresh.keuntungan : [];
                    chartPenjualan.options.animation = DEFAULT_ANIM;
                    chartPenjualan.update(); // transisi ke data fresh
                } catch (e) {
                    if (e?.message !== 'aborted' && e !== 'aborted' && e !== 'timeout') {
                        console.error('Range chart gagal:', e);
                    }
                }
            }, 250));
            rangeEl.dataset.bound = '1';
        }
    }
}
