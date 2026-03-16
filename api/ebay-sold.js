/**
 * Proxy for eBay sold items API (RapidAPI).
 * See: https://github.com/colindaniels/eBay-sold-items-documentation
 *
 * Deploy to Vercel and set env var: RAPIDAPI_KEY (your key from RapidAPI).
 * Request: POST /api/ebay-sold with body { keywords, max_search_results? (60|120|240), excluded_keywords? }
 */

const RAPIDAPI_URL = 'https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    res.status(500).json({ success: false, error: 'RAPIDAPI_KEY not configured' });
    return;
  }

  const { keywords, max_search_results = 60, excluded_keywords } = req.body || {};
  if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
    res.status(400).json({ success: false, error: 'keywords required' });
    return;
  }

  const allowed = [60, 120, 240];
  const limit = allowed.includes(Number(max_search_results)) ? Number(max_search_results) : 60;

  const body = {
    keywords: keywords.trim(),
    max_search_results: limit,
  };
  if (excluded_keywords && typeof excluded_keywords === 'string') {
    body.excluded_keywords = excluded_keywords.trim();
  }

  try {
    const response = await fetch(RAPIDAPI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'ebay-average-selling-price.p.rapidapi.com',
        'x-rapidapi-key': key,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ success: false, error: String(e.message || 'Upstream error') });
  }
}
