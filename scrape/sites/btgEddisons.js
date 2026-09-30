/**
 * BTG EDDISONS PROPERTY AUCTIONS (formerly SDL / Pugh / Mark Jenkinson)
 * https://www.btgeddisonspropertyauctions.com/properties
 *
 * SELECTOR STATUS: VERIFIED against rendered HTML saved on 30 Sep 2026
 * (npm run inspect). Each listing is a [data-listing-tile] card with a real
 * per-lot link (a[href*="/properties/"]) and the full address in its aria-label.
 *
 * The site has ~550 listings over 60+ pages at 9 per page. To keep the daily run
 * quick and polite we read the first MAX_PAGES pages (default sort = by date).
 * Raise MAX_PAGES if you want deeper coverage.
 *
 * Columns written match the Supabase `deals` table exactly (same as Savills).
 */
const BASE = 'https://www.btgeddisonspropertyauctions.com';
const LIST_URL = `${BASE}/properties`;
const TILE = '[data-listing-tile]';
const MAX_PAGES = 8;

export async function scrapeBtgEddisons(page) {
  const all = [];
  const seen = new Set();

  for (let p = 1; p <= MAX_PAGES; p++) {
    await page.goto(`${LIST_URL}?page=${p}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    const found = await page
      .waitForSelector(TILE, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      if (p === 1) {
        console.warn('[btg-eddisons] no listings matched on page 1 — selector or page layout changed, re-run npm run inspect');
      }
      break;
    }
    await page.waitForTimeout(1500);

    const tiles = await page.$$eval(TILE, (nodes) =>
      nodes.map((tile) => {
        const link = tile.querySelector('a[href*="/properties/"]');
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const paras = Array.from(tile.querySelectorAll('p')).map((el) => clean(el.textContent));
        return {
          address: clean(link?.getAttribute('aria-label')),
          href: link?.href || null,
          lot_number: paras.find((t) => /^\d+[A-Z]?$/i.test(t)) || null,
          price_text: paras.filter((t) => t.includes('£')).join(' ') || null,
          auction_format: clean(tile.querySelector('.bg-brand-blue span.font-bold')?.textContent) || null
        };
      })
    );

    let newOnThisPage = 0;
    for (const t of tiles) {
      if (!t.address || !t.href || seen.has(t.href)) continue;
      seen.add(t.href);
      newOnThisPage++;

      const isBuyNow = /available for/i.test(t.price_text || '');
      const notes = [
        t.auction_format,
        t.lot_number ? `Lot ${t.lot_number}` : null
      ].filter(Boolean).join(' | ');

      all.push({
        source: 'BTG Eddisons',
        address: t.address,
        postcode: extractPostcode(t.address),
        asking_price: parsePrice(t.price_text),
        guide_price_text: t.price_text,
        auction_type: t.auction_format || 'Auction',
        price_type: isBuyNow ? 'Available For' : 'Guide Price',
        source_url: t.href,
        notes,
        status: 'available',
        stage: 'lead'
      });
    }

    if (newOnThisPage === 0) break;
  }

  console.log(`[btg-eddisons] scraped ${all.length} lots`);
  return all;
}

function extractPostcode(text) {
  if (!text) return null;
  const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase() : null;
}

// "Guide Price: £185,000+" -> 185000 ; "Available for £175,000" -> 175000
function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/£\s*(\d+)/);
  return match ? Number(match[1]) : null;
}
