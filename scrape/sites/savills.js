export async function scrapeSavills(page) {
  const deals = [];

  await page.goto('https://auctions.savills.co.uk/upcoming-auctions', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(3000);

  const auctionLinks = await page.$$eval('a', as => as
    .map(a => a.href)
    .filter(href => /\/auctions\/\d/.test(href))
  );
  const uniqueAuctionLinks = [...new Set(auctionLinks)];

  // UK postcode pattern (e.g. IG10 1BL, SE21 7EP, L7 7AZ)
  const postcodeRegex = /([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})/i;

  for (const auctionUrl of uniqueAuctionLinks) {
    const auctionPage = await page.context().browser().newPage();
    try {
      await auctionPage.goto(auctionUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await auctionPage.waitForTimeout(4000);

      const lots = await auctionPage.$$eval('.lot-right', (nodes, sourceUrl) => nodes.map(node => {
        const lotNumber = node.querySelector('.lot-number')?.textContent?.trim() || null;
        const priceText = node.querySelector('.price-container.guide-price .value')?.textContent?.trim() || null;
        const nameEl = node.querySelector('.lot-name');
        const address = nameEl?.textContent?.trim() || null;
        const detailUrl = nameEl?.href || null;
        const features = Array.from(node.querySelectorAll('.lot-details li')).map(li => li.textContent.trim());

        return {
          lot_number: lotNumber,
          address,
          guide_price_text: priceText,
          features,
          source_url: detailUrl,
          auction_page_url: sourceUrl
        };
      }), auctionUrl);

      for (const lot of lots) {
        if (!lot.address || !lot.guide_price_text) continue;

        const priceDigits = lot.guide_price_text.replace(/[^0-9]/g, '');
        const askingPrice = priceDigits ? parseInt(priceDigits, 10) : null;

        let auctionDateText = null;
        const dateLine = lot.features.find(f => /^to be offered on/i.test(f));
        if (dateLine) {
          auctionDateText = dateLine.replace(/^to be offered on\s*/i, '').trim();
        }

        const postcodeMatch = lot.address.match(postcodeRegex);
        const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : null;

        deals.push({
          source: 'Savills',
          address: lot.address,
          postcode,
          asking_price: askingPrice,
          guide_price_text: lot.guide_price_text,
          auction_date_text: auctionDateText,
          auction_type: 'Auction',
          price_type: 'Guide Price',
          source_url: lot.source_url || lot.auction_page_url,
          notes: lot.features.join(' | '),
          stage: 'lead'
        });
      }
    } catch (err) {
      console.error(`[savills] failed on auction page ${auctionUrl}:`, err.message);
    } finally {
      await auctionPage.close();
    }
  }

  console.log(`[savills] scraped ${deals.length} lots across ${uniqueAuctionLinks.length} auction(s)`);
  return deals;
}
