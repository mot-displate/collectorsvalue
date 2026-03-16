# Displate LE Value – Web App

A small web app that showcases **Displate limited editions** value to collectors, with a layout and feel similar to [MetalPosters.net](https://www.metalposters.net/home).

## Features

- **Home** hero and **Market Insights** (Last Sales, Trending Highs, Most Wanted)
- **Search** by title, artist, or brand
- **Sort** by Latest, Brand/Artist, High Price, or Most Resales
- **Filter** by artist
- **Grid** of limited editions from `data/displates.csv` (market data) and **images** from the **Displate API** (same as `displate-inventory-extension`: `https://sapi.displate.com/artworks/limited`)
- Cards show images when the CSV row matches an API item (by ID or by title); otherwise a text placeholder is shown. Clicking the image opens the LE page on Displate.
- Dark theme and typography aligned with the Displate design system

## Run locally

Serve the `webapp` folder over HTTP (required so the CSV can be loaded via `fetch`).

**Option 1 – npx serve (Node)**

```bash
cd webapp
npx serve .
```

Then open **http://localhost:3000** (or the URL shown).

**Option 2 – Python**

```bash
cd webapp
python3 -m http.server 8080
```

Then open **http://localhost:8080**.

## Data

- **CSV**: `data/displates.csv` is a copy of the project’s **Displate Limited Edition Information - Displates.csv**. The app reads: ID, Release Date, Name, Quantity, Cost, Artist, Number, # Resales, High/Avg/Low Price, Total Sales, Last Sale.
- **Images**: Loaded from **`data/le-images.json`** (same-origin, so images work on GitHub Pages). That file is a snapshot from `https://sapi.displate.com/artworks/limited`. To refresh it, run from the repo root: `node webapp/scripts/fetch-le-images.js`, then commit the updated `webapp/data/le-images.json`.

## Disclaimer

This app is for showcasing Displate limited edition value to collectors. It is not an official Displate or MetalPosters.net product.
