/**
 * ALLSOP — residential auction catalogue
 * https://www.allsop.co.uk/property-search
 *
 * SELECTOR STATUS: VERIFIED against rendered HTML saved on 30 Sep 2026
 * (npm run inspect). Card class is ".__lot_container" (NOT "__lot_container__").
 *
 * Allsop cards have no per-lot URL in the DOM (every "View Lot" link is just
 * "lot-overview"), so source_url is a synthetic but stable key built from the
 * lot reference + postcode. It opens the search page, not the individual lot.
 *
 * Columns written match the Supabase `deals` table exactly (same as Savills).
 */
const BASE = 'https://www.allsop.co.uk';
const SEARCH_URL = `${BASE}/property-search?available_only=true&lot_type=residential&view=list`;
const CARD = '.__lot_container';
const MAX_PAGES = 10;

export async function scrapeAllsop(page) {
  const all = [];
  const seen = new Set();

  for (let p = 1; p <= MAX_PAGES; p++) {
    await page.goto(`${SEARCH_URL}&page=${p}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    const found = await page
      .waitForSelector(CARD, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);

    if (!found) {
      if (p === 1) {
        console.warn('[allsop] no cards matched on page 1 — selector or page layout changed, re-run npm run inspect');
      }
      break;
    }
    await page.waitForTimeout(1500);

    const cards = await page.$$eval(CARD, (nodes) =>
      nodes.map((card) => {
        const text = (sel) => card.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() || null;
        return {
          ref: card.querySelector('.__lot_image')?.getAttribute('title') || null,
          address: text('.__lot_address'),
          price_text: text('.__lot_price'),
          headline: text('.__info_header h4'),
          features: Array.from(card.querySelectorAll('.__list_feature'))
            .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
            .filter(Boolean),
          date_text: text('.__date'),
          tenure_note: text('.__rentValueText')
        };
      })
    );

    let newOnThisPage = 0;
    for (const c of cards) {
      if (!c.address) continue;
      const postcode = extractPostcode(c.address);
      const key = `${c.ref || ''}|${postcode || c.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      newOnThisPage++;

      const priceDigits = parsePrice(c.price_text);
      const notes = [c.headline, c.tenure_note, ...c.features].filter(Boolean).join(' | ');

      all.push({
        source: 'Allsop',
        address: c.address,
        postcode,
        asking_price: priceDigits,
        guide_price_text: c.price_text,
        auction_date_text: c.date_text,
        auction_type: 'Auction',
        price_type: 'Guide Price',
        source_url: `${BASE}/property-search#${encodeURIComponent(key)}`,
        notes,
        status: 'available',
        stage: 'lead'
      });
    }

    // Stop if a page adds nothing new (guards against the site repeating the last page)
    if (newOnThisPage === 0) break;
  }

  console.log(`[allsop] scraped ${all.length} lots`);
  return all;
}

function extractPostcode(text) {
  if (!text) return null;
  const match = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase() : null;
}

// "£650,000+ " -> 650000 ; "Refer to Auctioneer" -> null
function parsePrice(text) {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/£\s*(\d+)/);
  return match ? Number(match[1]) : null;
}
