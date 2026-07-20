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
    console.warn('[savills] page URL was:', page.url());
    console.warn('[savills] html length:', html.length);
    console.warn('[savills] contains "guide_price"?', html.includes('guide_price'));
    console.warn('[savills] contains "map_locations"?', html.includes('map_locations'));
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
    console.warn('[savills] failed to parse embedded lot JSON:',
