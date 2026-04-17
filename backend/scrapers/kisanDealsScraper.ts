import * as cheerio from 'cheerio';

/**
 * KisanDeals Scraper — Fixed with proper timeouts
 *
 * Previously: fetch hung indefinitely on mandi subpages.
 * Fix: strict 8-second AbortController, retry once, cleaner parsing.
 */

export interface ScrapeResult {
  source: string;
  avg: number;
  min: number;
  max: number;
  markets: any[];
}

async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function extractPricesFromText(bodyText: string): { avg: number; min: number; max: number } | null {
  let avg: number | null = null;
  let min: number | null = null;
  let max: number | null = null;

  // Try structured patterns
  const maxMatch = bodyText.match(/maximum\s+price[^₹]*₹\s*([\d,]+)/i);
  if (maxMatch) max = parseFloat(maxMatch[1].replace(/,/g, ''));

  const minMatch = bodyText.match(/minimum\s+(?:rate|price)[^₹]*₹\s*([\d,]+)/i);
  if (minMatch) min = parseFloat(minMatch[1].replace(/,/g, ''));

  const avgMatch = bodyText.match(/average\s+price[^₹]*₹\s*([\d,]+)/i);
  if (avgMatch) avg = parseFloat(avgMatch[1].replace(/,/g, ''));

  // Fallback: extract all ₹ amounts
  if (!avg && !min && !max) {
    const allPrices = [...bodyText.matchAll(/₹\s*([\d,]+)\s*(?:per\s+)?(?:Quintal|quintal|QTL)/gi)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(p => p > 50);
    if (allPrices.length > 0) {
      min = Math.min(...allPrices);
      max = Math.max(...allPrices);
      avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
    }
  }

  // Final fallback: any ₹ numbers > 100
  if (!avg && !min && !max) {
    const rupees = [...bodyText.matchAll(/₹\s*([\d,]+)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(p => p > 100 && p < 500000);
    if (rupees.length >= 2) {
      min = Math.min(...rupees);
      max = Math.max(...rupees);
      avg = Math.round(rupees.reduce((a, b) => a + b, 0) / rupees.length);
    }
  }

  if (avg || min || max) {
    return {
      avg: avg || min || max || 0,
      min: min || avg || max || 0,
      max: max || avg || min || 0,
    };
  }
  return null;
}

export async function scrapeKisanDeals(commodity: string, state: string): Promise<ScrapeResult | null> {
  // Try multiple URL patterns
  const urlPatterns = [
    `https://www.kisandeals.com/mandiprices/${commodity.toUpperCase().replace(/\s+/g, '-')}/${state.toUpperCase().replace(/\s+/g, '-')}/ALL`,
    `https://www.kisandeals.com/mandiprices/${commodity.replace(/\s+/g, '-')}/${state.replace(/\s+/g, '-')}/ALL`,
  ];

  for (const url of urlPatterns) {
    try {
      console.log(`🌐 KisanDeals: ${url}`);

      const response = await fetchWithTimeout(url, 8000);

      if (!response.ok) {
        console.log(`⚠️ KisanDeals: HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      if (html.length < 500) {
        console.log(`⚠️ KisanDeals: Response too short (${html.length} bytes)`);
        continue;
      }

      const $ = cheerio.load(html);
      const bodyText = $('body').text();

      const prices = extractPricesFromText(bodyText);
      if (prices) {
        console.log(`✅ KisanDeals: avg=₹${prices.avg}, min=₹${prices.min}, max=₹${prices.max}`);
        return {
          source: 'KisanDeals',
          ...prices,
          markets: [],
        };
      }

      // Try parsing table rows for individual market data
      const markets: any[] = [];
      $('table tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const market = $(cells[0]).text().trim();
          const priceText = $(cells[2]).text().trim();
          const priceMatch = priceText.match(/[\d,]+/);
          if (market && priceMatch) {
            const price = parseFloat(priceMatch[0].replace(/,/g, ''));
            if (price > 50) markets.push({ market, avg: price, min: price, max: price });
          }
        }
      });

      if (markets.length > 0) {
        const avgAll = Math.round(markets.reduce((s, m) => s + m.avg, 0) / markets.length);
        console.log(`✅ KisanDeals (table): ${markets.length} markets, avg=₹${avgAll}`);
        return {
          source: 'KisanDeals',
          avg: avgAll,
          min: Math.min(...markets.map(m => m.min)),
          max: Math.max(...markets.map(m => m.max)),
          markets,
        };
      }

      console.log(`⚠️ KisanDeals: No parseable prices in page`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`⏱️ KisanDeals: Timed out (8s) for ${url}`);
      } else {
        console.error(`❌ KisanDeals error: ${err.message}`);
      }
    }
  }

  return null;
}
