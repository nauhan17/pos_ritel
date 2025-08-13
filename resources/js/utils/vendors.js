export async function ensureSwal() {
  if (typeof window.Swal === 'undefined') {
    const m = await import('sweetalert2');
    window.Swal = m.default;
  }
  return window.Swal;
}

export async function ensureChart() {
  if (typeof window.Chart === 'undefined') {
    const m = await import('chart.js/auto');
    window.Chart = m.default;
  }
  return window.Chart;
}

export async function ensureBootstrap() {
  if (typeof window.bootstrap === 'undefined') {
    const bootstrap = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
    // Bootstrap ESM tidak otomatis ke window
    window.bootstrap = bootstrap;
  }
  return window.bootstrap;
}

export async function ensureXLSX() {
  if (typeof window.XLSX === 'undefined') {
    const m = await import('xlsx');
    window.XLSX = m.default || m;
  }
  return window.XLSX;
}

export async function ensureJsPDF() {
  if (!window.jsPDF) {
    const m = await import('jspdf');
    window.jsPDF = m.jsPDF || (m.default && m.default.jsPDF);
  }
  return window.jsPDF;
}

export async function ensureAutoTable() {
  const m = await import('jspdf-autotable');
  return m.default || m; // fungsi autoTable
}

export async function ensureJsBarcode() {
  if (typeof window.JsBarcode === 'undefined') {
    const m = await import('jsbarcode');
    window.JsBarcode = m.default || m;
  }
  return window.JsBarcode;
}
