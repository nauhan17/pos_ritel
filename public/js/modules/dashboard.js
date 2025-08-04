document.addEventListener('DOMContentLoaded', function () {
    async function loadDashboardInsight() {
        try {
            const res = await fetch('/dashboard/insight');
            const data = await res.json();
            document.getElementById('totalProdukCountDashboard').textContent = data.total_produk ?? 0;
            document.getElementById('totalStokCountDashboard').textContent = data.total_stok ?? 0;
            document.getElementById('totalModalCountDashboard').textContent = formatCurrency(data.total_modal ?? 0);
            document.getElementById('nilaiTotalProdukCountDashboard').textContent = formatCurrency(data.nilai_total_produk ?? 0);

            document.getElementById('totalPenjualanHariIni').textContent = formatCurrency(data.total_penjualan_hari_ini ?? 0);
            document.getElementById('totalProdukTerjual').textContent = data.total_produk_terjual ?? 0;
            document.getElementById('keuntunganHariIni').textContent = formatCurrency(data.keuntungan_hari_ini ?? 0);
            document.getElementById('rataRataPenjualan').textContent = formatCurrency(data.rata_rata_penjualan ?? 0);
        } catch (e) {
            console.error('Gagal load insight dashboard:', e);
        }
    }

    // 2. Ambil data grafik penjualan (line chart)
    async function loadPenjualanChart(range = 'minggu') {
        try {
            const res = await fetch(`/dashboard/penjualan?range=${range}`);
            const data = await res.json();
            // data: { labels: [...], penjualan: [...], keuntungan: [...] }
            chartPenjualan.data.labels = data.labels;
            chartPenjualan.data.datasets[0].data = data.penjualan;
            chartPenjualan.data.datasets[1].data = data.keuntungan;
            chartPenjualan.update();
        } catch (e) {
            console.error('Gagal load grafik penjualan:', e);
        }
    }

    // 3. Ambil data produk hampir habis
    async function loadProdukHampirHabis() {
        try {
            const res = await fetch('/dashboard/produk-hampir-habis');
            const data = await res.json();
            let tbody = document.querySelector('#tableProdukHampirHabis tbody');
            tbody.innerHTML = (data.length > 0)
                ? data.map(p =>
                    `<tr>
                        <td>${p.nama_produk}</td>
                        <td><span class="badge bg-danger">${p.stok}</span></td>
                    </tr>`
                  ).join('')
                : `<tr><td colspan="2" class="text-center text-muted">Tidak ada produk hampir habis</td></tr>`;
        } catch (e) {
            console.error('Gagal load produk hampir habis:', e);
        }
    }

    // 4. Format currency helper
    function formatCurrency(amount) {
        if (!amount || amount === 0) return 'Rp 0';
        return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
    }

    // 5. Inisialisasi Chart.js (dengan data awal kosong)
    const ctx = document.getElementById('chartPenjualan').getContext('2d');
    let chartPenjualan = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Penjualan',
                    data: [],
                    fill: false,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Keuntungan',
                    data: [],
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 6. Event handler untuk select range grafik penjualan
    document.getElementById('penjualanRange').addEventListener('change', function() {
        loadPenjualanChart(this.value);
    });

    // 7. Jalankan semua loader saat halaman siap
    loadDashboardInsight();
    loadPenjualanChart('minggu');
    loadProdukHampirHabis();
});
