import * as cheerio from 'cheerio';

/**
 * data.gov.in Scraper
 * Uses the official Government of India Open Data Platform API
 * to fetch real-time commodity prices from APMC mandis.
 *
 * API: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
 * Docs: https://data.gov.in/resource/current-daily-price-various-commodities-various-centres
 */

const DATA_GOV_API = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const DATA_GOV_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b'; // Public demo key

export interface ScrapedPrice {
  avg: number;
  min: number;
  max: number;
  market?: string;
  variety?: string;
  date?: string;
}

export interface ScrapeResult {
  source: string;
  avg: number;
  min: number;
  max: number;
  markets: ScrapedPrice[];
}

export async function scrapeDataGov(commodity: string, state: string): Promise<ScrapeResult | null> {
  try {
    // The API expects exact commodity names — try common casing patterns
    const commodityNames = [
      commodity,
      commodity.charAt(0).toUpperCase() + commodity.slice(1).toLowerCase(),
      commodity.toUpperCase(),
      commodity.toLowerCase(),
    ];

    // Also try with/without common variations
    const stateNames = [state, state.replace(/\s+/g, ' ')];

    for (const cName of commodityNames) {
      for (const sName of stateNames) {
        const params = new URLSearchParams({
          'api-key': DATA_GOV_KEY,
          format: 'json',
          limit: '20',
          'filters[state]': sName,
          'filters[commodity]': cName,
        });

        const url = `${DATA_GOV_API}?${params.toString()}`;
        console.log(`📊 data.gov.in: Trying ${cName} in ${sName}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KrishiSakhi/1.0',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`📊 data.gov.in: HTTP ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const records = data?.records || [];

        if (records.length === 0) {
          continue; // Try next name variant
        }

        console.log(`✅ data.gov.in: Got ${records.length} records for ${cName} in ${sName}`);

        const markets: ScrapedPrice[] = [];
        const avgPrices: number[] = [];
        const minPrices: number[] = [];
        const maxPrices: number[] = [];

        for (const r of records) {
          const modal = parseFloat(r.modal_price || r.Modal_Price || '0');
          const min = parseFloat(r.min_price || r.Min_Price || '0');
          const max = parseFloat(r.max_price || r.Max_Price || '0');

          if (modal > 0) {
            avgPrices.push(modal);
            minPrices.push(min || modal);
            maxPrices.push(max || modal);
            markets.push({
              avg: modal,
              min: min || modal,
              max: max || modal,
              market: r.market || r.Market || 'Unknown',
              variety: r.variety || r.Variety || 'Standard',
              date: r.arrival_date || r.Arrival_Date || '',
            });
          }
        }

        if (avgPrices.length === 0) continue;

        const result: ScrapeResult = {
          source: 'data.gov.in',
          avg: Math.round(avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length),
          min: Math.round(minPrices.reduce((a, b) => a + b, 0) / minPrices.length),
          max: Math.round(maxPrices.reduce((a, b) => a + b, 0) / maxPrices.length),
          markets,
        };

        console.log(`✅ data.gov.in: avg=₹${result.avg}, min=₹${result.min}, max=₹${result.max}`);
        return result;
      }
    }

    console.log(`⚠️ data.gov.in: No records found for ${commodity} in ${state}`);
    return null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('⏱️ data.gov.in: Request timed out (8s)');
    } else {
      console.error('❌ data.gov.in error:', err.message);
    }
    return null;
  }
}
