import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { getGenAI, rotateKey, isQuotaError, GEMINI_MODELS } from '../utils/geminiClient';

const SOIL_HEALTH_API = process.env.SOIL_HEALTH_API_URL || 'http://localhost:8002';
const MODEL_CHAIN = GEMINI_MODELS;

// ---------------------------------------------------------------------------
// POST /api/soil-health/assess
// ---------------------------------------------------------------------------
export const assessSoilHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🧪 Soil health assessment request:', req.body);

    const { N, P, K, ph, ec, oc, S, zn, fe, cu, Mn, B } = req.body;

    // Validate required fields
    const fields = { N, P, K, ph, ec, oc, S, zn, fe, cu, Mn, B };
    const missing = Object.entries(fields)
      .filter(([_, v]) => v === undefined || v === null || v === '' || isNaN(Number(v)))
      .map(([k]) => k);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing or invalid soil parameters: ${missing.join(', ')}`,
      });
    }

    // Build payload for ML API
    const mlPayload = {
      N: parseFloat(N),
      P: parseFloat(P),
      K: parseFloat(K),
      ph: parseFloat(ph),
      ec: parseFloat(ec),
      oc: parseFloat(oc),
      S: parseFloat(S),
      zn: parseFloat(zn),
      fe: parseFloat(fe),
      cu: parseFloat(cu),
      Mn: parseFloat(Mn),
      B: parseFloat(B),
    };

    // Call ML service
    let mlResult: any;
    try {
      const { data } = await axios.post(`${SOIL_HEALTH_API}/assess`, mlPayload, {
        timeout: 15000,
      });
      mlResult = data;
      console.log('✅ Soil ML result:', mlResult.fertility_class, 'SHI:', mlResult.soil_health_index);
    } catch (err: any) {
      console.error('❌ Soil Health ML API error:', err.message);
      return res.status(503).json({
        success: false,
        message: 'Soil Health ML service is not available. Please ensure the Python service is running on port 8002.',
      });
    }

    // Optionally enrich with Gemini AI insights
    let aiInsights: any = null;
    try {
      aiInsights = await getGeminiSoilInsights(mlResult, mlPayload);
      console.log('✅ Gemini insights generated');
    } catch (err: any) {
      console.warn('⚠️ Gemini insights unavailable:', err.message?.slice(0, 100));
      // Non-critical — continue without AI insights
    }

    return res.status(200).json({
      success: true,
      assessment: {
        ...mlResult,
        ai_insights: aiInsights,
      },
    });
  } catch (err: any) {
    console.error('❌ assessSoilHealth error:', err.message);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Gemini AI enrichment
// ---------------------------------------------------------------------------
async function getGeminiSoilInsights(mlResult: any, soilData: any) {
  const defList = mlResult.deficiencies?.join(', ') || 'None';
  const excList = mlResult.excesses?.join(', ') || 'None';

  const prompt = `
You are an expert soil scientist and agronomist. A farmer has submitted a soil sample with the following results:

SOIL PARAMETERS:
- Nitrogen (N): ${soilData.N} kg/ha
- Phosphorous (P): ${soilData.P} kg/ha
- Potassium (K): ${soilData.K} kg/ha
- pH: ${soilData.ph}
- Electrical Conductivity: ${soilData.ec} dS/m
- Organic Carbon: ${soilData.oc}%
- Sulfur: ${soilData.S} mg/kg
- Zinc: ${soilData.zn} mg/kg
- Iron: ${soilData.fe} mg/kg
- Copper: ${soilData.cu} mg/kg
- Manganese: ${soilData.Mn} mg/kg
- Boron: ${soilData.B} mg/kg

ML ASSESSMENT:
- Fertility Class: ${mlResult.fertility_class}
- Soil Health Index: ${mlResult.soil_health_index}/100
- Deficiencies: ${defList}
- Excesses: ${excList}

Provide a comprehensive soil improvement plan. Respond ONLY with this exact JSON (no markdown fences):
{
  "overall_assessment": "2-3 sentence overview of soil health status using actual values",
  "improvement_plan": [
    {
      "priority": 1,
      "action": "specific action with quantities and timing",
      "expected_impact": "what improvement farmer can expect",
      "timeline": "when to implement and when to expect results"
    }
  ],
  "suitable_crops": ["list of 5-6 crops that would grow well in this soil"],
  "organic_practices": "2-3 sentences on organic/biological farming practices suited to this soil profile",
  "estimated_improvement_timeline": "how long until the soil reaches optimal fertility with proper management"
}`.trim();

  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      const geminiModel = getGenAI().getGenerativeModel({ model: modelName });
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) throw new Error('Empty response');

      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (err: any) {
      const msg = err.message || '';
      const shouldTryNext =
        msg.includes('quota') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('not supported') ||
        msg.includes('deprecated') ||
        msg.includes('rate limit');

      lastError = err;
      if (shouldTryNext && isQuotaError(err)) rotateKey();
      if (!shouldTryNext) throw err;
    }
  }

  // Static fallback if all Gemini models exhausted
  return {
    overall_assessment: `Your soil is classified as ${mlResult.fertility_class} with a health index of ${mlResult.soil_health_index}/100. ${mlResult.deficiencies?.length ? `Key deficiencies in ${defList} need attention.` : 'Nutrient levels are generally adequate.'}`,
    improvement_plan: [
      {
        priority: 1,
        action: 'Apply organic compost at 5-8 tonnes per acre and incorporate into top 15cm of soil',
        expected_impact: 'Improves organic carbon, soil structure, and microbial activity',
        timeline: 'Apply before next sowing season; benefits visible within 2-3 months',
      },
      {
        priority: 2,
        action: 'Address specific nutrient deficiencies with targeted biofertilizers as recommended',
        expected_impact: 'Corrects nutrient imbalances and improves plant uptake',
        timeline: 'Apply at sowing; retest soil after 6 months',
      },
    ],
    suitable_crops: ['Rice', 'Wheat', 'Maize', 'Soybean', 'Groundnut'],
    organic_practices: 'Practice crop rotation with legumes to fix nitrogen naturally. Use green manuring with Sunhemp or Dhaincha during fallow periods. Apply vermicompost and use Trichoderma-enriched FYM.',
    estimated_improvement_timeline: 'With consistent management, soil health can improve by 15-25% within 2 cropping seasons (approximately 8-12 months).',
  };
}
