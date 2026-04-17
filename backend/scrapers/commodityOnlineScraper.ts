import puppeteer from 'puppeteer';

/**
 * CommodityOnline Scraper — Fixed with stealth settings
 *
 * Previously: 403 Forbidden.
 * Fix: Better headers, realistic viewport, stealth-like page behavior,
 *      and page-level 15-second timeout. Uses shared browser instance.
 */

export interface ScrapeResult {
  source: string;
  avg: number;
  min: number;
  max: number;
  markets: any[];
}

// ─── Shared browser instance ─────────────────────────────────────────
let _browser: any = null;

async function getBrowser() {
  if (!_browser || !_browser.isConnected()) {
    _browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
      ],
    });
  }
  return _browser;
}

export async function scrapeCommodityOnline(commodity: string, state: string): Promise<ScrapeResult | null> {
  let page: any = null;
  try {
    const slug = commodity.toLowerCase().replace(/\s+/g, '-');
    const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.commodityonline.com/mandiprices/${slug}/${stateSlug}`;
    console.log(`🌐 CommodityOnline: ${url}`);

    const browser = await getBrowser();
    page = await browser.newPage();

    // ─── Stealth settings ───────────────────────────────────────
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 768 });

    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // @ts-ignore
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Navigate with 15-second timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for content to render
    await new Promise(r => setTimeout(r, 2000));

    // ─── Extract prices ─────────────────────────────────────────
    const scraped: any = await page.evaluate(() => {
      const result: any = { summary: {}, markets: [] };

      // 1. Summary prices from mandi_highlight section
      const highlightRows = document.querySelectorAll('.mandi_highlight .row div');
      highlightRows.forEach(div => {
        const h4 = div.querySelector('h4');
        const p = div.querySelector('p');
        if (h4 && p) {
          const label = h4.textContent?.trim().toLowerCase() || '';
          const priceText = p.textContent?.trim() || '';
          const numMatch = priceText.match(/[\d,.]+/);
          const price = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : null;
          if (label.includes('average')) result.summary.avg = price;
          else if (label.includes('lowest')) result.summary.min = price;
          else if (label.includes('costliest')) result.summary.max = price;
        }
      });

      // 2. Table rows
      const tableRows = document.querySelectorAll('.mandi_highlight table tbody tr');
      tableRows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 3) {
          const market = cells[0]?.textContent?.trim();
          const variety = cells[1]?.textContent?.trim();
          const priceText = cells[2]?.textContent?.trim() || '';
          const dateText = cells[3]?.textContent?.trim() || '';
          const numMatch = priceText.match(/[\d,.]+/);
          const price = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : null;
          if (market && price) {
            result.markets.push({ market, variety, price, date: dateText });
          }
        }
      });

      // 3. Fallback: try ₹ amounts from anywhere on page
      if (!result.summary.avg) {
        document.querySelectorAll('tr').forEach(tr => {
          const text = tr.textContent?.trim() || '';
          const numMatch = text.match(/₹([\d,.]+)/);
          if (numMatch) {
            const price = parseFloat(numMatch[1].replace(/,/g, ''));
            if (text.toLowerCase().includes('avg')) result.summary.avg = price;
            else if (text.toLowerCase().includes('min')) result.summary.min = price;
            else if (text.toLowerCase().includes('max')) result.summary.max = price;
          }
        });
      }

      return result;
    });

    await page.close();
    page = null;

    // Validate
    if (!scraped.summary.avg && scraped.markets.length === 0) {
      console.log('⚠️ CommodityOnline: No prices extracted');
      return null;
    }

    // Build result from summary or markets
    let avg: number, min: number, max: number;
    if (scraped.summary.avg) {
      avg = scraped.summary.avg;
      min = scraped.summary.min || avg;
      max = scraped.summary.max || avg;
    } else {
      const prices = scraped.markets.map((m: any) => m.price).filter((p: number) => p > 0);
      avg = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);
      min = Math.min(...prices);
      max = Math.max(...prices);
    }

    console.log(`✅ CommodityOnline: avg=₹${avg}, min=₹${min}, max=₹${max}, ${scraped.markets.length} markets`);

    return {
      source: 'CommodityOnline',
      avg,
      min,
      max,
      markets: scraped.markets,
    };
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      console.error('⏱️ CommodityOnline: Timed out (15s)');
    } else {
      console.error(`❌ CommodityOnline error: ${err.message}`);
    }
    if (page) await page.close().catch(() => {});
    return null;
  }
}

/** Gracefully close shared browser (call on server shutdown) */
export async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}
