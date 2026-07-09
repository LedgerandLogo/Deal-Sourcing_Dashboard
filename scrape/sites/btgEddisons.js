/**
 * BTG EDDISONS PROPERTY AUCTIONS (formerly SDL / Pugh / Mark Jenkinson)
 * https://www.btgeddisonspropertyauctions.com/properties
 *
 * SELECTOR STATUS: UNVERIFIED — same caveat as allsop.js. This is a brand
 * new site (Feb 2026 rebrand) so there's no prior scraping pattern to lean
 * on. Run npm run inspect locally and correct selectors against the real
 * rendered HTML before trusting this in production.
 */
export async function scrapeBtgEddisons(page) {
  await page.goto('https://www.btgeddisonspropertyauctions.com/properties', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(2000);

  const cardSelector = '.property-card, .listing-card, [class*="PropertyCard"]';
  await page.waitForSelector(cardSelector, { timeout: 15000 }).catch(() => {
    console.warn('[btg-eddisons] no cards matched — selector likely needs updating, see scrape/inspect.js');
  });

  const lots = await page.$$eval(cardSelector, (cards) =>
    cards.map((card) => {
      const text = (sel) => card.querySelector(sel)?.textContent?.trim() || null;
      const href = card.querySelector('a')?.getAttribute('href') || null;

      return {
        address: text('.address, [class*="address"], h3, h2'),
        guide_price_text: text('.guide-price, [class*="price"], [class*="guide"]'),
        auction_type: text('.auction-type, [class*="type"]'),
        source_url: href
      };
    })
  );

  return lots
    .filter((l) => l.address && l.source_url)
    .map((l) => ({
      address: l.address,
      postcode: extractPostcode(l.address),
      guide_price: parsePrice(l.guide_price_text),
      status: 'available',
      source: 'BTG Eddisons',
      source_url: normaliseUrl(l.source_url, 'https://www.btgeddisonspropertyauctions.com'),
      auction_type: l.auction_type,
      scraped_at: new Date().toISOString()
    }));
}

function extractPostcode(text) {
  if (!text) return null;
  const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase() : null;
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/£?\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function normaliseUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
