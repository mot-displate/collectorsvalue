/**
 * Displate LE Value – API-driven catalog (displate-inventory-extension style) + product pages with eBay/secondary market.
 * Set USE_CSV = true to restore CSV-driven grid and insights (feature flag).
 */

const USE_CSV = false;

// Base path for GitHub Pages (e.g. /collectorsvalue) or '' when served from root
const BASE = (function () {
  if (typeof location === 'undefined') return '';
  const p = location.pathname.replace(/\/$/, '') || '';
  if (!p || p === '/') return '';
  const parts = p.split('/').filter(Boolean);
  return parts.length > 1 ? '/' + parts.slice(0, -1).join('/') : '/' + parts[0];
})();
const CSV_PATH = BASE ? BASE + '/data/displates.csv' : 'data/displates.csv';
const LE_IMAGES_JSON = BASE ? BASE + '/data/le-images.json' : 'data/le-images.json';
const DISPLATE_API_URL = 'https://sapi.displate.com/artworks/limited';

let allRecords = [];
let filteredRecords = [];
let salesByLeId = new Map();
let salesByTitle = new Map();

function normalizeTitle(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parsePrice(str) {
  if (!str || str === '—' || str === '') return null;
  const n = parseFloat(String(str).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function parseNum(str) {
  if (str == null || str === '') return null;
  const n = parseInt(String(str).replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function formatPrice(str) {
  return str || '—';
}

// ---------- Displate API (same as displate-inventory-extension) ----------
async function fetchDisplateApiFull() {
  try {
    const res = await fetch(DISPLATE_API_URL);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (_) {}
  try {
    const res = await fetch(LE_IMAGES_JSON);
    if (res.ok) {
      const data = await res.json();
      return apiListFromStaticData(data);
    }
  } catch (_) {}
  return [];
}

function apiListFromStaticData(data) {
  const seen = new Set();
  const list = [];
  if (data.byId) {
    Object.entries(data.byId).forEach(([, entry]) => {
      if (!entry.leUrl || seen.has(entry.leUrl)) return;
      seen.add(entry.leUrl);
      const idMatch = entry.leUrl.match(/\/displate\/(\d+)$/);
      list.push({
        itemCollectionId: idMatch ? parseInt(idMatch[1], 10) : null,
        title: entry.title,
        images: entry.imageUrl ? { main: { url: entry.imageUrl } } : null,
        url: entry.leUrl.replace('https://displate.com', ''),
        edition: { available: null, size: null, type: 'standard' },
      });
    });
  }
  return list;
}

function buildRecordsFromApi(apiList) {
  return apiList.map((item) => {
    const imageUrl =
      item.images?.main?.url ||
      item.image?.url ||
      item.thumbnail?.url ||
      null;
    const leUrl = item.url
      ? `https://displate.com${item.url}`
      : `https://displate.com/limited-edition/displate/${item.itemCollectionId}`;
    const edition = item.edition || {};
    const title = item.title || '';
    return {
      itemCollectionId: item.itemCollectionId,
      id: item.itemCollectionId,
      name: title,
      title,
      imageUrl,
      leUrl,
      edition: {
        available: edition.available,
        size: edition.size,
        type: edition.type || 'standard',
      },
      artist: '',
      searchText: title.toLowerCase(),
      releaseDate: edition.startDate || '',
    };
  });
}

// ---------- CSV (feature-flagged: used for grid when USE_CSV, and for sales on product page) ----------
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else current += c;
  }
  if (current.trim()) lines.push(current);

  function splitRow(row) {
    const out = [];
    let cell = '';
    let inQ = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) {
        out.push(cell.trim());
        cell = '';
      } else cell += ch;
    }
    out.push(cell.trim());
    return out;
  }
  return lines.map((line) => splitRow(line));
}

function buildRecordsFromCSV(rows) {
  if (rows.length < 2) return [];
  const headers = rows[1].map((h) => h.trim());
  const records = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const rec = {};
    headers.forEach((h, j) => {
      rec[h] = row[j] != null ? String(row[j]).trim() : '';
    });
    const id = parseNum(rec['ID']) || rec['ID'];
    const name = rec['Name / Link'] || rec['Name'] || '';
    records.push({
      id,
      releaseDate: rec['Release Date'] || '',
      name,
      artist: rec['Artist'] || '',
      quantity: parseNum(rec['Quantity']) || 0,
      cost: rec['Cost'] || '',
      number: rec['Number'] || '',
      resales: parseNum(rec['# Resales']) || 0,
      highPrice: rec['High Price'] || '',
      highPriceNum: parsePrice(rec['High Price']),
      avgPrice: rec['Avg Price'] || '',
      avgPriceNum: parsePrice(rec['Avg Price']),
      lowPrice: rec['Low Price'] || '',
      lowPriceNum: parsePrice(rec['Low Price']),
      totalSales: rec['Total Sales'] || '',
      lastSale: rec['Last Sale'] || '',
      searchText: `${name} ${rec['Artist'] || ''} ${rec['Number'] || ''}`.toLowerCase(),
    });
  }
  return records;
}

async function loadCSVForSales() {
  try {
    const res = await fetch(CSV_PATH);
    if (!res.ok) return;
    const text = await res.text();
    const rows = parseCSV(text);
    const records = buildRecordsFromCSV(rows);
    records.forEach((r) => {
      const sales = {
        resales: r.resales,
        highPrice: r.highPrice,
        highPriceNum: r.highPriceNum,
        avgPrice: r.avgPrice,
        avgPriceNum: r.avgPriceNum,
        lowPrice: r.lowPrice,
        lowPriceNum: r.lowPriceNum,
        totalSales: r.totalSales,
        lastSale: r.lastSale,
      };
      if (r.id != null) salesByLeId.set(Number(r.id), sales);
      if (r.name) salesByTitle.set(normalizeTitle(r.name), sales);
    });
  } catch (_) {}
}

function getSalesForLe(le) {
  if (!le) return null;
  const byId = le.itemCollectionId != null ? salesByLeId.get(Number(le.itemCollectionId)) : null;
  if (byId) return byId;
  return le.name ? salesByTitle.get(normalizeTitle(le.name)) : null;
}

// ---------- Image map (for CSV mode: merge images into CSV records) ----------
function objectToImageMap(data) {
  const byId = new Map();
  const byTitle = new Map();
  if (data.byId) {
    Object.entries(data.byId).forEach(([k, v]) => {
      byId.set(k, v);
      if (/^\d+$/.test(k)) byId.set(Number(k), v);
    });
  }
  if (data.byTitle) Object.entries(data.byTitle).forEach(([k, v]) => byTitle.set(k, v));
  return { byId, byTitle };
}

async function fetchDisplateApiImageMap() {
  try {
    const res = await fetch(DISPLATE_API_URL);
    if (res.ok) {
      const json = await res.json();
      const byId = new Map();
      const byTitle = new Map();
      (json.data || []).forEach((item) => {
        const imageUrl = item.images?.main?.url || item.image?.url || item.thumbnail?.url || null;
        const leUrl = item.url ? `https://displate.com${item.url}` : `https://displate.com/limited-edition/displate/${item.itemCollectionId}`;
        const entry = { imageUrl, leUrl, title: item.title || '' };
        if (item.itemCollectionId != null) byId.set(Number(item.itemCollectionId), entry);
        if (item.id != null) byId.set(Number(item.id), entry);
        const t = normalizeTitle(item.title);
        if (t) byTitle.set(t, entry);
      });
      return { byId, byTitle };
    }
  } catch (_) {}
  try {
    const res = await fetch(LE_IMAGES_JSON);
    if (res.ok) return objectToImageMap(await res.json());
  } catch (_) {}
  return objectToImageMap({});
}

function mergeDisplateApiIntoRecords(records, apiMap) {
  const { byId, byTitle } = apiMap;
  records.forEach((rec) => {
    const id = rec.id != null ? Number(rec.id) : null;
    let api = id != null ? byId.get(id) : null;
    if (!api && rec.name) api = byTitle.get(normalizeTitle(rec.name));
    rec.imageUrl = api ? api.imageUrl : null;
    rec.leUrl = api ? api.leUrl : null;
  });
}

// ---------- Routing ----------
function getHashRoute() {
  const hash = (location.hash || '').replace(/^#/, '').replace(/^\/?/, '');
  const m = hash.match(/^le\/(\d+)/);
  if (m) return { view: 'product', id: m[1] };
  return { view: 'catalog' };
}

function showView(view) {
  const catalogEl = document.getElementById('catalog-view');
  const productEl = document.getElementById('product-view');
  if (catalogEl) catalogEl.hidden = view !== 'catalog';
  if (productEl) productEl.hidden = view !== 'product';
  if (view === 'product') window.scrollTo(0, 0);
}

// ---------- Catalog: insights (CSV mode) or API summary ----------
function updateMarketInsights() {
  const lastSalesEl = document.getElementById('insight-last-sales');
  const trendingEl = document.getElementById('insight-trending');
  const mostWantedEl = document.getElementById('insight-most-wanted');
  if (!lastSalesEl) return;

  if (USE_CSV && allRecords.length > 0) {
    const withResales = allRecords.filter((r) => r.resales > 0);
    const byLastSale = [...withResales].sort((a, b) => (parseDate(b.lastSale) || 0) - (parseDate(a.lastSale) || 0));
    const byHigh = [...withResales].sort((a, b) => (b.highPriceNum || 0) - (a.highPriceNum || 0));
    const byResales = [...withResales].sort((a, b) => b.resales - a.resales);
    lastSalesEl.textContent = withResales.length > 0 ? `${byLastSale.length} with sales` : '—';
    if (trendingEl) trendingEl.textContent = byHigh[0] ? formatPrice(byHigh[0].highPrice) : '—';
    if (mostWantedEl) mostWantedEl.textContent = byResales[0] ? `${byResales[0].name} (${byResales[0].resales})` : '—';
  } else {
    lastSalesEl.textContent = allRecords.length > 0 ? `${allRecords.length} editions` : '—';
    if (trendingEl) trendingEl.textContent = allRecords.length ? 'Live from API' : '—';
    if (mostWantedEl) mostWantedEl.textContent = allRecords.length ? 'Browse below' : '—';
  }
}

function populateArtistFilter() {
  const artists = [...new Set(allRecords.map((r) => r.artist).filter(Boolean))].sort();
  const sel = document.getElementById('filter');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="all">All</option>';
  artists.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    if (a === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function applySearchSortFilter() {
  const query = (document.getElementById('search') && document.getElementById('search').value) || '';
  const sortBy = (document.getElementById('sort') && document.getElementById('sort').value) || 'latest';
  const filterArtist = (document.getElementById('filter') && document.getElementById('filter').value) || 'all';

  let list = [...allRecords];
  if (filterArtist && filterArtist !== 'all') list = list.filter((r) => r.artist === filterArtist);
  const q = query.trim().toLowerCase();
  if (q) list = list.filter((r) => r.searchText && r.searchText.includes(q));

  if (sortBy === 'artist') list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
  else if (sortBy === 'high') list.sort((a, b) => (b.highPriceNum || 0) - (a.highPriceNum || 0));
  else if (sortBy === 'resales') list.sort((a, b) => (b.resales || 0) - (a.resales || 0));
  else list.sort((a, b) => (parseDate(b.releaseDate) || 0) - (parseDate(a.releaseDate) || 0));

  filteredRecords = list;
  renderCards(filteredRecords);
}

function renderCards(records) {
  const grid = document.getElementById('cards-grid');
  const loader = document.getElementById('loader');
  const countEl = document.getElementById('result-count');
  if (!grid) return;
  if (loader) loader.classList.add('hidden');
  grid.innerHTML = '';
  if (countEl) countEl.textContent = `${records.length} limited edition${records.length !== 1 ? 's' : ''}`;

  records.forEach((r) => {
    const id = r.itemCollectionId != null ? r.itemCollectionId : r.id;
    const hasPdp = id != null && id !== '';

    const li = document.createElement('div');
    li.className = 'card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image-wrap';
    if (r.imageUrl) {
      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = r.imageUrl;
      img.alt = r.name || 'Limited edition';
      img.loading = 'lazy';
      if (USE_CSV && r.leUrl) {
        const link = document.createElement('a');
        link.href = r.leUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'card-image-link';
        link.appendChild(img);
        imgWrap.appendChild(link);
      } else if (!USE_CSV && hasPdp) {
        const link = document.createElement('a');
        link.href = `#/le/${id}`;
        link.className = 'card-image-link';
        link.appendChild(img);
        imgWrap.appendChild(link);
      } else {
        imgWrap.appendChild(img);
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'card-placeholder';
      placeholder.textContent = r.name || `LE #${id}`;
      imgWrap.appendChild(placeholder);
    }
    li.appendChild(imgWrap);

    const body = document.createElement('div');
    body.className = 'card-body';
    if (!USE_CSV && hasPdp) {
      const cardLink = document.createElement('a');
      cardLink.href = `#/le/${id}`;
      cardLink.className = 'card-link-wrap';
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = r.name || r.title || `Limited Edition`;
      cardLink.appendChild(title);
      const meta = document.createElement('p');
      meta.className = 'card-meta';
      const edition = r.edition;
      const avail = edition && edition.size != null && edition.available != null
        ? `${edition.available} / ${edition.size} left`
        : edition && edition.size ? `Edition of ${edition.size}` : '';
      meta.textContent = [edition && edition.type, avail].filter(Boolean).join(' · ');
      cardLink.appendChild(meta);
      const cta = document.createElement('span');
      cta.className = 'card-cta';
      cta.textContent = 'View resale data →';
      cardLink.appendChild(cta);
      body.appendChild(cardLink);
    } else if (!USE_CSV && !hasPdp) {
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = r.name || r.title || 'Limited Edition';
      body.appendChild(title);
      const meta = document.createElement('p');
      meta.className = 'card-meta';
      meta.textContent = r.edition && r.edition.size ? `Edition of ${r.edition.size}` : '';
      body.appendChild(meta);
    } else {
      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = r.name || `Limited Edition ${r.number}`;
      body.appendChild(title);
      const meta = document.createElement('p');
      meta.className = 'card-meta';
      meta.textContent = [r.artist, r.number, r.quantity ? `Qty ${r.quantity}` : ''].filter(Boolean).join(' · ');
      body.appendChild(meta);
      const stats = document.createElement('div');
      stats.className = 'card-stats';
      if (r.cost) { const s = document.createElement('span'); s.className = 'card-stat'; s.innerHTML = `MSRP <strong>${r.cost}</strong>`; stats.appendChild(s); }
      if (r.highPrice) { const s = document.createElement('span'); s.className = 'card-stat high'; s.innerHTML = `High <strong>${r.highPrice}</strong>`; stats.appendChild(s); }
      if (r.avgPrice) { const s = document.createElement('span'); s.className = 'card-stat'; s.innerHTML = `Avg <strong>${r.avgPrice}</strong>`; stats.appendChild(s); }
      if (r.resales > 0) { const s = document.createElement('span'); s.className = 'card-stat'; s.innerHTML = `<strong>${r.resales}</strong> resales`; stats.appendChild(s); }
      if (r.lastSale) { const s = document.createElement('span'); s.className = 'card-stat'; s.textContent = `Last: ${r.lastSale}`; stats.appendChild(s); }
      body.appendChild(stats);
    }
    li.appendChild(body);
    grid.appendChild(li);
  });
}

// ---------- Product page ----------
function renderProductPage(id) {
  const le = allRecords.find((r) => String(r.itemCollectionId) === String(id) || String(r.id) === String(id));
  const article = document.getElementById('product-article');
  const backLink = document.getElementById('product-back-link');
  if (!article) return;
  if (backLink) backLink.href = '#';

  if (!le) {
    article.innerHTML = '<p class="sales-empty">Limited edition not found.</p>';
    showView('product');
    if (typeof document !== 'undefined' && document.title) document.title = 'Not found | Displate LE Value';
    return;
  }

  const pageTitle = (le.name || le.title || 'Limited Edition') + ' | Displate LE Value';
  if (typeof document !== 'undefined' && document.title) document.title = pageTitle;

  const sales = getSalesForLe(le);
  const edition = le.edition || {};
  const typeLabel = edition.type === 'ultra' ? 'Ultra Limited Edition' : 'Limited Edition';

  let html = `
    <div class="product-gallery">
      ${le.imageUrl ? `<img src="${le.imageUrl}" alt="${(le.name || le.title || '').replace(/"/g, '&quot;')}" />` : '<div class="card-placeholder" style="aspect-ratio:560/784;">' + (le.name || le.title || '') + '</div>'}
    </div>
    <div class="product-info">
      <h1>${(le.name || le.title || 'Limited Edition').replace(/</g, '&lt;')}</h1>
      <div class="product-edition">
        <span class="badge badge--${(edition.type || 'standard')}">${typeLabel}</span>
        ${edition.size != null ? `Edition of <strong>${edition.size}</strong>` : ''}
        ${edition.available != null && edition.size != null ? ` · <strong>${edition.available}</strong> left` : ''}
      </div>
      <div class="product-cta">
        <a href="${le.leUrl || '#'}" target="_blank" rel="noopener noreferrer">View on Displate →</a>
      </div>
      <section class="sales-section" aria-label="Secondary market">
        <h2>eBay &amp; secondary market</h2>
  `;

  if (sales && (sales.resales > 0 || sales.highPrice || sales.lastSale)) {
    const low = sales.lowPriceNum != null ? sales.lowPriceNum : (sales.avgPriceNum != null ? sales.avgPriceNum - 1 : 0);
    const high = sales.highPriceNum != null ? sales.highPriceNum : (sales.avgPriceNum != null ? sales.avgPriceNum + 1 : 100);
    const avg = sales.avgPriceNum != null ? sales.avgPriceNum : (low + high) / 2;
    const range = high - low || 1;
    const pctAvg = Math.max(0, Math.min(100, ((avg - low) / range) * 100));

    html += `
        <div class="sales-grid">
          ${sales.resales > 0 ? `<div class="sales-tile"><span class="sales-tile__value">${sales.resales}</span><span class="sales-tile__label">Resales</span></div>` : ''}
          ${sales.highPrice ? `<div class="sales-tile sales-tile--high"><span class="sales-tile__value">${formatPrice(sales.highPrice)}</span><span class="sales-tile__label">High</span></div>` : ''}
          ${sales.avgPrice ? `<div class="sales-tile"><span class="sales-tile__value">${formatPrice(sales.avgPrice)}</span><span class="sales-tile__label">Avg</span></div>` : ''}
          ${sales.lowPrice ? `<div class="sales-tile sales-tile--low"><span class="sales-tile__value">${formatPrice(sales.lowPrice)}</span><span class="sales-tile__label">Low</span></div>` : ''}
          ${sales.lastSale ? `<div class="sales-tile"><span class="sales-tile__value">${String(sales.lastSale).replace(/</g, '&lt;')}</span><span class="sales-tile__label">Last sale</span></div>` : ''}
        </div>
        <div class="price-range">
          <div class="price-range__label">Price range (eBay resales)</div>
          <div class="price-range__bar">
            <div class="price-range__segment price-range__segment--low" style="width:${pctAvg}%"></div>
            <div class="price-range__segment price-range__segment--high" style="width:${100 - pctAvg}%"></div>
          </div>
          <div class="price-range__legend">
            <span>${sales.lowPrice || '—'}</span>
            <span>${sales.avgPrice || '—'}</span>
            <span>${sales.highPrice || '—'}</span>
          </div>
        </div>
        <p class="sales-note">Reference data from eBay resales. Do not draw pricing conclusions.</p>
    `;
  } else {
    html += `
        <div class="sales-empty">
          <p>No resale data for this edition yet.</p>
          <p>When this piece is sold on eBay or other secondary markets, we’ll show high, low, and average prices here.</p>
        </div>
    `;
  }

  html += '</section></div>';
  article.innerHTML = html;
  showView('product');
}

function updateLocalTime() {
  const el = document.getElementById('local-time');
  if (el) el.textContent = new Date().toLocaleString();
}

function route() {
  const { view, id } = getHashRoute();
  if (view === 'product' && id) {
    renderProductPage(id);
  } else {
    showView('catalog');
    if (typeof document !== 'undefined' && document.title) document.title = 'Displate LE Value | Collect, Track & Share Limited Editions';
    applySearchSortFilter();
  }
}

async function loadData() {
  const loader = document.getElementById('loader');
  try {
    if (USE_CSV) {
      const [csvRes, apiMap] = await Promise.all([fetch(CSV_PATH), fetchDisplateApiImageMap()]);
      if (!csvRes.ok) throw new Error(`CSV HTTP ${csvRes.status}`);
      const rows = parseCSV(await csvRes.text());
      allRecords = buildRecordsFromCSV(rows);
      mergeDisplateApiIntoRecords(allRecords, apiMap);
    } else {
      const apiList = await fetchDisplateApiFull();
      allRecords = buildRecordsFromApi(apiList);
      await loadCSVForSales();
    }
    updateMarketInsights();
    if (USE_CSV) populateArtistFilter();
    filteredRecords = [...allRecords];
    route();
  } catch (e) {
    console.error('Failed to load data:', e);
    if (loader) {
      loader.textContent = USE_CSV
        ? 'Could not load data. Ensure the server is running and data/displates.csv exists.'
        : 'Could not load limited editions. Check connection and try again.';
      loader.classList.remove('hidden');
    }
    const grid = document.getElementById('cards-grid');
    if (grid) grid.innerHTML = '';
  }
}

function init() {
  updateLocalTime();
  setInterval(updateLocalTime, 10000);

  const searchEl = document.getElementById('search');
  const sortEl = document.getElementById('sort');
  const filterEl = document.getElementById('filter');
  if (searchEl) searchEl.addEventListener('input', applySearchSortFilter);
  if (sortEl) sortEl.addEventListener('change', applySearchSortFilter);
  if (filterEl) filterEl.addEventListener('change', applySearchSortFilter);

  window.addEventListener('hashchange', route);
  document.getElementById('product-back-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = '';
  });

  loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
