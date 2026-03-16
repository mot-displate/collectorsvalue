/**
 * Displate LE Value – MetalPosters.net-style app
 * Loads CSV + Displate API (same as displate-inventory-extension) for images.
 * Renders grid, search, sort, filter, market insights.
 */

const CSV_PATH = 'data/displates.csv';
const DISPLATE_API_URL = 'https://sapi.displate.com/artworks/limited';

// CSV parse that handles quoted fields with commas
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += c;
    }
  }
  if (current.trim()) lines.push(current);

  function splitRow(row) {
    const out = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        out.push(cell.trim());
        cell = '';
      } else {
        cell += c;
      }
    }
    out.push(cell.trim());
    return out;
  }

  return lines.map((line) => splitRow(line));
}

function parsePrice(str) {
  if (!str || str === '—' || str === '') return null;
  const num = str.replace(/[$,]/g, '');
  const n = parseFloat(num);
  return isNaN(n) ? null : n;
}

function parseNum(str) {
  if (str == null || str === '') return null;
  const n = parseInt(String(str).replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}

// Build records from CSV rows (skip meta row 0, header row 1)
function buildRecords(rows) {
  if (rows.length < 2) return [];
  const headers = rows[1].map((h) => h.trim());
  const records = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const rec = {};
    headers.forEach((h, j) => {
      rec[h] = row[j] != null ? String(row[j]).trim() : '';
    });
    // Normalize keys (handle "Name / Link" etc.)
    const id = parseNum(rec['ID']) || rec['ID'];
    const name = rec['Name / Link'] || rec['Name'] || '';
    const artist = rec['Artist'] || '';
    const quantity = parseNum(rec['Quantity']) || 0;
    const cost = rec['Cost'] || '';
    const number = rec['Number'] || '';
    const resales = parseNum(rec['# Resales']) || 0;
    const highPrice = rec['High Price'] || '';
    const avgPrice = rec['Avg Price'] || '';
    const lowPrice = rec['Low Price'] || '';
    const totalSales = rec['Total Sales'] || '';
    const lastSale = rec['Last Sale'] || '';
    const releaseDate = rec['Release Date'] || '';

    records.push({
      id: id,
      releaseDate,
      name,
      artist,
      quantity,
      cost,
      number,
      resales,
      highPrice,
      highPriceNum: parsePrice(highPrice),
      avgPrice,
      avgPriceNum: parsePrice(avgPrice),
      lowPrice,
      lowPriceNum: parsePrice(lowPrice),
      totalSales,
      lastSale,
      searchText: `${name} ${artist} ${number}`.toLowerCase(),
    });
  }
  return records;
}

/**
 * Fetch limited editions from Displate API (same endpoint as displate-inventory-extension).
 * Returns { byId: Map(id -> { imageUrl, leUrl, title }), byTitle: Map(normalizedTitle -> entry) }.
 */
function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchDisplateApiImageMap() {
  const byId = new Map();
  const byTitle = new Map();
  try {
    const res = await fetch(DISPLATE_API_URL);
    if (!res.ok) return { byId, byTitle };
    const json = await res.json();
    const data = json.data || [];
    data.forEach((item) => {
      const imageUrl =
        item.images?.main?.url ||
        item.image?.url ||
        item.thumbnail?.url;
      const leUrl = item.url
        ? `https://displate.com${item.url}`
        : `https://displate.com/limited-edition/displate/${item.itemCollectionId}`;
      const entry = {
        imageUrl: imageUrl || null,
        leUrl,
        title: item.title || '',
      };
      if (item.itemCollectionId != null) {
        byId.set(Number(item.itemCollectionId), entry);
      }
      if (item.id != null) {
        byId.set(Number(item.id), entry);
      }
      const t = normalizeTitle(item.title);
      if (t) byTitle.set(t, entry);
    });
  } catch (e) {
    console.warn('Displate API fetch failed (images may be missing):', e);
  }
  return { byId, byTitle };
}

let allRecords = [];
let filteredRecords = [];

function updateLocalTime() {
  const el = document.getElementById('local-time');
  if (el) el.textContent = new Date().toLocaleString();
}

function updateMarketInsights() {
  const withResales = allRecords.filter((r) => r.resales > 0);
  const byLastSale = [...withResales].sort((a, b) => {
    const da = parseDate(b.lastSale);
    const db = parseDate(a.lastSale);
    return (da || 0) - (db || 0);
  });
  const byHigh = [...withResales].sort((a, b) => (b.highPriceNum || 0) - (a.highPriceNum || 0));
  const byResales = [...withResales].sort((a, b) => b.resales - a.resales);

  const lastSalesEl = document.getElementById('insight-last-sales');
  const trendingEl = document.getElementById('insight-trending');
  const mostWantedEl = document.getElementById('insight-most-wanted');

  if (lastSalesEl) lastSalesEl.textContent = withResales.length > 0 ? `${byLastSale.length} with sales` : '—';
  if (trendingEl) trendingEl.textContent = byHigh[0] ? formatPrice(byHigh[0].highPrice) : '—';
  if (mostWantedEl) mostWantedEl.textContent = byResales[0] ? `${byResales[0].name} (${byResales[0].resales})` : '—';
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function formatPrice(str) {
  return str || '—';
}

function renderCards(records) {
  const grid = document.getElementById('cards-grid');
  const loader = document.getElementById('loader');
  const countEl = document.getElementById('result-count');

  if (!grid) return;
  if (loader) loader.classList.add('hidden');

  grid.innerHTML = '';
  grid.setAttribute('role', 'list');

  if (countEl) countEl.textContent = `${records.length} limited edition${records.length !== 1 ? 's' : ''}`;

  records.forEach((r) => {
    const li = document.createElement('div');
    li.className = 'card';
    li.setAttribute('role', 'listitem');

    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-image-wrap';
    if (r.imageUrl) {
      const img = document.createElement('img');
      img.className = 'card-image';
      img.src = r.imageUrl;
      img.alt = r.name || 'Limited edition';
      img.loading = 'lazy';
      if (r.leUrl) {
        const link = document.createElement('a');
        link.href = r.leUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'card-image-link';
        link.appendChild(img);
        imgWrap.appendChild(link);
      } else {
        imgWrap.appendChild(img);
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'card-placeholder';
      placeholder.textContent = r.name || `LE #${r.id}`;
      imgWrap.appendChild(placeholder);
    }
    li.appendChild(imgWrap);

    const body = document.createElement('div');
    body.className = 'card-body';
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
    if (r.cost) {
      const costSpan = document.createElement('span');
      costSpan.className = 'card-stat';
      costSpan.innerHTML = `MSRP <strong>${r.cost}</strong>`;
      stats.appendChild(costSpan);
    }
    if (r.highPrice) {
      const highSpan = document.createElement('span');
      highSpan.className = 'card-stat high';
      highSpan.innerHTML = `High <strong>${r.highPrice}</strong>`;
      stats.appendChild(highSpan);
    }
    if (r.avgPrice) {
      const avgSpan = document.createElement('span');
      avgSpan.className = 'card-stat';
      avgSpan.innerHTML = `Avg <strong>${r.avgPrice}</strong>`;
      stats.appendChild(avgSpan);
    }
    if (r.resales > 0) {
      const resSpan = document.createElement('span');
      resSpan.className = 'card-stat';
      resSpan.innerHTML = `<strong>${r.resales}</strong> resales`;
      stats.appendChild(resSpan);
    }
    if (r.lastSale) {
      const lastSpan = document.createElement('span');
      lastSpan.className = 'card-stat';
      lastSpan.textContent = `Last: ${r.lastSale}`;
      stats.appendChild(lastSpan);
    }
    body.appendChild(stats);
    li.appendChild(body);
    grid.appendChild(li);
  });
}

function applySearchSortFilter() {
  const query = (document.getElementById('search') && document.getElementById('search').value) || '';
  const sortBy = (document.getElementById('sort') && document.getElementById('sort').value) || 'latest';
  const filterArtist = (document.getElementById('filter') && document.getElementById('filter').value) || 'all';

  let list = [...allRecords];

  if (filterArtist && filterArtist !== 'all') {
    list = list.filter((r) => r.artist === filterArtist);
  }

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((r) => r.searchText.includes(q));
  }

  if (sortBy === 'artist') {
    list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
  } else if (sortBy === 'high') {
    list.sort((a, b) => (b.highPriceNum || 0) - (a.highPriceNum || 0));
  } else if (sortBy === 'resales') {
    list.sort((a, b) => b.resales - a.resales);
  } else {
    list.sort((a, b) => parseDate(b.releaseDate) - parseDate(a.releaseDate));
  }

  filteredRecords = list;
  renderCards(filteredRecords);
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

function mergeDisplateApiIntoRecords(records, apiMap) {
  const { byId, byTitle } = apiMap;
  records.forEach((rec) => {
    const id = rec.id != null ? Number(rec.id) : null;
    let api = id != null ? byId.get(id) : null;
    if (!api && rec.name) {
      api = byTitle.get(normalizeTitle(rec.name));
    }
    if (api) {
      rec.imageUrl = api.imageUrl;
      rec.leUrl = api.leUrl;
    } else {
      rec.imageUrl = null;
      rec.leUrl = null;
    }
  });
}

async function loadData() {
  const loader = document.getElementById('loader');
  try {
    const [csvRes, apiMap] = await Promise.all([
      fetch(CSV_PATH),
      fetchDisplateApiImageMap(),
    ]);
    if (!csvRes.ok) throw new Error(`CSV HTTP ${csvRes.status}`);
    const text = await csvRes.text();
    const rows = parseCSV(text);
    allRecords = buildRecords(rows);
    mergeDisplateApiIntoRecords(allRecords, apiMap);
    updateMarketInsights();
    populateArtistFilter();
    applySearchSortFilter();
  } catch (e) {
    console.error('Failed to load data:', e);
    if (loader) {
      loader.textContent = 'Could not load data. Ensure the server is running and data/displates.csv exists.';
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

  loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
