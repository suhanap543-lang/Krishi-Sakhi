import { Request, Response, NextFunction } from 'express';
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGenAI, rotateKey, isQuotaError, isRetryableError, GEMINI_MODELS } from '../utils/geminiClient';
import GeoCache from "../models/GeoCache";
import Recommendation from "../models/Recommendation";

// genAI is now resolved dynamically via getGenAI() for key rotation
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8001";
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;

const MODEL_CHAIN = GEMINI_MODELS; // ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']

// ---------------------------------------------------------------------------
// Helper – fetch weather
// ---------------------------------------------------------------------------
async function fetchWeather(lat: number, lon: number) {
  const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const ONE_HOUR = 60 * 60 * 1000;

  const cached = await GeoCache.findOne({ key: cacheKey });
  if (cached && Date.now() - new Date(cached.updatedAt as any).getTime() < ONE_HOUR) {
    console.log("✅ Weather from cache");
    return cached.data as any;
  }

  try {
    console.log("🌤️  Fetching weather for:", lat, lon);
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const weather = {
      temperature: data.main.temp,
      humidity:    data.main.humidity,
      rainfall:    data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0,
      description: data.weather?.[0]?.description ?? "",
      city:        data.name                ?? "Unknown",
      state:       data.sys?.state          ?? "",  // often empty from OWM
      country:     data.sys?.country        ?? "IN",
    };

    await GeoCache.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, data: weather, updatedAt: new Date() },
      { upsert: true }
    );

    console.log("✅ Weather fetched:", weather);
    return weather;
  } catch (err: any) {
    console.error("❌ Weather API error:", err.response?.data || err.message);
    return {
      temperature: 25, humidity: 60, rainfall: 100,
      description: "unavailable",
      city: "Unknown", state: "", country: "India",
    };
  }
}

// ---------------------------------------------------------------------------
// Helper – call ML model
// ---------------------------------------------------------------------------
async function callMLModel(payload: any) {
  try {
    const { data } = await axios.post(`${ML_API_URL}/predict`, payload, {
      timeout: 10000,
    });
    console.log("✅ ML result:", data);
    return data;
  } catch (err: any) {
    console.error("❌ ML API error:", err.message);
    throw new Error(`ML model unreachable: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Helper – determine season from temperature & month
// ---------------------------------------------------------------------------
function getSeason(tempC: number) {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 6 && month <= 9) return "kharif (monsoon)";
  if (month >= 10 && month <= 2) return "rabi (winter)";
  return "zaid (summer)";
}

function getSowingAdvice(crop: string, tempC: number, rainfall: number, humidity: number, stateName: string) {
  const season = getSeason(tempC);
  const isCold = tempC < 15;
  const isHot = tempC > 32;

  // Temperature-based sowing guidance
  let timing = "";
  if (season === "kharif (monsoon)") {
    timing = `Current ${season} season (June–September) is ideal for monsoon crops. With ${tempC}°C temperature and ${rainfall}mm rainfall, `;
    timing += rainfall > 50 ? `sow ${crop} immediately to benefit from active rainfall.` : `wait for consistent monsoon rains before sowing ${crop}.`;
  } else if (season === "rabi (winter)") {
    timing = `Current ${season} season (October–February) suits winter crops. At ${tempC}°C, `;
    timing += isCold ? `sow cold-tolerant varieties of ${crop} in ${stateName}.` : `conditions are favorable — sow ${crop} soon for best results.`;
  } else {
    timing = `Current ${season} season (March–May) with ${tempC}°C temperature. `;
    timing += isHot ? `Consider heat-resistant varieties of ${crop} and ensure irrigation.` : `Good window to sow ${crop} before peak summer.`;
  }
  return timing;
}

function getYieldEstimate(crop: string, tempC: number, rainfall: number, humidity: number, soilN: number, soilP: number, soilK: number) {
  // General yield ranges based on conditions
  const goodTemp = tempC >= 20 && tempC <= 35;
  const goodRain = rainfall >= 50 && rainfall <= 200;
  const goodNutrients = soilN > 40 && soilP > 30 && soilK > 30;

  let quality = "moderate";
  if (goodTemp && goodRain && goodNutrients) quality = "above-average";
  else if (!goodTemp || (!goodRain && rainfall < 20)) quality = "below-average";

  return `Expected ${quality} yield for ${crop}. With current conditions (${tempC}°C, ${humidity}% humidity, ${rainfall}mm rain) and soil NPK (${soilN}/${soilP}/${soilK}), ` +
    (quality === "above-average"
      ? `yields of 15-25% above regional average are achievable with good management.`
      : quality === "below-average"
        ? `yields may be 10-20% below average. Consider supplementary irrigation and targeted fertilization.`
        : `yields should meet regional averages. Follow recommended practices to maximize output.`);
}

// ---------------------------------------------------------------------------
// Helper – Gemini explanation
// ---------------------------------------------------------------------------
async function getGeminiExplanation({ modelContext, farmerName, userState, userDistrict, irrigationType, landSizeAcres }: any) {
  const { soil, weather, location, ml_recommendations, primary_crop } = modelContext;

  // Use the user's profile state/district if weather API returned "Unknown"
  const resolvedState    = (location.state && location.state !== "Unknown") ? location.state : (userState || "the region");
  const resolvedCity     = (location.city && location.city !== "Unknown") ? location.city : (userDistrict || "the area");

  const prompt = `
You are an expert agricultural advisor specializing in crops grown in ${location.country},
specifically the ${resolvedState} region near ${resolvedCity}.

A farmer named ${farmerName || "the farmer"} at coordinates
(${location.lat}, ${location.lon}) has submitted the following data:

SOIL ANALYSIS
- Nitrogen (N)    : ${soil.nitrogen_kg_ha} kg/ha
- Phosphorous (P) : ${soil.phosphorous_kg_ha} kg/ha
- Potassium (K)   : ${soil.potassium_kg_ha} kg/ha
- Soil pH         : ${soil.ph}
- Soil Type       : ${soil.type || "Not specified"}

FARM DETAILS
- Irrigation Type : ${irrigationType || "Not specified"}
- Land Size       : ${landSizeAcres ? landSizeAcres + " acres" : "Not specified"}

CURRENT LOCAL WEATHER — ${resolvedCity}, ${resolvedState}
- Temperature : ${weather.temperature_c}°C
- Humidity    : ${weather.humidity_pct}%
- Rainfall    : ${weather.rainfall_mm} mm
- Condition   : ${weather.description || "N/A"}

ML MODEL RECOMMENDATIONS
${ml_recommendations.map((r: any) => `  ${r.rank}. ${r.crop.toUpperCase()} — confidence: ${r.confidence_pct}`).join("\n")}

YOUR TASK
1. Validate whether "${primary_crop}" is actually grown and commercially viable in ${resolvedState}, ${location.country}.
2. If NOT suitable for this region, recommend a better crop from the ML top-3 OR suggest a locally appropriate crop.
3. Consider local climate, seasonal patterns, and farming practices specific to ${resolvedState}.
4. Use the ACTUAL WEATHER DATA above (temperature: ${weather.temperature_c}°C, humidity: ${weather.humidity_pct}%, rainfall: ${weather.rainfall_mm}mm) to give specific, data-driven recommendations. Do NOT give generic advice like "consult local office" — use the numbers.
5. Generate 6 detailed, actionable recommendation cards covering: crop planning, soil health, irrigation, pest control, fertilizer, and best practices. Each must reference the actual weather and soil data.
6. Factor in the irrigation type (${irrigationType || "not specified"}) when giving irrigation recommendations — e.g., if drip irrigation is available, recommend efficient water usage strategies for drip; if rain-fed, focus on water conservation.
7. Factor in the land size (${landSizeAcres ? landSizeAcres + " acres" : "not specified"}) when estimating yield and providing practical advice scaled to the farm's size.

IMPORTANT: Your bestSowingTime must consider the current temperature (${weather.temperature_c}°C) and rainfall (${weather.rainfall_mm}mm).
Your estimatedYield must consider the soil NPK values, current weather conditions, AND land size (${landSizeAcres ? landSizeAcres + " acres" : "N/A"}).
Your detailedRecommendations must reference specific weather values, soil numbers, irrigation type, and land size — NOT generic advice.

Respond ONLY with this exact JSON (no markdown fences):
{
  "finalCrop": "the crop you recommend",
  "mlAgreed": true or false,
  "explanation": "2-3 sentences why this crop suits their soil (Type: ${soil.type || "Not Specified"}, N:${soil.nitrogen_kg_ha}, P:${soil.phosphorous_kg_ha}, K:${soil.potassium_kg_ha}), weather (${weather.temperature_c}°C, ${weather.humidity_pct}% humidity) AND location (${resolvedState})",
  "regionalNote": "1 sentence about why this crop is suitable in ${resolvedState}",
  "soilInsights": "analysis of N/P/K balance and pH suitability with specific numbers",
  "growingTips": ["tip1 using actual weather data", "tip2 specific to ${resolvedState}", "tip3"],
  "warnings": ["soil or weather risks based on actual values"],
  "bestSowingTime": "specific sowing window considering current ${weather.temperature_c}°C and ${weather.rainfall_mm}mm rainfall in ${resolvedState}",
  "estimatedYield": "yield estimate based on soil NPK(${soil.nitrogen_kg_ha}/${soil.phosphorous_kg_ha}/${soil.potassium_kg_ha}) and weather(${weather.temperature_c}°C) in ${resolvedState}",
  "nearbyMarkets": "common markets or mandis in ${resolvedState} for this crop",
  "detailedRecommendations": [
    {
      "category": "crop_planning",
      "title": "specific title about crop rotation or strategy",
      "description": "2-3 sentences with actionable crop planning advice using weather data (${weather.temperature_c}°C, ${weather.rainfall_mm}mm) and soil data",
      "impact": "high or medium or low",
      "tags": ["#crop", "#rotation", "#yield"]
    },
    {
      "category": "soil_health",
      "title": "specific title about soil improvement",
      "description": "2-3 sentences referencing actual NPK values (N:${soil.nitrogen_kg_ha}, P:${soil.phosphorous_kg_ha}, K:${soil.potassium_kg_ha}, pH:${soil.ph})",
      "impact": "high or medium or low",
      "tags": ["#soil", "#organic", "#compost"]
    },
    {
      "category": "irrigation",
      "title": "specific title about irrigation strategy",
      "description": "2-3 sentences considering current rainfall (${weather.rainfall_mm}mm), humidity (${weather.humidity_pct}%), and temperature (${weather.temperature_c}°C)",
      "impact": "high or medium or low",
      "tags": ["#irrigation", "#water"]
    },
    {
      "category": "pest_control",
      "title": "specific title about pest management",
      "description": "2-3 sentences considering humidity (${weather.humidity_pct}%) and temperature (${weather.temperature_c}°C) which affect pest prevalence",
      "impact": "high or medium or low",
      "tags": ["#pest", "#IPM", "#bio"]
    },
    {
      "category": "fertilizer",
      "title": "specific title about fertilizer application",
      "description": "2-3 sentences with dosage recommendations based on actual soil NPK values",
      "impact": "high or medium or low",
      "tags": ["#fertilizer", "#NPK"]
    },
    {
      "category": "best_practices",
      "title": "specific title about best practices",
      "description": "2-3 sentences with seasonal best practices for current weather conditions",
      "impact": "medium",
      "tags": ["#practices", "#seasonal"]
    }
  ]
}`.trim();

  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 Trying model: ${modelName}`);
      const geminiModel = getGenAI().getGenerativeModel({ model: modelName });
      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) throw new Error("Empty response");

      console.log(`✅ Success with model: ${modelName}`);

      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (err: any) {
      const msg = err.message || "";

      const shouldTryNext =
        msg.includes("quota")             ||
        msg.includes("429")               ||
        msg.includes("RESOURCE_EXHAUSTED")||
        msg.includes("404")               ||
        msg.includes("not found")         ||
        msg.includes("not supported")     ||
        msg.includes("deprecated")        ||
        msg.includes("rate limit")        ||
        msg.includes("503")               ||
        msg.includes("500")               ||
        msg.includes("unavailable")       ||
        msg.includes("high demand")       ||
        msg.includes("fetch failed");

      console.warn(`⚠️  Model ${modelName} failed: ${msg.slice(0, 120)}`);
      lastError = err;

      if (shouldTryNext) {
        if (isQuotaError(err)) rotateKey();
      } else {
        throw err;
      }
    }
  }

  // All models exhausted — structured fallback using REAL weather data
  console.error("❌ All Gemini models exhausted, using weather-aware static fallback");

  const tempC = weather.temperature_c || 25;
  const humPct = weather.humidity_pct || 60;
  const rainMm = weather.rainfall_mm || 0;

  const sowingAdvice = getSowingAdvice(primary_crop, tempC, rainMm, humPct, resolvedState);
  const yieldEstimate = getYieldEstimate(primary_crop, tempC, rainMm, humPct, soil.nitrogen_kg_ha, soil.phosphorous_kg_ha, soil.potassium_kg_ha);

  return {
    finalCrop:    primary_crop,
    mlAgreed:     true,
    explanation:  `Based on your soil nutrients (N:${soil.nitrogen_kg_ha}, P:${soil.phosphorous_kg_ha}, K:${soil.potassium_kg_ha}, pH:${soil.ph}) and current weather conditions (${tempC}°C, ${humPct}% humidity, ${rainMm}mm rainfall) in ${resolvedCity}, ${resolvedState}, ${primary_crop} is recommended as the best crop for your farm.`,
    regionalNote: `${primary_crop} is commonly cultivated in ${resolvedState} due to favorable agro-climatic conditions.`,
    soilInsights: `Your soil has Nitrogen: ${soil.nitrogen_kg_ha} kg/ha, Phosphorous: ${soil.phosphorous_kg_ha} kg/ha, Potassium: ${soil.potassium_kg_ha} kg/ha with pH ${soil.ph}. ${soil.ph < 6 ? "The slightly acidic pH may need lime application for optimal nutrient uptake." : soil.ph > 7.5 ? "The alkaline pH might require sulfur amendment to improve nutrient availability." : "The near-neutral pH is ideal for most crops."}`,
    growingTips: [
      `At ${tempC}°C, ${tempC > 30 ? "ensure adequate shade and mulching to protect seedlings from heat stress" : tempC < 15 ? "use row covers or mulch to protect crops from cold damage" : "conditions are favorable for healthy crop growth"}`,
      `With ${humPct}% humidity, ${humPct > 70 ? "increase plant spacing for better air circulation and monitor for fungal diseases" : humPct < 40 ? "consider drip irrigation and mulching to conserve soil moisture" : "standard spacing and irrigation practices are suitable"}`,
      `Current rainfall of ${rainMm}mm ${rainMm > 100 ? "is high — ensure proper drainage to prevent waterlogging and root rot" : rainMm < 20 ? "is low — plan supplementary irrigation at critical growth stages" : "is adequate but monitor forecasts and adjust irrigation accordingly"}`,
    ],
    warnings: [
      tempC > 35 ? `⚠️ High temperature alert: ${tempC}°C may cause heat stress. Consider shade nets.` : "",
      humPct > 80 ? `⚠️ High humidity: ${humPct}% increases risk of fungal infections. Apply preventive fungicide.` : "",
      rainMm > 200 ? `⚠️ Excessive rainfall: ${rainMm}mm may cause waterlogging. Ensure field drainage.` : "",
      rainMm === 0 ? `⚠️ No recent rainfall detected. Plan irrigation to meet crop water requirements.` : "",
    ].filter(Boolean),
    bestSowingTime: sowingAdvice,
    estimatedYield: yieldEstimate,
    nearbyMarkets:  `Check local mandis and agricultural markets in ${resolvedCity}, ${resolvedState} for current ${primary_crop} prices.`,
    detailedRecommendations: [
      {
        category: "crop_planning",
        title: `Crop Planning Strategy for ${primary_crop} at ${tempC}°C`,
        description: `With current temperature of ${tempC}°C and ${rainMm}mm rainfall in ${resolvedState}, ${getSeason(tempC)} season crops are optimal. After harvesting ${primary_crop}, rotate with legumes to fix nitrogen naturally. Plan succession planting to ensure year-round farm income.`,
        impact: "high",
        tags: ["#crop", "#rotation", "#yield", "#seasonal"],
      },
      {
        category: "soil_health",
        title: `Soil Improvement Plan (N:${soil.nitrogen_kg_ha}, P:${soil.phosphorous_kg_ha}, K:${soil.potassium_kg_ha})`,
        description: `Your soil NPK is ${soil.nitrogen_kg_ha}/${soil.phosphorous_kg_ha}/${soil.potassium_kg_ha} kg/ha with pH ${soil.ph}. ${soil.nitrogen_kg_ha < 50 ? "Nitrogen is low — apply urea at 50-60 kg/acre or use green manure." : "Nitrogen levels are adequate."} ${soil.ph < 6 ? "Add agricultural lime (2-3 tonnes/ha) to raise pH." : soil.ph > 7.5 ? "Apply sulfur to reduce pH." : "pH is in the ideal range."} Add organic compost (5-8 tonnes/acre) for long-term improvement.`,
        impact: "high",
        tags: ["#soil", "#NPK", "#pH", "#organic"],
      },
      {
        category: "irrigation",
        title: `Irrigation Strategy (${tempC}°C, ${rainMm}mm rainfall)`,
        description: `With ${rainMm}mm current rainfall and ${humPct}% humidity at ${tempC}°C: ${rainMm > 100 ? "rainfall is sufficient — reduce irrigation frequency and ensure proper drainage." : rainMm > 40 ? "supplement with light irrigation during dry spells, focusing on critical growth stages." : "rainfall is low — implement scheduled irrigation. Drip systems save 30-50% water compared to flood irrigation."} ${tempC > 30 ? "Higher evapotranspiration at " + tempC + "°C means crops need 15-20% more water." : ""}`,
        impact: "high",
        tags: ["#irrigation", "#water", "#drip", "#drainage"],
      },
      {
        category: "pest_control",
        title: `Pest Management at ${humPct}% Humidity`,
        description: `At ${tempC}°C and ${humPct}% humidity: ${humPct > 70 ? "high moisture promotes fungal diseases (blast, blight). Apply Trichoderma bio-fungicide preventively." : "moderate humidity reduces fungal risk, but monitor for sucking pests."} ${tempC > 28 ? "Warm conditions favor aphids and borers — install yellow sticky traps and use neem oil (5ml/L) as bio-pesticide." : "Cooler temperatures slow pest reproduction; focus on preventive measures."}`,
        impact: "medium",
        tags: ["#pest", "#IPM", "#bio", "#fungal"],
      },
      {
        category: "fertilizer",
        title: `Fertilizer Schedule for NPK ${soil.nitrogen_kg_ha}/${soil.phosphorous_kg_ha}/${soil.potassium_kg_ha}`,
        description: `Based on your soil (N:${soil.nitrogen_kg_ha}, P:${soil.phosphorous_kg_ha}, K:${soil.potassium_kg_ha} kg/ha): ${soil.nitrogen_kg_ha < 60 ? "Apply 45-60 kg/ha additional N in 3 split doses." : "N is adequate — maintain with organic inputs."} ${soil.phosphorous_kg_ha < 40 ? "Apply DAP at 40-50 kg/acre at sowing." : "P is sufficient."} ${soil.potassium_kg_ha < 40 ? "Apply MOP at 25-30 kg/acre." : "K levels are good."} With ${rainMm}mm rainfall, ${rainMm > 100 ? "avoid broadcasting — use placement to prevent nutrient leaching." : "broadcast application is acceptable."}`,
        impact: "medium",
        tags: ["#fertilizer", "#NPK", "#dosage", "#timing"],
      },
      {
        category: "best_practices",
        title: `Best Practices for ${primary_crop} in ${resolvedState} (${getSeason(tempC)} Season)`,
        description: `For ${getSeason(tempC)} season in ${resolvedState} at ${tempC}°C: ${tempC > 30 ? "Apply mulch (5-7cm) to conserve moisture and reduce soil temperature." : "Ensure adequate sunlight exposure for photosynthesis."} ${humPct > 70 ? "Increase plant spacing by 15% for better air circulation." : ""} Schedule soil testing every 6 months. Follow local Krishi Vigyan Kendra (KVK) advisory for ${primary_crop} in ${resolvedState}.`,
        impact: "medium",
        tags: ["#practices", "#seasonal", "#KVK", "#mulching"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// POST /api/recommendations/crop
// ---------------------------------------------------------------------------
export const getCropRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("📥 Request body:", req.body);

    const { N, P, K, ph, lat, lon, farmId, userState, userDistrict, soilType, irrigationType, landSizeAcres } = req.body;
    const farmerId = (req as any).farmer?._id || req.body.farmerId;

    if ([N, P, K, ph].some((v) => v === undefined || v === null || isNaN(Number(v)))) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid values for N, P, K, and pH.",
      });
    }
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Location (lat, lon) is required to fetch weather data.",
      });
    }

    const weather = await fetchWeather(parseFloat(lat), parseFloat(lon));
    console.log("✅ Weather fetched:", weather);

    // Resolve location: prefer user-provided state/district, fall back to weather API
    const resolvedCity  = (weather.city && weather.city !== "Unknown") ? weather.city : (userDistrict || "Unknown");
    const resolvedState = (weather.state && weather.state !== "Unknown" && weather.state !== "") ? weather.state : (userState || "Unknown");

    // Pass location + weather into ML payload so it builds full model_context
    const mlPayload = {
      N:           parseFloat(N),
      P:           parseFloat(P),
      K:           parseFloat(K),
      ph:          parseFloat(ph),
      temperature: weather.temperature,
      humidity:    weather.humidity,
      rainfall:    weather.rainfall,
      // location fields forwarded to FastAPI — use resolved values
      city:                resolvedCity,
      state:               resolvedState,
      country:             weather.country || "India",
      lat:                 parseFloat(lat),
      lon:                 parseFloat(lon),
      weather_description: weather.description || "",
      soil_type:           soilType || "",
    };

    const mlResult = await callMLModel(mlPayload);
    console.log("✅ ML result:", mlResult);

    const farmerName = (req as any).farmer?.name || req.body.farmerName || "Farmer";

    // Use the rich model_context returned by FastAPI for Gemini
    const geminiData = await getGeminiExplanation({
      modelContext: mlResult.model_context,
      farmerName,
      userState: userState || resolvedState,
      userDistrict: userDistrict || resolvedCity,
      irrigationType: irrigationType || "",
      landSizeAcres: landSizeAcres || "",
    });
    console.log("✅ Gemini data:", geminiData);

    // Ensure detailedRecommendations always exists (safeguard if Gemini omits it)
    const crop = geminiData.finalCrop || mlResult.recommended_crop;
    const loc  = mlResult.model_context.location;
    const mSoil = mlResult.model_context.soil;
    const mWeather = mlResult.model_context.weather;
    const stName = (loc.state && loc.state !== "Unknown") ? loc.state : resolvedState;

    if (!geminiData.detailedRecommendations || !Array.isArray(geminiData.detailedRecommendations) || geminiData.detailedRecommendations.length === 0) {
      const tempC = mWeather?.temperature_c || weather.temperature || 25;
      const humPct = mWeather?.humidity_pct || weather.humidity || 60;
      const rainMm = mWeather?.rainfall_mm || weather.rainfall || 0;

      geminiData.detailedRecommendations = [
        { category: "crop_planning", title: `Crop Planning for ${crop} at ${tempC}°C`, description: `With ${tempC}°C and ${rainMm}mm rainfall in ${stName}, ${getSeason(tempC)} season crops are optimal. After ${crop}, rotate with legumes to fix nitrogen. Plan succession planting for year-round income.`, impact: "high", tags: ["#crop", "#rotation", "#yield"] },
        { category: "soil_health", title: `Soil Health (N:${mSoil.nitrogen_kg_ha}, P:${mSoil.phosphorous_kg_ha}, K:${mSoil.potassium_kg_ha})`, description: `Your soil NPK is ${mSoil.nitrogen_kg_ha}/${mSoil.phosphorous_kg_ha}/${mSoil.potassium_kg_ha} kg/ha, pH ${mSoil.ph}. Add organic compost (5-8 tonnes/acre) and vermicompost. ${mSoil.ph < 6 ? "Apply lime to raise pH." : mSoil.ph > 7.5 ? "Apply sulfur to lower pH." : "pH is ideal."}`, impact: "high", tags: ["#soil", "#organic", "#compost"] },
        { category: "irrigation", title: `Irrigation Plan (${rainMm}mm rain, ${tempC}°C)`, description: `${rainMm > 100 ? "Adequate rainfall — reduce irrigation and ensure drainage." : rainMm > 40 ? "Moderate rain — supplement with light irrigation at critical stages." : "Low rainfall — implement scheduled drip irrigation (saves 30-50% water)."} At ${tempC}°C, ${tempC > 30 ? "evapotranspiration is high, increase water by 15-20%." : "water needs are standard."}`, impact: "high", tags: ["#irrigation", "#water", "#drip"] },
        { category: "pest_control", title: `Pest Management at ${humPct}% Humidity`, description: `${humPct > 70 ? "High humidity promotes fungal diseases — apply Trichoderma preventively and increase spacing." : "Moderate humidity — monitor for sucking pests."} At ${tempC}°C, ${tempC > 28 ? "aphids and borers are active — use neem oil (5ml/L)." : "pest pressure is lower."}`, impact: "medium", tags: ["#pest", "#IPM", "#bio"] },
        { category: "fertilizer", title: `Fertilizer for NPK ${mSoil.nitrogen_kg_ha}/${mSoil.phosphorous_kg_ha}/${mSoil.potassium_kg_ha}`, description: `${mSoil.nitrogen_kg_ha < 60 ? "Apply 45-60 kg/ha additional N in split doses." : "N is adequate."} ${mSoil.phosphorous_kg_ha < 40 ? "Apply DAP 40-50 kg/acre at sowing." : "P is sufficient."} ${mSoil.potassium_kg_ha < 40 ? "Apply MOP 25-30 kg/acre." : "K is good."} ${rainMm > 100 ? "Use placement to prevent leaching." : ""}`, impact: "medium", tags: ["#fertilizer", "#NPK", "#dosage"] },
        { category: "best_practices", title: `Best Practices in ${stName} (${getSeason(tempC)})`, description: `For ${getSeason(tempC)} in ${stName}: ${tempC > 30 ? "Apply mulch (5-7cm) to conserve moisture." : "Ensure sunlight exposure."} ${humPct > 70 ? "Widen spacing by 15%." : ""} Follow local KVK advisory for ${crop}. Test soil every 6 months.`, impact: "medium", tags: ["#practices", "#seasonal", "#KVK"] },
      ];
    }

    const saved = await Recommendation.create({
      farmer: farmerId,
      farm:   farmId || null,
      soilData: { N: mlPayload.N, P: mlPayload.P, K: mlPayload.K, ph: mlPayload.ph },
      weather: {
        temperature: weather.temperature,
        humidity:    weather.humidity,
        rainfall:    weather.rainfall,
        location:    resolvedCity,
      },
      recommendedCrop:  geminiData.finalCrop || mlResult.recommended_crop,
      confidence:       mlResult.confidence,
      alternativeCrops: mlResult.top3.slice(1).map((c: any) => c.crop),
      explanation:      geminiData.explanation,
      soilInsights:     geminiData.soilInsights,
      growingTips:      geminiData.growingTips,
      warnings:         geminiData.warnings,
      bestSowingTime:   geminiData.bestSowingTime,
      estimatedYield:   geminiData.estimatedYield,
    });

    return res.status(200).json({
      success: true,
      recommendation: {
        id:              saved._id,
        recommendedCrop: geminiData.finalCrop || mlResult.recommended_crop,
        mlCrop:          mlResult.recommended_crop,
        mlAgreed:        geminiData.mlAgreed,
        confidence:      mlResult.confidence,
        alternativeCrops: mlResult.top3.slice(1),
        weather,
        soilData:        mlPayload,
        location:        mlResult.model_context.location,
        ...geminiData,
      },
    });
  } catch (err: any) {
    console.error("❌ getCropRecommendation error:", err.message);
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/recommendations/history/:farmerId
// ---------------------------------------------------------------------------
export const getRecommendationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmerId } = req.params;
    const recs = await Recommendation.find({ farmer: farmerId })
      .sort({ createdAt: -1 } as any)
      .limit(20)
      .lean();
    return res.status(200).json({ success: true, recommendations: recs });
  } catch (err) {
    next(err);
  }
};
