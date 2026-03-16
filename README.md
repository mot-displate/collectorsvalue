# Metalposters / Displate LE Value

Showcase **Displate limited editions** value to collectors: a small web app (design inspired by MetalPosters.net) plus a browser extension for Displate’s site.

## Contents

- **`webapp/`** – Static site: hero, market insights, searchable/sortable grid of LEs. Data from CSV + images from Displate API. **Deployed to GitHub Pages** when you push to `main`.
- **`displate-inventory-extension/`** – Browser extension that shows stock/availability on [displate.com/limited-edition](https://displate.com/limited-edition).
- **`Displate Limited Edition Information - Displates.csv`** – Source for resale/market data (copied into `webapp/data/displates.csv` for the app).

## Deploy to GitHub (mot-displate)

1. **Create a new repository** on GitHub under the account **mot-displate**  
   - Go to [github.com/new](https://github.com/new) (logged in as mot-displate).  
   - Name it e.g. `Metalposters` or `displate-le-value`.  
   - Do **not** add a README, .gitignore, or license (this repo already has them).

2. **Push this project** from your machine (repo is already initialized and committed):

   ```bash
   cd /Users/nicola.paganelli/Desktop/Apps/Metalposters

   git remote add origin https://github.com/mot-displate/Metalposters.git
   git push -u origin main
   ```

   Replace `Metalposters` with your actual repo name if you chose a different one (e.g. `displate-le-value`).

3. **Enable GitHub Pages**  
   - Repo **Settings** → **Pages**.  
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.  
   - After the next push (or a re-run of the workflow), the site will be at:  
     **https://mot-displate.github.io/Metalposters/**  
     (or `https://mot-displate.github.io/<your-repo-name>/`).

## Live eBay data on product pages

Product pages can show **live eBay sold items** (count, average/min/max price, recent listings) via the [eBay sold-items API on RapidAPI](https://github.com/colindaniels/eBay-sold-items-documentation). The app uses a small **serverless proxy** so the RapidAPI key is never exposed in the browser.

1. **Get a RapidAPI key**  
   Subscribe to the “eBay Average Selling Price” (or sold items) API on [RapidAPI](https://rapidapi.com/) and copy your key.

2. **Deploy the API**  
   Deploy this repo to **Vercel** (or any host that runs the `api/` serverless functions). In the project’s **Environment variables**, set:
   - `RAPIDAPI_KEY` = your RapidAPI key  

   The proxy is at `POST /api/ebay-sold` (see `api/ebay-sold.js`).

3. **Use it from the webapp**  
   - If the **webapp is served from the same origin** as the API (e.g. full app deployed on Vercel), nothing else is needed; the app will call `/api/ebay-sold` on the same host.  
   - If the app is on **GitHub Pages** (or another origin), set the API base URL before the app loads, e.g. in `index.html`:
     ```html
     <script>window.__EBAY_API_BASE__ = 'https://your-vercel-project.vercel.app';</script>
     <script src="app.js"></script>
     ```
     Then the app will request `https://your-vercel-project.vercel.app/api/ebay-sold`.

Without the API (or if the key is missing), the product page still shows CSV-based resale data when available, and the “Live eBay sold items” section will show “Live eBay data not available”.

## Run the webapp locally

```bash
cd webapp
npx serve . -p 3333
```

Then open http://localhost:3333. See `webapp/README.md` for more options.

## Extension development

```bash
cd displate-inventory-extension
nvm use
npm install
npm run watch
```

Load the `dist` folder as an unpacked extension in Chrome or Firefox.

---

This project is not affiliated with Displate or MetalPosters.net.
