# Displate LE Value – Web App

A small web app that showcases **Displate limited editions** value to collectors, with a layout and feel similar to [MetalPosters.net](https://www.metalposters.net/home).

## Features

- **API-driven catalog** (default): LEs from the **Displate API** (same as `displate-inventory-extension`). **Product page** per LE (`#/le/123`) with image, edition info, and **eBay / secondary market** section (resales, high/avg/low, last sale, price-range bar). Sales data is merged from the optional CSV when available.
- **Feature flag `USE_CSV`** in `app.js`: set to `true` to restore the original CSV-driven grid and insights; CSV code is kept but unused when `false`.
- **Search**, **Sort**, **Filter**. Dark theme (Displate design system).

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
