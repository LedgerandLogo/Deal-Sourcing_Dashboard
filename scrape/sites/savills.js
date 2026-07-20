/**
 * SAVILLS AUCTIONS
 * https://auctions.savills.co.uk/upcoming-auctions
 *
 * Savills embeds lot data as a JSON string inside an inline script
 * (map_locations: JSON.parse('[...]')) rather than rendering individual
 * card elements we can select. We extract and parse that string directly.
 */
export async function scrapeSavills(page) {
  await page.goto('https://auctions.savills.co.uk/upcoming-auctions', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  const html = await page.content();

  const match = html.match(/map_locations:\s*JSON\.parse\('([\s\S]*?)'\)/);
  if (!match) {
    console.warn('[savills] could not find embedded lot data — page structure may have changed');
    return [];
  }

  let jsonString = match[1];
  jsonString = jsonString
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '');

  let rawLots;
  try {
    rawLots = JSON.parse(jsonString);
  } catch (err) {
    console.warn('[savills] failed to parse embedded lot JSON:', err.message);
    return [];
  }

  return rawLots
    .filter((l) => l.name && l.id)
    .map((l) => ({
      address: l.name,
      postcode:
        l.address_post_code_1 && l.address_post_code_2
          ? `${l.address_post_code_1} ${l.address_post_code_2}`
          : extractPostcode(l.name),
      guide_price: parsePrice(l.guide_price),
      status: l.sold === '1' ? 'sold' : l.withdrawn === '1' ? 'withdrawn' : 'available',
      source: 'Savills',
      source_url: l.sefURL ? normaliseUrl(l.sefURL, 'https://auctions.savills.co.uk') : null,
      auction_lot_number: l.total_lot_number,
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
  const match = String(text).replace(/,/g, '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function normaliseUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
