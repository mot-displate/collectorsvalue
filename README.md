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

2. **Push this project** from your machine:

   ```bash
   cd /Users/nicola.paganelli/Desktop/Apps/Metalposters

   git init
   git add .
   git commit -m "Initial commit: webapp + displate-inventory-extension"

   git branch -M main
   git remote add origin https://github.com/mot-displate/Metalposters.git
   git push -u origin main
   ```

   (Replace `Metalposters` with your repo name if different.)

3. **Enable GitHub Pages**  
   - Repo **Settings** → **Pages**.  
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.  
   - After the next push (or a re-run of the workflow), the site will be at:  
     **https://mot-displate.github.io/Metalposters/**  
     (or `https://mot-displate.github.io/<your-repo-name>/`).

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
