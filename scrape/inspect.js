/**
 * ONE-TIME HELPER — not part of the daily scrape.
 *
 * All three auction sites render listings with JavaScript, so the CSS
 * selectors in scrape/sites/*.js are best-effort placeholders that need to
 * be checked against the real, rendered page before the scraper will work
 * reliably. This script opens each site with a real (visible) browser,
 * waits for content to load, then saves a full-page screenshot and the
 * rendered HTML into ./inspect-output/
 *
 * Run locally (not in GitHub Actions):
 *   npm install
 *   npx playwright install chromium
 *   npm run inspect
 *
 * Then either eyeball the HTML yourself, or paste a snippet of the listing
 * card markup back to Claude to get the selectors in scrape/sites/*.js corrected.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const targets = [
  { name: 'allsop', url: 'https://www.allsop.co.uk/residential-auction-view' },
  { name: 'btg-eddisons', url: 'https://www.btgeddisonspropertyauctions.com/properties' },
  { name: 'savills', url: 'https://auctions.savills.co.uk/upcoming-auctions' }
];

fs.mkdirSync('./inspect-output', { recursive: true });

const browser = await chromium.launch({ headless: false });

for (const target of targets) {
  console.log(`Loading ${target.name}...`);
  const page = await browser.newPage();
  try {
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `./inspect-output/${target.name}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`./inspect-output/${target.name}.html`, html);
    console.log(`  saved inspect-output/${target.name}.png and .html`);
  } catch (err) {
    console.error(`  failed on ${target.name}:`, err.message);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log('Done. Open the .png files to see what rendered, and .html to find real selectors.');
