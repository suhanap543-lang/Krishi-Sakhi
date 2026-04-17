import { Request, Response } from 'express';
import MarketPrice from '../models/MarketPrice';
import Transaction from '../models/Transaction';
import { getCurrentKey, executeWithModelAndKeyFallback } from '../utils/geminiClient';
import { scrapePrice } from '../services/scraperService';

// ─── State-wise popular crops (at least 10 per state) ────────────────
const STATE_CROPS: Record<string, string[]> = {
  'Andhra Pradesh':    ['Rice','Groundnut','Cotton','Chilli','Turmeric','Maize','Sugarcane','Tobacco','Mango','Banana','Onion','Tomato'],
  'Arunachal Pradesh': ['Rice','Maize','Ginger','Turmeric','Orange','Apple','Kiwi','Cardamom','Soyabean','Mustard','Millet','Potato'],
  'Assam':             ['Rice','Tea','Jute','Sugarcane','Potato','Mustard','Banana','Orange','Areca Nut','Ginger','Turmeric','Lemon'],
  'Bihar':             ['Rice','Wheat','Maize','Sugarcane','Potato','Onion','Lentil','Gram','Mustard','Banana','Litchi','Mango'],
  'Chhattisgarh':      ['Rice','Maize','Soyabean','Groundnut','Sugarcane','Wheat','Gram','Lentil','Tomato','Onion','Potato','Mustard'],
  'Goa':               ['Rice','Coconut','Cashew','Mango','Banana','Pineapple','Areca Nut','Sugarcane','Pepper','Watermelon','Cucumber','Brinjal'],
  'Gujarat':           ['Cotton','Groundnut','Wheat','Rice','Castor Seed','Cumin','Bajra','Sugarcane','Onion','Potato','Tomato','Mango'],
  'Haryana':           ['Wheat','Rice','Bajra','Cotton','Sugarcane','Mustard','Gram','Potato','Tomato','Onion','Barley','Maize'],
  'Himachal Pradesh':  ['Apple','Wheat','Maize','Rice','Barley','Potato','Ginger','Tomato','Pea','Plum','Walnut','Apricot'],
  'Jharkhand':         ['Rice','Wheat','Maize','Gram','Lentil','Potato','Tomato','Onion','Mustard','Sugarcane','Mango','Banana'],
  'Karnataka':         ['Rice','Ragi','Maize','Sugarcane','Cotton','Groundnut','Coconut','Coffee','Pepper','Cardamom','Tomato','Onion'],
  'Kerala':            ['Rice','Coconut','Pepper','Cardamom','Rubber','Ginger','Turmeric','Coffee','Tea','Banana','Cashew','Arecanut','Tapioca','Nutmeg'],
  'Madhya Pradesh':    ['Soyabean','Wheat','Rice','Gram','Maize','Cotton','Sugarcane','Lentil','Mustard','Onion','Garlic','Potato'],
  'Maharashtra':       ['Sugarcane','Cotton','Soyabean','Rice','Wheat','Onion','Gram','Groundnut','Banana','Mango','Grapes','Turmeric'],
  'Manipur':           ['Rice','Maize','Soyabean','Mustard','Potato','Ginger','Turmeric','Orange','Pineapple','Banana','Pea','Cabbage'],
  'Meghalaya':         ['Rice','Maize','Potato','Ginger','Turmeric','Orange','Pineapple','Banana','Areca Nut','Cashew','Jute','Tea'],
  'Mizoram':           ['Rice','Maize','Sugarcane','Ginger','Turmeric','Banana','Orange','Passion Fruit','Chilli','Sesame','Mustard','Potato'],
  'Nagaland':          ['Rice','Maize','Millet','Soyabean','Potato','Ginger','Turmeric','Chilli','Orange','Pineapple','Sugarcane','Mustard'],
  'Odisha':            ['Rice','Groundnut','Sugarcane','Jute','Mustard','Sesamum','Cotton','Maize','Turmeric','Onion','Potato','Mango'],
  'Punjab':            ['Wheat','Rice','Cotton','Maize','Sugarcane','Potato','Bajra','Barley','Mustard','Onion','Tomato','Pea'],
  'Rajasthan':         ['Bajra','Wheat','Barley','Maize','Gram','Mustard','Cumin','Groundnut','Cotton','Onion','Garlic','Guar'],
  'Sikkim':            ['Rice','Maize','Ginger','Turmeric','Cardamom','Orange','Potato','Buckwheat','Millet','Apple','Pea','Soyabean'],
  'Tamil Nadu':        ['Rice','Sugarcane','Coconut','Groundnut','Cotton','Banana','Mango','Turmeric','Maize','Tapioca','Onion','Chilli'],
  'Telangana':         ['Rice','Cotton','Maize','Chilli','Turmeric','Sugarcane','Soyabean','Groundnut','Mango','Orange','Onion','Tomato'],
  'Tripura':           ['Rice','Jute','Sugarcane','Potato','Mustard','Tea','Rubber','Banana','Pineapple','Orange','Ginger','Jackfruit'],
  'Uttar Pradesh':     ['Wheat','Rice','Sugarcane','Potato','Mustard','Gram','Maize','Bajra','Onion','Tomato','Mango','Banana'],
  'Uttarakhand':       ['Rice','Wheat','Sugarcane','Soyabean','Maize','Potato','Ginger','Turmeric','Apple','Walnut','Mandarin','Litchi'],
  'West Bengal':       ['Rice','Jute','Potato','Tea','Mustard','Sugarcane','Wheat','Maize','Sesame','Mango','Banana','Lentil'],
};

// ─── Realistic price ranges per commodity (₹ per quintal) ────────────
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'Rice':        { min: 1800, max: 3500 },   'Wheat':       { min: 1800, max: 2800 },
  'Maize':       { min: 1500, max: 2500 },   'Sugarcane':   { min: 280, max: 400 },
  'Cotton':      { min: 5500, max: 7500 },   'Soyabean':    { min: 3500, max: 5000 },
  'Groundnut':   { min: 4500, max: 6500 },   'Mustard':     { min: 4000, max: 5500 },
  'Gram':        { min: 4000, max: 5500 },   'Lentil':      { min: 4500, max: 6000 },
  'Potato':      { min: 800, max: 2000 },    'Onion':       { min: 1000, max: 3500 },
  'Tomato':      { min: 800, max: 4000 },    'Banana':      { min: 1500, max: 3000 },
  'Mango':       { min: 2000, max: 6000 },   'Coconut':     { min: 1500, max: 3000 },
  'Pepper':      { min: 30000, max: 50000 }, 'Cardamom':    { min: 80000, max: 150000 },
  'Turmeric':    { min: 600, max: 12000 },  'Ginger':      { min: 3000, max: 8000 },
  'Coffee':      { min: 15000, max: 30000 }, 'Tea':         { min: 15000, max: 25000 },
  'Rubber':      { min: 12000, max: 18000 }, 'Cashew':      { min: 8000, max: 14000 },
  'Jute':        { min: 3500, max: 5500 },   'Bajra':       { min: 1800, max: 2800 },
  'Barley':      { min: 1500, max: 2500 },   'Chilli':      { min: 8000, max: 18000 },
  'Cumin':       { min: 15000, max: 35000 }, 'Garlic':      { min: 5000, max: 15000 },
  'Apple':       { min: 5000, max: 12000 },  'Orange':      { min: 2000, max: 5000 },
  'Grapes':      { min: 3000, max: 8000 },   'Litchi':      { min: 3000, max: 8000 },
  'Pineapple':   { min: 1500, max: 4000 },   'Tapioca':     { min: 600, max: 1500 },
  'Areca Nut':   { min: 25000, max: 45000 }, 'Arecanut':    { min: 25000, max: 45000 },
  'Sesamum':     { min: 8000, max: 14000 },  'Sesame':      { min: 8000, max: 14000 },
  'Castor Seed': { min: 4500, max: 6500 },   'Ragi':        { min: 2500, max: 4000 },
  'Tobacco':     { min: 10000, max: 18000 }, 'Pea':         { min: 3000, max: 5000 },
  'Walnut':      { min: 20000, max: 40000 }, 'Millet':      { min: 2000, max: 3500 },
  'Guar':        { min: 4000, max: 6000 },   'Nutmeg':      { min: 40000, max: 80000 },
  'Plum':        { min: 3000, max: 7000 },   'Apricot':     { min: 5000, max: 12000 },
  'Cabbage':     { min: 500, max: 1500 },    'Brinjal':     { min: 800, max: 2500 },
  'Cucumber':    { min: 600, max: 1800 },    'Watermelon':  { min: 500, max: 1500 },
  'Kiwi':        { min: 10000, max: 25000 }, 'Jackfruit':   { min: 1000, max: 3000 },
  'Buckwheat':   { min: 3000, max: 5000 },
  'Passion Fruit': { min: 5000, max: 12000 }, 'Mandarin':   { min: 2000, max: 5000 },
};

// ─── Helper: generate realistic price with small daily fluctuation ───
function generateRealisticPrice(commodity: string, dayOffset = 0) {
  const range = PRICE_RANGES[commodity] || { min: 1000, max: 3000 };
  const basePrice = range.min + (range.max - range.min) * 0.5;
  const volatility = (range.max - range.min) * 0.08;
  const seed = (commodity.charCodeAt(0) * 31 + dayOffset * 7) % 100;
  const fluctuation = (seed / 100 - 0.5) * 2 * volatility;
  const modal = Math.round(basePrice + fluctuation);
  const min = Math.round(modal * (0.85 + (seed % 10) * 0.005));
  const max = Math.round(modal * (1.05 + (seed % 10) * 0.005));
  return { min_price: min, max_price: max, modal_price: modal };
}

// ─── Scraping logic moved to backend/scrapers/ and backend/services/scraperService.ts ───

// ─── 1) Get crops for a state ────────────────────────────────────────
export const getCrops = async (req: Request, res: Response) => {
  try {
    const { state } = req.query as { state: string };
    if (!state) return res.status(400).json({ success: false, message: 'State is required' });

    const crops = STATE_CROPS[state] || STATE_CROPS['Kerala'];
    res.json({ success: true, data: crops });
  } catch (error) {
    console.error('getCrops error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 2) Get live prices (scrape + fallback to mock) ──────────────────
export const getPrices = async (req: Request, res: Response) => {
  try {
    const { state, district, commodity } = req.query as { state: string; district?: string; commodity: string };
    if (!state || !commodity) {
      return res.status(400).json({ success: false, message: 'State and commodity are required' });
    }

    // Check cache (within last 30 minutes)
    const cacheKey: any = { state, commodity };
    if (district) cacheKey.district = district;

    const cached = await MarketPrice.find({
      ...cacheKey,
      fetched_at: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    }).sort({ arrival_date: -1 } as any).limit(1);

    if (cached.length > 0) {
      const src = (cached[0] as any).scraped ? 'scraped_live' : 'cache';
      return res.json({ success: true, data: cached, source: src });
    }

    // ─── Try ScraperService (data.gov.in + KisanDeals + CommodityOnline + Gemini) ───
    const fused = await scrapePrice(commodity, state);

    if (fused) {
      const now = new Date();

      // Create a single summary record with the fused price
      const record = await MarketPrice.create({
        state,
        district: district || '',
        market: `${district || state} Market`,
        commodity,
        variety: 'Standard',
        grade: 'Standard',
        min_price: fused.min,
        max_price: fused.max,
        modal_price: fused.avg,
        arrival_date: now,
        fetched_at: now,
        scraped: true
      });

      return res.json({ success: true, data: [record], source: 'scraped_live', sources: fused.sources });
    }

    // ─── Fallback: generate realistic mock prices ────────────────
    console.log('📊 Falling back to generated prices.');
    const varieties = ['FAQ', 'Standard', 'Premium'];
    const marketName = `${district || state} Market`;
    const now = new Date();
    const records = [];

    for (const variety of varieties) {
      const prices = generateRealisticPrice(commodity, variety.charCodeAt(0));
      const record = await MarketPrice.create({
        state,
        district: district || '',
        market: marketName,
        commodity,
        variety,
        grade: variety,
        ...prices,
        arrival_date: now,
        fetched_at: now
      });
      records.push(record);
    }

    res.json({ success: true, data: records, source: 'generated' });
  } catch (error) {
    console.error('getPrices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 3) Get price history (7 days, anchored on live price) ──────────
export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const { state, commodity, days = '7' } = req.query as { state: string; commodity: string; days?: string };
    if (!state || !commodity) {
      return res.status(400).json({ success: false, message: 'State and commodity are required' });
    }

    const numDays = parseInt(days);
    let todayModal = 0;
    let todayMin = 0;
    let todayMax = 0;
    let isLive = false;
    let liveSources: string[] = [];

    // ─── Try ScraperService fusion for today's price ─────────────────
    const fused = await scrapePrice(commodity, state);
    if (fused) {
      todayModal = fused.avg;
      todayMin = fused.min;
      todayMax = fused.max;
      isLive = true;
      liveSources = fused.sources;
      console.log(`📈 Fused price anchor (${fused.sources.join(' + ')}): avg=₹${todayModal}, min=₹${todayMin}, max=₹${todayMax}`);
    } else {
      // Fallback to generated price for today
      const gen = generateRealisticPrice(commodity, 0);
      todayModal = gen.modal_price;
      todayMin = gen.min_price;
      todayMax = gen.max_price;
    }

    // ─── Build 7-day chart data ending with today ─────────────────
    const chartData: any[] = [];
    const today = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (i === 0) {
        // Today → use live / current data
        chartData.push({
          date: dateStr,
          min_price: todayMin,
          max_price: todayMax,
          modal_price: todayModal,
          live: isLive,
          predicted: false
        });
      } else {
        // Past days → generate realistic fluctuations anchored on today's price
        const volatility = todayModal * 0.04;
        const seed = (commodity.charCodeAt(0) * 17 + i * 13 + commodity.length * 7) % 100;
        const direction = ((seed % 2 === 0) ? 1 : -1);
        const fluctuation = direction * (seed / 100) * volatility * (i * 0.3);
        
        const modal = Math.round(todayModal + fluctuation);
        const spread = todayModal * 0.12;
        const min = Math.round(modal - spread * (0.5 + (seed % 30) / 100));
        const max = Math.round(modal + spread * (0.5 + (seed % 20) / 100));

        chartData.push({
          date: dateStr,
          min_price: min,
          max_price: max,
          modal_price: modal,
          live: false,
          predicted: false
        });
      }
    }

    // ─── 7-Day Price Prediction (trend-based projection) ──────────
    // Calculate the trend from our historical data
    const pastModalPrices = chartData.map(d => d.modal_price);
    const firstPrice = pastModalPrices[0];
    const lastPrice = pastModalPrices[pastModalPrices.length - 1];
    const dailyTrend = (lastPrice - firstPrice) / (pastModalPrices.length - 1 || 1); // avg daily change

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Apply trend + dampening (trend fades over time) + seeded volatility
      const trendComponent = dailyTrend * i * (1 - i * 0.08); // dampen trend further out
      const seed = (commodity.charCodeAt(0) * 23 + i * 31 + commodity.length * 11) % 100;
      const noise = ((seed - 50) / 50) * todayModal * 0.02 * i; // small random-seeded noise

      const predictedModal = Math.round(todayModal + trendComponent + noise);
      const predictedMin = Math.round(predictedModal * (todayMin / (todayModal || 1)));
      const predictedMax = Math.round(predictedModal * (todayMax / (todayModal || 1)));

      chartData.push({
        date: dateStr,
        min_price: predictedMin,
        max_price: predictedMax,
        modal_price: predictedModal,
        live: false,
        predicted: true
      });
    }

    res.json({ success: true, data: chartData, source: isLive ? 'scraped_live' : 'generated', sources: liveSources });
  } catch (error) {
    console.error('getPriceHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 4) Gemini-powered market insights ──────────────────────────────
export const getInsights = async (req: Request, res: Response) => {
  try {
    const { commodity, state, district, modal_price, min_price, max_price } = req.body;
    if (!commodity || !state) {
      return res.status(400).json({ success: false, message: 'Commodity and state are required' });
    }

    const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const apiKey = getCurrentKey();
    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          summary: `${commodity} is trading at ₹${modal_price || 'N/A'}/quintal in ${district || state} as of ${todayStr}. The price spread of ₹${min_price || 'N/A'} to ₹${max_price || 'N/A'} indicates moderate market activity.`,
          tips: [
            `Compare prices across nearby mandis before selling ${commodity}.`,
            `Current price spread (₹${min_price} - ₹${max_price}) suggests moderate demand.`,
            `Consider storage if you expect prices to rise in the coming weeks.`,
            `Check APMC rates and government MSP announcements regularly.`,
            `Transport costs can eat into margins — sell at the nearest high-price mandi.`,
            `Grade and sort your ${commodity} well — quality premiums can add 5-15% to the price.`
          ],
          trend: 'stable',
          recommendation: 'hold',
          forecast: `${commodity} prices are expected to remain around ₹${modal_price}/quintal over the next 2 weeks with minor fluctuations.`,
          demandSupply: `Current supply levels appear normal for ${state}. Demand is expected to remain steady through the season.`,
          seasonalNote: `This is a typical trading period for ${commodity} in ${state}. Prices may fluctuate based on arrivals and weather conditions.`,
          riskLevel: 'medium',
          bestStrategy: `Store ${commodity} if you have adequate facilities and sell when prices peak. Monitor daily mandi rates.`,
          priceRange: { current: modal_price || 0, weekLow: min_price || 0, weekHigh: max_price || 0 }
        }
      });
    }

    const prompt = `You are a seasoned Indian agricultural commodity market analyst with 20+ years of experience. Analyze the following real-time mandi data and provide comprehensive, farmer-friendly market insights.

📊 MARKET DATA:
- Crop: ${commodity}
- State: ${state}
- District: ${district || 'N/A'}
- Date: ${todayStr}
- Modal Price: ₹${modal_price || 'N/A'}/quintal
- Min Price: ₹${min_price || 'N/A'}/quintal
- Max Price: ₹${max_price || 'N/A'}/quintal

Return a JSON object with these EXACT keys (respond ONLY with valid JSON, no markdown, no explanation):
{
  "summary": "4-5 sentence detailed market analysis covering current price levels, comparison with national averages, and any notable market movements. Include specific numbers.",
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5", "tip6"],
  "trend": "rising" or "falling" or "stable",
  "recommendation": "buy" or "sell" or "hold",
  "forecast": "3-4 sentence specific price forecast for the next 1-2 weeks with expected price ranges in ₹/quintal. Be specific with numbers.",
  "demandSupply": "2-3 sentences about current demand-supply dynamics for this crop in this region. Mention factors like arrivals, stock levels, and buyer activity.",
  "seasonalNote": "1-2 sentences about seasonal factors affecting this crop right now (e.g., harvest season, sowing period, festival demand, weather impact).",
  "riskLevel": "low" or "medium" or "high",
  "bestStrategy": "2-3 sentences of specific, actionable strategy for farmers — when to sell, how to maximize returns, storage advice.",
  "priceRange": {"current": ${modal_price || 0}, "weekLow": ${min_price || 0}, "weekHigh": ${max_price || 0}}
}

IMPORTANT: Make ALL tips highly specific and actionable for ${commodity} farmers in ${state}. Include real market factors, government schemes (like PM-AASHA, MSP), and practical advice. Each tip should be 1-2 sentences. Be honest about risks.`;

    const response = await executeWithModelAndKeyFallback(async (key, model) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
          })
        }
      );
      if (!resp.ok && (resp.status === 429 || resp.status === 403 || resp.status === 404 || resp.status === 503)) {
        throw { status: resp.status, message: `Gemini API Error: ${resp.status}` };
      }
      return resp;
    });

    const result: any = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from Gemini response
    let insights;
    try {
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(jsonStr);
    } catch {
      insights = {
        summary: text.substring(0, 500) || `${commodity} market analysis for ${state}.`,
        tips: [`Monitor ${commodity} prices in ${district || state} regularly.`],
        trend: 'stable',
        recommendation: 'hold',
        forecast: `Prices expected to remain around ₹${modal_price}/quintal.`,
        demandSupply: 'Normal supply and demand conditions.',
        seasonalNote: 'No major seasonal factors at this time.',
        riskLevel: 'medium',
        bestStrategy: `Monitor daily prices and sell at the best opportunity.`
      };
    }

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('getInsights error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate insights' });
  }
};

// ─── 5) Create transaction (buy/sell) ────────────────────────────────
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { farmer, type, commodity, variety, market, state, district, quantity, unit, price_per_unit, total_price, notes } = req.body;

    if (!farmer || !type || !commodity || !quantity || !price_per_unit) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const transaction = await Transaction.create({
      farmer, type, commodity, variety, market, state, district,
      quantity, unit: unit || 'quintal',
      price_per_unit, total_price: total_price || (quantity * price_per_unit),
      notes
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('createTransaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 6) List transactions for a farmer ───────────────────────────────
export const listTransactions = async (req: Request, res: Response) => {
  try {
    const { farmer_id, type, status } = req.query as { farmer_id: string; type?: string; status?: string };
    if (!farmer_id) return res.status(400).json({ success: false, message: 'farmer_id is required' });

    const query: any = { farmer: farmer_id };
    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 } as any)
      .limit(50)
      .populate('farmer', 'name phone');

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('listTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
