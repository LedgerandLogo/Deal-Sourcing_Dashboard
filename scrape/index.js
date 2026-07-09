import { chromium } from 'playwright';
import { scrapeAllsop } from './sites/allsop.js';
import { scrapeBtgEddisons } from './sites/btgEddisons.js';
import { scrapeSavills } from './sites/savills.js';
import { insertNewDeals } from './supabase.js';

const SCRAPERS = [
  { name: 'Allsop', fn: scrapeAllsop },
  { name: 'BTG Eddisons', fn: scrapeBtgEddisons },
  { name: 'Savills', fn: scrapeSavills }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const summary = [];

  for (const { name, fn } of SCRAPERS) {
    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    });

    try {
      console.log(`Scraping ${name}...`);
      const lots = await fn(page);
      console.log(`  found ${lots.length} lot(s)`);

      const result = await insertNewDeals(lots);
      console.log(`  inserted ${result.inserted}, skipped ${result.skipped} (already known)`);
      if (result.errors.length) console.error(`  errors:`, result.errors);

      summary.push({ source: name, found: lots.length, ...result });
    } catch (err) {
      console.error(`  ${name} failed:`, err.message);
      summary.push({ source: name, found: 0, inserted: 0, skipped: 0, errors: [err.message] });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log('\n=== Daily scrape summary ===');
  console.table(summary.map(s => ({
    Source: s.source,
    Found: s.found,
    'New (inserted)': s.inserted,
    'Already known': s.skipped,
    Errors: s.errors.length
  })));

  const totalErrors = summary.reduce((acc, s) => acc + s.errors.length, 0);
  if (totalErrors > 0) {
    console.error(`\n${totalErrors} site(s) had errors — check selectors with "npm run inspect".`);
    process.exitCode = 1;
  }
}

run();
