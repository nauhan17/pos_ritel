// Jalankan kode setelah seluruh dokumen dimuat
export function init() {
    const sidebar = document.getElementById('mainSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const body = document.body;

    if (!sidebar || !toggleBtn) return;

    // Cegah double-init
    if (toggleBtn.dataset.bound === '1') return;

    // Siapkan ikon sekali, hindari innerHTML berulang
    let icon = toggleBtn.querySelector('i');
    if (!icon) {
        icon = document.createElement('i');
        icon.className = 'fas';
        toggleBtn.appendChild(icon);
    }

    const applyMini = (isMini) => {
        // Batch perubahan agar sinkron dengan frame render
        requestAnimationFrame(() => {
            sidebar.classList.toggle('sidebar-mini', isMini);
            body.classList.toggle('sidebar-mini', isMini);
            icon.className = isMini ? 'fas fa-angle-double-right' : 'fas fa-angle-double-left';
            toggleBtn.setAttribute('aria-pressed', isMini ? 'true' : 'false');
            localStorage.setItem('sidebar-mini', isMini ? '1' : '0');
        });
    };

    // Terapkan preferensi mini sejak awal (kurangi relayout)
    const isMiniSaved = localStorage.getItem('sidebar-mini') === '1';
    applyMini(isMiniSaved);

    // Listener klik (tanpa passive; batching via RAF di applyMini)
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const next = !sidebar.classList.contains('sidebar-mini');
        applyMini(next);
    });

    toggleBtn.dataset.bound = '1';
};
