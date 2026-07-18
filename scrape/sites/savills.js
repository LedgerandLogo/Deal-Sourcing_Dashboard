/**
 * SAVILLS AUCTIONS
 * https://auctions.savills.co.uk/upcoming-auctions
 *
 * SELECTOR STATUS: UNVERIFIED — same caveat as the other two modules.
 * Savills' listings may be organised by individual auction event rather than
 * one flat list — worth checking during npm run inspect whether this page
 * needs a second click-through step (auction event -> lot list) rather than
 * a single scrape.
 */
export async function scrapeSavills(page) {
  await page.goto('https://auctions.savills.co.uk/upcoming-auctions', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForTimeout(2000);

  const cardSelector = '[class*="sv-property-card"]';
  await page.waitForSelector(cardSelector, { timeout: 15000 }).catch(() => {
    console.warn('[savills] no cards matched — selector likely needs updating, see scrape/inspect.js');
  });

  const lots = await page.$$eval(cardSelector, (cards) =>
    cards.map((card) => {
      const text = (sel) => card.querySelector(sel)?.textContent?.trim() || null;
      const href = card.querySelector('a')?.getAttribute('href') || null;

      return {
        address: text('.address, [class*="address"], h3, h2'),
        guide_price_text: text('.price, [class*="price"], [class*="guide"]'),
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
      source: 'Savills',
      source_url: normaliseUrl(l.source_url, 'https://auctions.savills.co.uk'),
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
