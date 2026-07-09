/**
 * ALLSOP — residential auction catalogue
 * https://www.allsop.co.uk/residential-auction-view
 *
 * SELECTOR STATUS: UNVERIFIED. Allsop's catalogue is a JS-rendered app —
 * it could not be inspected from the build environment. The selectors below
 * are a reasonable first guess based on typical listing-card markup, but
 * WILL likely need correcting. Run npm run inspect locally, open
 * inspect-output/allsop.html, and adjust the selectors in this file to
 * match the real DOM before relying on this in production.
 */
export async function scrapeAllsop(page) {
  await page.goto('https://www.allsop.co.uk/residential-auction-view', {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForTimeout(2000);

  const cardSelector = '.lot-card, .property-card, [class*="LotCard"]';
  await page.waitForSelector(cardSelector, { timeout: 15000 }).catch(() => {
    console.warn('[allsop] no cards matched — selector likely needs updating, see scrape/inspect.js');
  });

  const lots = await page.$$eval(cardSelector, (cards) =>
    cards.map((card) => {
      const text = (sel) => card.querySelector(sel)?.textContent?.trim() || null;
      const href = card.querySelector('a')?.getAttribute('href') || null;

      return {
        address: text('.lot-address, [class*="address"], h3, h2'),
        guide_price_text: text('.lot-price, [class*="price"], [class*="guide"]'),
        lot_number: text('.lot-number, [class*="lotNumber"]'),
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
      source: 'Allsop',
      source_url: normaliseUrl(l.source_url, 'https://www.allsop.co.uk'),
      auction_lot_number: l.lot_number,
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
