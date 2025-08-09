// Jalankan kode setelah seluruh dokumen dimuat
document.addEventListener('DOMContentLoaded', function () {
    // Ambil elemen sidebar, tombol toggle, konten utama, dan body
    const sidebar = document.getElementById('mainSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const mainContent = document.querySelector('.main-content');
    const body = document.body;

    // Jika tombol toggle dan sidebar ada di halaman
    if (toggleBtn && sidebar) {
        // Event handler: klik tombol toggle untuk mengubah mode sidebar mini/full
        toggleBtn.addEventListener('click', function () {
            sidebar.classList.toggle('sidebar-mini');
            body.classList.toggle('sidebar-mini');
            // Optional: Simpan preferensi ke localStorage (bisa ditambahkan jika ingin)
            // Ubah icon tombol sesuai status sidebar
            if (sidebar.classList.contains('sidebar-mini')) {
                this.innerHTML = '<i class="fas fa-angle-double-right"></i>';
            } else {
                this.innerHTML = '<i class="fas fa-angle-double-left"></i>';
            }
        });
    }
});
