#!/usr/bin/env node
/**
 * Fetches Displate LE data from the API and writes webapp/data/le-images.json.
 * Run from repo root: node webapp/scripts/fetch-le-images.js
 * Use this to refresh images for the static site (avoids CORS on GitHub Pages).
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://sapi.displate.com/artworks/limited';
const OUT_PATH = path.join(__dirname, '../data/le-images.json');

function normalizeTitle(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function main() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  const data = json.data || [];

  const byId = {};
  const byTitle = {};

  data.forEach((item) => {
    const imageUrl =
      item.images?.main?.url ||
      item.image?.url ||
      item.thumbnail?.url ||
      null;
    const leUrl = item.url
      ? `https://displate.com${item.url}`
      : `https://displate.com/limited-edition/displate/${item.itemCollectionId}`;
    const entry = { imageUrl, leUrl, title: item.title || '' };

    if (item.itemCollectionId != null) {
      byId[String(item.itemCollectionId)] = entry;
    }
    if (item.id != null) {
      byId[String(item.id)] = entry;
    }
    const t = normalizeTitle(item.title);
    if (t) byTitle[t] = entry;
  });

  const out = { byId, byTitle };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 0), 'utf8');
  console.log(`Wrote ${OUT_PATH} (${Object.keys(byId).length} ids, ${Object.keys(byTitle).length} titles)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
