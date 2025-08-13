import axios from 'axios';
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Pastikan Bootstrap tersedia global (untuk kode yang pakai window.bootstrap)
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min.js';
window.bootstrap = bootstrap;

// Jika pakai jQuery:
import $ from 'jquery';
window.$ = window.jQuery = $;

import 'jquery.easing';
