import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { getGenAI, rotateKey, isQuotaError, GEMINI_MODELS } from '../utils/geminiClient';

const SOIL_HEALTH_API = process.env.SOIL_HEALTH_API_URL || 'http://localhost:8002';
const CROP_ML_API = process.env.ML_API_URL || 'http://localhost:8001';
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
const MODEL_CHAIN = GEMINI_MODELS;

// ---------------------------------------------------------------------------
// Helper — fetch weather from coordinates
// ---------------------------------------------------------------------------
async function fetchWeather(lat: number, lon: number) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
      description: data.weather?.[0]?.description ?? '',
      city: data.name ?? 'Unknown',
    };
  } catch {
    return { temperature: 25, humidity: 60, rainfall: 50, description: 'unavailable', city: 'Unknown' };
  }
}

// ---------------------------------------------------------------------------
// POST /api/crop-productivity/analyze
// ---------------------------------------------------------------------------
export const analyzeCropProductivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[CropProductivity] Incoming request');

    const { N, P, K, ph, ec, oc, S, zn, fe, cu, Mn, B, lat, lon, userState, userDistrict } = req.body;

    // Validate soil parameters
    const soilFields = { N, P, K, ph, ec, oc, S, zn, fe, cu, Mn, B };
    const missing = Object.entries(soilFields)
      .filter(([_, v]) => v === undefined || v === null || v === '' || isNaN(Number(v)))
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid soil parameters: ${missing.join(', ')}`,
      });
    }

    const soilPayload = {
      N: parseFloat(N), P: parseFloat(P), K: parseFloat(K), ph: parseFloat(ph),
      ec: parseFloat(ec), oc: parseFloat(oc), S: parseFloat(S), zn: parseFloat(zn),
      fe: parseFloat(fe), cu: parseFloat(cu), Mn: parseFloat(Mn), B: parseFloat(B),
    };

    // --- PARALLEL FAN-OUT: Call all three ML endpoints simultaneously ---
    const [soilHealthResult, cropCompatResult, cropMLResult, weatherData] = await Promise.allSettled([
      // 1. Soil Health Assessment
      axios.post(`${SOIL_HEALTH_API}/assess`, soilPayload, { timeout: 15000 }),
      // 2. Crop Compatibility (new endpoint)
      axios.post(`${SOIL_HEALTH_API}/crop-compatibility`, soilPayload, { timeout: 15000 }),
      // 3. Crop Recommendation (needs weather)
      (async () => {
        if (lat && lon) {
          const w = await fetchWeather(parseFloat(lat), parseFloat(lon));
          const mlPayload = {
            N: soilPayload.N, P: soilPayload.P, K: soilPayload.K, ph: soilPayload.ph,
            temperature: w.temperature, humidity: w.humidity, rainfall: w.rainfall,
            city: w.city, state: userState || '', country: 'India',
            lat: parseFloat(lat), lon: parseFloat(lon),
            weather_description: w.description,
          };
          const res = await axios.post(`${CROP_ML_API}/predict`, mlPayload, { timeout: 10000 });
          return { ml: res.data, weather: w };
        }
        return null;
      })(),
      // 4. Weather data (for display)
      (async () => {
        if (lat && lon) return fetchWeather(parseFloat(lat), parseFloat(lon));
        return null;
      })(),
    ]);

    // Extract results (graceful degradation if any service is down)
    const soilHealth = soilHealthResult.status === 'fulfilled' ? soilHealthResult.value.data : null;
    const cropCompat = cropCompatResult.status === 'fulfilled' ? cropCompatResult.value.data : null;
    const cropML = cropMLResult.status === 'fulfilled' ? (cropMLResult.value as any) : null;
    const weather = weatherData.status === 'fulfilled' ? (weatherData.value as any) : null;

    if (!soilHealth && !cropCompat) {
      return res.status(503).json({
        success: false,
        message: 'ML services are unavailable. Ensure soil_health_api.py is running on port 8002.',
      });
    }

    console.log('[CropProductivity] Soil Health:', soilHealth?.fertility_class, '| Crop Compat:', cropCompat?.total_crops_analyzed, 'crops');

    // --- Build integrated productivity report ---
    const topCrops = cropCompat?.crop_compatibility?.slice(0, 8) || [];
    const mlCrop = cropML?.ml?.recommended_crop;
    const mlTop3 = cropML?.ml?.top3 || [];

    // Cross-reference ML recommendation with compatibility score
    const crossRef = topCrops.map((c: any) => {
      const mlMatch = mlTop3.find((m: any) => m.crop?.toLowerCase() === c.crop?.toLowerCase());
      return {
        ...c,
        ml_confidence: mlMatch ? mlMatch.confidence : null,
        ml_recommended: c.crop?.toLowerCase() === mlCrop?.toLowerCase(),
        combined_score: mlMatch
          ? round(c.compatibility_score * 0.6 + mlMatch.confidence * 100 * 0.4)
          : c.compatibility_score,
      };
    }).sort((a: any, b: any) => b.combined_score - a.combined_score);

    // Build month-by-month productivity roadmap
    const roadmap = buildProductivityRoadmap(soilHealth, crossRef[0], soilPayload);

    // Optionally enrich with Gemini AI
    let aiProductivityInsights: any = null;
    try {
      aiProductivityInsights = await getGeminiProductivityInsights(
        soilHealth, crossRef.slice(0, 5), soilPayload, weather, userState, userDistrict
      );
    } catch (err: any) {
      console.warn('[CropProductivity] Gemini unavailable:', err.message?.slice(0, 100));
    }

    return res.status(200).json({
      success: true,
      report: {
        // Soil diagnostics
        soil_health: soilHealth ? {
          fertility_class: soilHealth.fertility_class,
          soil_health_index: soilHealth.soil_health_index,
          confidence: soilHealth.confidence,
          deficiencies: soilHealth.deficiencies,
          excesses: soilHealth.excesses,
          health_report: soilHealth.health_report,
          nutrient_analysis: soilHealth.nutrient_analysis,
          bio_recommendations: soilHealth.bio_recommendations,
        } : null,

        // Crop productivity
        crop_productivity: {
          best_crop: crossRef[0]?.crop || mlCrop || 'Unknown',
          top_crops: crossRef,
          ml_recommendation: mlCrop || null,
          ml_top3: mlTop3,
          total_crops_analyzed: cropCompat?.total_crops_analyzed || 0,
        },

        // Weather context
        weather: weather || (cropML?.weather || null),

        // Productivity roadmap
        roadmap,

        // AI insights
        ai_insights: aiProductivityInsights,
      },
    });
  } catch (err: any) {
    console.error('[CropProductivity] Error:', err.message);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function round(v: number, d = 1) { return Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }

function buildProductivityRoadmap(soilHealth: any, topCrop: any, soil: any) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonth = new Date().getMonth();
  const cropName = topCrop?.crop || 'the recommended crop';

  const roadmap = [];
  for (let i = 0; i < 12; i++) {
    const mIdx = (currentMonth + i) % 12;
    const month = months[mIdx];
    let actions: string[] = [];
    let phase = '';

    if (i === 0) {
      phase = 'Soil Preparation';
      actions = [
        'Conduct detailed soil test and verify lab report',
        ...(soilHealth?.bio_recommendations?.slice(0, 2).map((r: any) =>
          `Apply ${r.products?.[0]?.product || r.name}: ${r.products?.[0]?.dosage || 'as recommended'}`
        ) || []),
        'Incorporate organic matter (FYM/compost at 5-8 tonnes/acre)',
      ];
    } else if (i === 1) {
      phase = 'Pre-Sowing';
      actions = [
        `Prepare seedbed for ${cropName}`,
        'Apply basal dose of biofertilizers',
        'Treat seeds with Rhizobium/Azotobacter inoculant',
        'Ensure proper field drainage',
      ];
    } else if (i === 2) {
      phase = 'Sowing';
      actions = [
        `Sow ${cropName} at recommended spacing`,
        'Apply PSB and VAM at root zone',
        'Install drip irrigation if available',
        'First light irrigation within 3-5 days',
      ];
    } else if (i >= 3 && i <= 5) {
      phase = 'Growth & Monitoring';
      actions = [
        `Monitor ${cropName} for pest/disease symptoms`,
        'Apply foliar micronutrient spray (Zn + Fe + B)',
        i === 3 ? 'First top-dressing of N fertilizer (split dose)' : 'Continue scheduled irrigation',
        'Weed management — manual or mulching',
      ];
    } else if (i >= 6 && i <= 7) {
      phase = 'Flowering & Fruiting';
      actions = [
        'Apply potassium-rich foliar spray for fruit quality',
        'Increase irrigation frequency during critical stage',
        'Monitor for storage pests in standing crop',
        'Second top-dressing if needed',
      ];
    } else if (i === 8) {
      phase = 'Harvest Preparation';
      actions = [
        'Reduce irrigation 2-3 weeks before harvest',
        'Assess crop maturity indicators',
        'Arrange harvesting equipment/labor',
        'Plan post-harvest storage/marketing',
      ];
    } else if (i === 9) {
      phase = 'Post-Harvest & Soil Recovery';
      actions = [
        'Harvest and process crop',
        'Incorporate crop residues into soil',
        'Conduct post-season soil test to measure improvement',
        'Plan cover crop or green manure for fallow period',
      ];
    } else {
      phase = 'Fallow/Recovery';
      actions = [
        'Grow green manure crop (Dhaincha/Sunhemp)',
        'Apply vermicompost to rebuild organic carbon',
        'Allow beneficial soil microbes to regenerate',
        'Plan next season based on updated soil test',
      ];
    }

    roadmap.push({ month, phase, actions, month_index: i + 1 });
  }

  return roadmap;
}

// ---------------------------------------------------------------------------
// Gemini AI — Unified Productivity Analysis
// ---------------------------------------------------------------------------
async function getGeminiProductivityInsights(
  soilHealth: any, topCrops: any[], soilData: any,
  weather: any, userState: string, userDistrict: string
) {
  const cropList = topCrops.map((c: any, i: number) =>
    `${i + 1}. ${c.crop} — Compatibility: ${c.compatibility_score}%, Grade: ${c.compatibility_grade}`
  ).join('\n');

  const prompt = `
You are an expert agricultural productivity consultant. A farmer's soil has been analyzed with biological indicators and cross-referenced against crop requirements computationally.

SOIL PROFILE:
- N: ${soilData.N} kg/ha, P: ${soilData.P} kg/ha, K: ${soilData.K} kg/ha
- pH: ${soilData.ph}, EC: ${soilData.ec} dS/m, OC: ${soilData.oc}%
- Micronutrients: S=${soilData.S}, Zn=${soilData.zn}, Fe=${soilData.fe}, Cu=${soilData.cu}, Mn=${soilData.Mn}, B=${soilData.B}

SOIL HEALTH: ${soilHealth?.fertility_class || 'Unknown'} (SHI: ${soilHealth?.soil_health_index || 'N/A'}/100)
Deficiencies: ${soilHealth?.deficiencies?.join(', ') || 'None'}

${weather ? `WEATHER: ${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.rainfall}mm rainfall` : ''}
LOCATION: ${userDistrict || 'Unknown'}, ${userState || 'Unknown'}, India

TOP CROP MATCHES (by computational soil-crop compatibility):
${cropList}

Provide a unified crop productivity optimization plan. Respond ONLY with this exact JSON (no markdown fences):
{
  "executive_summary": "3-4 sentence overview connecting soil health to productivity potential",
  "recommended_crop_strategy": "2-3 sentences on which crop to grow and why based on this specific soil",
  "productivity_forecast": "2-3 sentences on expected yields with and without soil amendments",
  "biological_investment_advice": "2-3 sentences on which biological inputs will give the best ROI",
  "seasonal_strategy": "Which season (kharif/rabi/zaid) is best for the top crop in this region",
  "risk_factors": ["list of 3-4 risks based on actual soil/weather data"],
  "optimization_tips": ["list of 4-5 actionable tips for maximum productivity"]
}`.trim();

  let lastError = null;
  for (const modelName of MODEL_CHAIN) {
    try {
      const geminiModel = getGenAI().getGenerativeModel({ model: modelName });
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();
      if (!text) throw new Error('Empty response');
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      const msg = err.message || '';
      const shouldTryNext = msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('404') || msg.includes('not found') || msg.includes('not supported') ||
        msg.includes('deprecated') || msg.includes('rate limit');
      lastError = err;
      if (shouldTryNext && isQuotaError(err)) rotateKey();
      if (!shouldTryNext) throw err;
    }
  }

  // Fallback
  return {
    executive_summary: `Your soil is classified as ${soilHealth?.fertility_class || 'Unknown'} with a health index of ${soilHealth?.soil_health_index || 'N/A'}/100. ${topCrops[0]?.crop || 'The recommended crop'} shows ${topCrops[0]?.compatibility_score || 'N/A'}% compatibility. With targeted biological amendments, productivity can be improved significantly.`,
    recommended_crop_strategy: `${topCrops[0]?.crop || 'The top crop'} is the best match for your soil profile. Focus on addressing ${soilHealth?.deficiencies?.slice(0, 3).join(', ') || 'nutrient deficiencies'} before sowing.`,
    productivity_forecast: `Expected yields at current soil health: ${topCrops[0]?.yield_potential?.average_q_per_ha || 'moderate'} q/ha. With remediation, yields could increase by ${topCrops[0]?.yield_potential?.yield_uplift_with_remediation_pct || 10}%.`,
    biological_investment_advice: 'Invest in biofertilizers (Azotobacter, PSB) as first priority — they provide the best ROI. Supplement with organic amendments like vermicompost and neem cake for sustained improvement.',
    seasonal_strategy: 'Plan sowing based on regional monsoon patterns. Kharif season (June-September) suits most rain-fed crops; Rabi (October-February) is ideal for wheat, chickpea, and mustard.',
    risk_factors: [
      soilHealth?.deficiencies?.length > 3 ? 'Multiple nutrient deficiencies may limit initial yields' : 'Minor nutrient adjustments needed',
      'Market price volatility for the selected crop',
      'Monsoon variability affecting rain-fed cultivation',
    ],
    optimization_tips: [
      'Apply recommended biofertilizers at sowing for immediate benefit',
      'Conduct soil testing every 6 months to track improvement',
      'Practice crop rotation with legumes to fix nitrogen naturally',
      'Use drip irrigation to optimize water and nutrient delivery',
      'Maintain organic carbon above 0.75% through composting',
    ],
  };
}
