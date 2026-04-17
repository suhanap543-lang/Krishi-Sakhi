import { scrapeDataGov, ScrapeResult } from '../scrapers/dataGovScraper';
import { scrapeKisanDeals } from '../scrapers/kisanDealsScraper';
import { scrapeCommodityOnline } from '../scrapers/commodityOnlineScraper';
import { getCurrentKey, executeWithModelAndKeyFallback } from '../utils/geminiClient';

/**
 * ScraperService — Central coordinator for price scraping
 *
 * Architecture:
 *   Frontend → API → ScraperService → [data.gov.in | KisanDeals | CommodityOnline | Gemini] → Cache → Frontend
 *
 * Features:
 *   - In-memory job deduplication (prevents duplicate scrapes)
 *   - Parallel execution of all 4 sources
 *   - Intelligent result fusion (weighted average)
 *   - 30-minute cache via MongoDB (handled by caller)
 */

// ── In-memory job queue for deduplication ────────────────────────────
const activeJobs = new Map<string, Promise<FusedResult | null>>();

export interface FusedResult {
  avg: number;
  min: number;
  max: number;
  sources: string[];
  markets: any[];
}

function jobKey(commodity: string, state: string): string {
  return `${commodity.toLowerCase()}:${state.toLowerCase()}`;
}

// ── Gemini AI Price Estimator ────────────────────────────────────────
async function getGeminiEstimate(commodity: string, state: string): Promise<ScrapeResult | null> {
  const apiKey = getCurrentKey();
  if (!apiKey) return null;

  try {
    const prompt = `What is the current average market price (mandi price) of ${commodity} in ${state}, India in Indian Rupees per Quintal as of today? Respond ONLY with a JSON object like this, no markdown, no explanation:
{"avg_price": 1234, "min_price": 1000, "max_price": 1500}
Use realistic, current market prices.`;

    console.log(`🤖 Gemini: Estimating ${commodity} price in ${state}...`);

    const response = await executeWithModelAndKeyFallback(async (key, model) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
          }),
        }
      );
      if (!resp.ok && (resp.status === 429 || resp.status === 403 || resp.status === 404 || resp.status === 503)) {
        throw { status: resp.status, message: `Gemini ${resp.status}` };
      }
      return resp;
    });

    const result: any = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON
    try {
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.avg_price) {
        console.log(`✅ Gemini: avg=₹${parsed.avg_price}, min=₹${parsed.min_price}, max=₹${parsed.max_price}`);
        return {
          source: 'Gemini AI',
          avg: parsed.avg_price,
          min: parsed.min_price || parsed.avg_price,
          max: parsed.max_price || parsed.avg_price,
          markets: [],
        };
      }
    } catch {}

    // Regex fallback
    const avgM = text.match(/avg(?:_price)?[":\s]+(\d+)/i);
    if (avgM) {
      const av = parseInt(avgM[1]);
      const minM = text.match(/min(?:_price)?[":\s]+(\d+)/i);
      const maxM = text.match(/max(?:_price)?[":\s]+(\d+)/i);
      return {
        source: 'Gemini AI',
        avg: av,
        min: minM ? parseInt(minM[1]) : av,
        max: maxM ? parseInt(maxM[1]) : av,
        markets: [],
      };
    }

    console.log('⚠️ Gemini: No parseable price data');
    return null;
  } catch (err: any) {
    console.error('❌ Gemini estimate error:', err.message);
    return null;
  }
}

// ── Main scrape function (with dedup) ────────────────────────────────
export async function scrapePrice(commodity: string, state: string): Promise<FusedResult | null> {
  const key = jobKey(commodity, state);

  // Dedup: if same job is already running, return its promise
  if (activeJobs.has(key)) {
    console.log(`🔄 Dedup: ${commodity} in ${state} already being scraped, reusing...`);
    return activeJobs.get(key)!;
  }

  const job = _doScrape(commodity, state);
  activeJobs.set(key, job);

  try {
    return await job;
  } finally {
    activeJobs.delete(key);
  }
}

async function _doScrape(commodity: string, state: string): Promise<FusedResult | null> {
  console.log(`\n━━━ ScraperService: ${commodity} in ${state} ━━━`);

  // Run all sources in parallel — each has its own timeout
  const results = await Promise.allSettled([
    scrapeDataGov(commodity, state),
    scrapeKisanDeals(commodity, state),
    scrapeCommodityOnline(commodity, state),
    getGeminiEstimate(commodity, state),
  ]);

  // Collect successful results
  const sources: string[] = [];
  const avgPrices: number[] = [];
  const minPrices: number[] = [];
  const maxPrices: number[] = [];
  let allMarkets: any[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const r = result.value;
      if (r.avg > 0) {
        sources.push(r.source);
        avgPrices.push(r.avg);
        minPrices.push(r.min);
        maxPrices.push(r.max);
        if (r.markets?.length > 0) allMarkets = [...allMarkets, ...r.markets];
      }
    }
  }

  if (avgPrices.length === 0) {
    console.log('⚠️ ScraperService: No sources returned valid prices');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }

  // Fuse results: average across sources
  const fused: FusedResult = {
    avg: Math.round(avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length),
    min: Math.round(minPrices.reduce((a, b) => a + b, 0) / minPrices.length),
    max: Math.round(maxPrices.reduce((a, b) => a + b, 0) / maxPrices.length),
    sources,
    markets: allMarkets,
  };

  console.log(`\n🔀 FUSED (${sources.join(' + ')}): avg=₹${fused.avg}, min=₹${fused.min}, max=₹${fused.max}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return fused;
}
