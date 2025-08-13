import './bootstrap';

function callInit(mod) {
  const fn =
    (mod && typeof mod.init === 'function' && mod.init) ||
    (mod?.default && typeof mod.default === 'function' && mod.default) ||
    (mod?.default && typeof mod.default.init === 'function' && mod.default.init);
  try { fn?.(); } catch (e) { console.error(e); }
}

function initApp() {
  const page = String(document.body?.dataset?.page || 'dashboard').toLowerCase();

  import(`./modules/${page}.js`)
    .then(callInit)
    .catch(() => import('./modules/dashboard.js').then(callInit));

  import('./modules/sidebar.js').then(callInit).catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
