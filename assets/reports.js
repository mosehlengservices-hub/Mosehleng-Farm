(function () {
  'use strict';

  // ---------- Helpers ----------
  function safeParseJSON(str) {
    try { return JSON.parse(str || 'null'); } catch (e) { return null; }
  }

  function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function buildCSV(headers, rows) {
    const headerRow = headers.map(csvEscape).join(',');
    const csvRows = [headerRow];
    if (!rows || rows.length === 0) {
      const emptyRow = headers.map(() => '').join(',');
      csvRows.push(emptyRow);
      csvRows.push(headers.map((h, i) => (i === 0 ? 'No data' : '')).map(csvEscape).join(','));
    } else {
      for (const r of rows) {
        const row = headers.map(h => csvEscape(r[h] !== undefined ? r[h] : '')).join(',');
        csvRows.push(row);
      }
    }
    return csvRows.join('\r\n');
  }

  function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function createTableElement(title, headers, rows) {
    const container = document.createElement('div');
    const h = document.createElement('h4');
    h.textContent = title;
    container.appendChild(h);

    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headers.forEach(hd => {
      const th = document.createElement('th');
      th.textContent = hd;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (!rows || rows.length === 0) {
      const tr = document.createElement('tr');
      tr.style.background = 'transparent';
      const td = document.createElement('td');
      td.colSpan = headers.length || 1;
      td.style.textAlign = 'center';
      td.style.color = '#666';
      td.textContent = 'No records';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      rows.forEach(r => {
        const tr = document.createElement('tr');
        headers.forEach(hd => {
          const td = document.createElement('td');
          td.textContent = r[hd] !== undefined ? r[hd] : '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    container.appendChild(table);
    return container;
  }

  // ---------- Data sources (adapt for backend) ----------
  function getInvestorsDataLocal() {
    const raw = safeParseJSON(localStorage.getItem('investors'));
    if (Array.isArray(raw)) return raw;
    return [];
  }

  function getAttendanceDataLocal() {
    const raw = safeParseJSON(localStorage.getItem('attendance'));
    if (Array.isArray(raw)) return raw;
    return [];
  }

  // Try to fetch from server; if fails, fallback to local data
  async function fetchReportFromServer(key, params) {
    try {
      const qs = new URLSearchParams();
      if (params.start) qs.set('start', params.start);
      if (params.end) qs.set('end', params.end);
      if (params.cycle) qs.set('cycle', params.cycle);
      const url = `/api/reports/${encodeURIComponent(key)}?${qs.toString()}`;
      const resp = await fetch(url, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error('Server returned ' + resp.status);
      const data = await resp.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.rows)) return data.rows;
      return [];
    } catch (e) {
      // console.warn('Server fetch failed; falling back to local data', e);
      return null; // signal to use local fallback
    }
  }

  // ---------- Report definitions ----------
  const REPORTS = {
    investors: {
      id: 'investors',
      title: 'Investors',
      headers: ['Name', 'Investment', 'Date', 'Notes'],
      getLocal: getInvestorsDataLocal,
      filename: () => `investors-report-${new Date().toISOString().slice(0,10)}.csv`
    },
    attendance: {
      id: 'attendance',
      title: 'Attendance Register',
      headers: ['Date', 'Worker', 'Status', 'Notes'],
      getLocal: getAttendanceDataLocal,
      filename: () => `attendance-register-${new Date().toISOString().slice(0,10)}.csv`
    }
  };

  // ---------- Small DOM helpers ----------
  function $(id) { return document.getElementById(id); }

  function showModal(title, contentNode) {
    const modal = $('reportModal');
    if (!modal) return;
    $('reportModalTitle').textContent = title;
    const body = $('reportModalBody');
    body.innerHTML = '';
    body.appendChild(contentNode);
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = $('reportModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function renderInlineReport(reportKey, headers, rows) {
    const container = $('reportPreview');
    const emptyState = $('reportEmptyState');
    container.innerHTML = '';
    const title = REPORTS[reportKey].title + ' (Preview)';
    const tableEl = createTableElement(title, headers, rows);
    container.appendChild(tableEl);
    container.style.display = '';
    if (emptyState) emptyState.style.display = 'none';
  }

  function updateLastReportMeta(reportKey) {
    const info = $('lastReportInfo');
    const meta = $('lastReportMeta');
    if (!info || !meta) return;
    const now = new Date();
    meta.textContent = `${REPORTS[reportKey].title} generated on ${now.toLocaleString()}`;
    const strong = info.querySelector('strong');
    if (strong) strong.textContent = REPORTS[reportKey].title;
  }

  // ---------- Core actions ----------
  async function generateRowsForReport(key, params) {
    // Try server first
    const serverData = await fetchReportFromServer(key, params);
    if (serverData !== null) return serverData.map(normalizeRow);

    // fallback local
    const def = REPORTS[key];
    const local = def.getLocal();
    // Optionally apply date filters if fields present
    const filtered = local.filter(r => {
      if (params.start || params.end) {
        const dateStr = r.Date || r.date || r.dateCreated || '';
        if (!dateStr) return true; // keep if no date in record
        const d = new Date(dateStr);
        if (isNaN(d)) return true;
        if (params.start) {
          const s = new Date(params.start);
          if (d < s) return false;
        }
        if (params.end) {
          const e = new Date(params.end);
          if (d > e) return false;
        }
      }
      if (params.cycle) {
        // if record has a cycle field try to match
        const cycle = r.cycle || r.Cycle || r.cycleId || '';
        if (cycle && String(cycle) !== String(params.cycle)) return false;
      }
      return true;
    });

    return filtered.map(normalizeRow);
  }

  function normalizeRow(raw) {
    // produce an object keyed by header names for easy CSV and table generation
    const out = {};
    // copy common keys
    for (const k in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      out[k] = raw[k];
    }
    return out;
  }

  async function onPreviewClicked() {
    const selector = $('reportSelector');
    const key = selector.value;
    const params = getParamsFromUI();
    const def = REPORTS[key];
    const data = await generateRowsForReport(key, params);

    // Map rows to match headers
    const rows = data.map(d => {
      const out = {};
      def.headers.forEach(h => {
        out[h] = d[h] !== undefined ? d[h] : (d[h.toLowerCase()] !== undefined ? d[h.toLowerCase()] : '');
      });
      return out;
    });

    const tableNode = createTableElement(def.title, def.headers, rows);
    showModal(def.title + ' — Preview', tableNode.cloneNode(true));
    renderInlineReport(key, def.headers, rows);
    updateLastReportMeta(key);

    sessionStorage.setItem('lastReportPreview', JSON.stringify({ key, headers: def.headers, rows, filename: def.filename() }));
  }

  async function onDownloadClicked() {
    const selector = $('reportSelector');
    const key = selector.value;
    const params = getParamsFromUI();
    const def = REPORTS[key];
    const data = await generateRowsForReport(key, params);

    const rows = data.map(d => {
      const out = {};
      def.headers.forEach(h => out[h] = d[h] !== undefined ? d[h] : (d[h.toLowerCase()] !== undefined ? d[h.toLowerCase()] : ''));
      return out;
    });

    const csv = buildCSV(def.headers, rows);
    downloadCSV(def.filename(), csv);
    updateLastReportMeta(key);
  }

  function onModalDownload() {
    const last = safeParseJSON(sessionStorage.getItem('lastReportPreview'));
    if (!last) return alert('No report available for download (preview first).');
    const csv = buildCSV(last.headers, last.rows);
    downloadCSV(`preview-${last.filename}`, csv);
  }

  function onPrint() {
    const container = $('reportPreview');
    if (!container || container.children.length === 0) return alert('No report to print (preview first).');
    // Open new window with printable content
    const w = window.open('', '_blank');
    const cssHref = ''; // leave empty - the main CSS is often available but keeping simple
    w.document.write('<!doctype html><html><head><title>Print Report</title>');
    // inline minimal styles to make table printable
    w.document.write('<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f8f9fa}</style>');
    w.document.write('</head><body>');
    w.document.write(container.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  function getParamsFromUI() {
    const start = $('reportStart') ? $('reportStart').value : '';
    const end = $('reportEnd') ? $('reportEnd').value : '';
    const cycle = $('reportCycle') ? $('reportCycle').value : '';
    return { start: start || null, end: end || null, cycle: cycle || null };
  }

  // ---------- Initialization ----------
  function init() {
    const previewBtn = $('previewReportBtn');
    const downloadBtn = $('downloadReportBtn');
    const printBtn = $('printReportBtn');
    const modalDownload = $('modalDownloadCsv');
    const modalClose = $('modalCloseBtn');
    const modalX = $('reportModalClose');

    if (previewBtn) previewBtn.addEventListener('click', onPreviewClicked);
    if (downloadBtn) downloadBtn.addEventListener('click', onDownloadClicked);
    if (printBtn) printBtn.addEventListener('click', onPrint);
    if (modalDownload) modalDownload.addEventListener('click', onModalDownload);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalX) modalX.addEventListener('click', closeModal);

    const modal = $('reportModal');
    if (modal) {
      modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    }

    const selector = $('reportSelector');
    if (selector) {
      selector.innerHTML = '';
      Object.keys(REPORTS).forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = REPORTS[k].title;
        selector.appendChild(opt);
      });
    }

    // populate cycle selector from localStorage if available
    const cycleSel = $('reportCycle');
    if (cycleSel) {
      cycleSel.innerHTML = '<option value="">All cycles</option>';
      const cycles = safeParseJSON(localStorage.getItem('cycles')) || [];
      cycles.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id || c.Id || c.name || c.Name || c._id || '';
        o.textContent = c.name || c.Name || c.plotName || c.PlotName || String(o.value);
        cycleSel.appendChild(o);
      });
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
