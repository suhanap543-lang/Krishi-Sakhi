import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGenAI, isQuotaError, rotateKey, isRetryableError, GEMINI_MODELS } from '../utils/geminiClient';
import Farmer from "../models/Farmer";
import Recommendation from "../models/Recommendation";
import Farm from "../models/Farm";
import Activity from "../models/Activity";
import Scheme from "../models/Scheme";
import MarketPrice from "../models/MarketPrice";
import Reminder from "../models/Reminder";

// genAI is now resolved dynamically via getGenAI() for key rotation support

// ── Model fallback chain — tries newest to oldest ──
const MODEL_CHAIN = GEMINI_MODELS; // ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']

async function callGeminiWithFallback(systemText: string, history: any[], message: string) {
  let lastError: any = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`🤖 Trying model: ${modelName}`);

      const geminiModel = getGenAI().getGenerativeModel({
        model: modelName,
        systemInstruction: {
          role: "user",
          parts: [{ text: systemText }],
        },
      });

      const chat = geminiModel.startChat({ history });
      const result = await chat.sendMessage(message);
      const text = result.response.text();

      if (!text) throw new Error("Empty response");

      console.log(`✅ Success with model: ${modelName}`);
      return { text, modelUsed: modelName };
    } catch (err: any) {
      const msg = err.message || "";

      // Retry on ANY of these — quota, not found, deprecated, rate limit
      const shouldTryNext =
        msg.includes("quota")             ||
        msg.includes("429")               ||
        msg.includes("RESOURCE_EXHAUSTED")||
        msg.includes("404")               ||
        msg.includes("not found")         ||
        msg.includes("not supported")     ||
        msg.includes("deprecated")        ||
        msg.includes("rate limit") ||
        msg.includes("overloaded") ||
        msg.includes("unavailable");

      console.warn(`⚠️  Model ${modelName} failed: ${msg.slice(0, 120)}`);
      lastError = err;

      if (shouldTryNext) {
        // Rotate API key on quota/rate errors before trying next model
        if (isQuotaError(err)) rotateKey();
      } else {
        // Non-retryable error — no point trying others
        throw err;
      }
    }
  }

  throw lastError || new Error("All Gemini models exhausted");
}

// ---------------------------------------------------------------------------
// POST /api/chatbot/gemini
// ---------------------------------------------------------------------------
export const geminiChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, language, farmer_id, conversation_history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let farmerInfo = "";
    let cropContext = "";
    let farmContext = "";
    let activityContext = "";
    let schemeContext = "";
    let marketContext = "";
    let reminderContext = "";

    if (farmer_id) {
      try {
        const farmer: any = await Farmer.findById(farmer_id).lean();
        if (farmer) {
          farmerInfo = `Farmer: ${farmer.name}, Location: ${farmer.village || ""}, ${farmer.district || ""}, ${farmer.state || "India"}`;

          // Fetch Farms
          const farms: any[] = await Farm.find({ farmer: farmer_id }).lean();
          if (farms && farms.length > 0) {
            farmContext = "FARMER'S FARMS:\n" + farms.map(f => 
              `- Farm ID: ${f._id} | Name: ${f.name} (${f.land_size_acres} acres, ${f.irrigation_type || 'rain_fed'} ${f.soil_type ? ', ' + f.soil_type + ' soil' : ''})` +
              (f.primary_crops ? ` Primary Crops: ${f.primary_crops}.` : '') +
              (f.nitrogen_value ? ` NPK: ${f.nitrogen_value}/${f.phosphorus_value}/${f.potassium_value}, pH: ${f.soil_ph}` : '')
            ).join("\n");
          }

          // Fetch Activities
          const activities: any[] = await Activity.find({ farmer: farmer_id }).sort({ date: -1 } as any).limit(5).lean();
          if (activities && activities.length > 0) {
            activityContext = "RECENT FARM ACTIVITIES:\n" + activities.map((a: any) => 
              `- ${new Date(a.date).toLocaleDateString()}: ${a.activity_type.toUpperCase()} - ${a.text_note}` + (a.amount ? ` (${a.amount})` : '')
            ).join("\n");
          }

          // Fetch Schemes for their state
          const qState = farmer.state || 'All India';
          const schemes: any[] = await Scheme.find({ 
            status: 'active',
            $or: [{ state: qState }, { category: 'national' }, { state: 'All India' }]
          }).sort({ createdAt: -1 } as any).limit(3).lean();
          if (schemes && schemes.length > 0) {
            schemeContext = "AVAILABLE GOVERNMENT SCHEMES:\n" + schemes.map((s: any) => 
              `- ${s.name}: ${s.description.slice(0, 100)}...`
            ).join("\n");
          }

          // Fetch Active Reminders
          const reminders: any[] = await Reminder.find({ farmer: farmer_id, is_completed: false }).sort({ due_date: 1 } as any).limit(10).lean();
          if (reminders && reminders.length > 0) {
            reminderContext = "ACTIVE REMINDERS:\n" + reminders.map(r => 
              `- ID: ${r._id} | Title: ${r.title} | Due: ${new Date(r.due_date).toLocaleDateString()} | Priority: ${r.priority} | Category: ${r.category}`
            ).join("\n");
          }
        }

        const latestRec: any = await Recommendation.findOne({ farmer: farmer_id })
          .sort({ createdAt: -1 } as any)
          .lean();

        console.log("📋 Latest recommendation fetched for context");

        let crop: string | null = null;

        if (latestRec) {
          crop             = latestRec.recommendedCrop   || latestRec.recommended_crop || null;
          const confidence = latestRec.confidence        ?? 0;
          const altCrops   = latestRec.alternativeCrops  || latestRec.alternative_crops || [];
          const soilN      = latestRec.soilData?.N       ?? "N/A";
          const soilP      = latestRec.soilData?.P       ?? "N/A";
          const soilK      = latestRec.soilData?.K       ?? "N/A";
          const soilPh     = latestRec.soilData?.ph      ?? "N/A";
          const temp       = latestRec.weather?.temperature ?? "N/A";
          const humidity   = latestRec.weather?.humidity    ?? "N/A";
          const rainfall   = latestRec.weather?.rainfall    ?? "N/A";
          const location   = latestRec.weather?.location    || "Unknown";
          const sowingTime = latestRec.bestSowingTime    || "N/A";
          const yieldEst   = latestRec.estimatedYield    || "N/A";
          const insights   = latestRec.soilInsights      || "N/A";
          const tips       = (latestRec.growingTips      || []).join("; ") || "N/A";
          const warnings   = (latestRec.warnings         || []).join("; ") || "None";

          if (crop) {
            cropContext = `
LATEST SMART CROP RECOMMENDATION (ML + Gemini verified):
- Recommended Crop : ${crop}
- Confidence       : ${Math.round(confidence * 100)}%
- Alternative Crops: ${altCrops.join(", ") || "None"}
- Soil (N/P/K/pH)  : ${soilN} / ${soilP} / ${soilK} / ${soilPh}
- Weather          : ${temp}°C, Humidity ${humidity}%, Rainfall ${rainfall}mm
- Location         : ${location}
- Best Sowing Time : ${sowingTime}
- Expected Yield   : ${yieldEst}
- Soil Insights    : ${insights}
- Growing Tips     : ${tips}
- Warnings         : ${warnings}`.trim();
          }
        }

        // Fetch Market Data for the crop across their state
        if (crop && farmer?.state) {
           const prices: any[] = await MarketPrice.find({ 
             state: farmer.state,
             commodity: { $regex: new RegExp(crop, 'i') }
           }).sort({ arrival_date: -1 } as any).limit(3).lean();
           if (prices && prices.length > 0) {
             marketContext = "RECENT MARKET PRICES FOR " + crop.toUpperCase() + ":\n" + prices.map(p => 
               `- Mandi: ${p.market} (${p.district}). Price: ₹${p.modal_price}/quintal (Min: ₹${p.min_price}, Max: ₹${p.max_price}) on ${new Date(p.arrival_date).toLocaleDateString()}`
             ).join("\n");
           }
        }

      } catch (e: any) {
        console.error("❌ Context fetch error:", e.message);
      }
    }

    const systemText = `You are Krishi Sakhi, an expert AI farming assistant for Indian farmers.
${farmerInfo ? `\nFARMER PROFILE:\n${farmerInfo}` : ""}
${farmContext ? `\n${farmContext}` : ""}
${activityContext ? `\n${activityContext}` : ""}
${cropContext ? `\n${cropContext}` : "\nNo crop recommendation available yet. Give general farming advice."}
${marketContext ? `\n${marketContext}` : ""}
${schemeContext ? `\n${schemeContext}` : ""}
${reminderContext ? `\n${reminderContext}` : ""}

RESPONSE RULES:
1. Always respond in ${language || "English"}.
2. Use the crop recommendation data above for personalized advice.
3. For fertilizer/crop/soil questions, end response with <cards> JSON:

<cards>
[
  {
    "type": "fertilizer",
    "title": "Fertilizer Schedule",
    "icon": "🧪",
    "data": {
      "nitrogen": "X kg/ha — Apply in 2 splits",
      "phosphorous": "X kg/ha — Basal application",
      "potassium": "X kg/ha — Basal application",
      "organic": "5 tonnes/ha FYM before sowing"
    }
  },
  {
    "type": "schedule",
    "title": "Crop Calendar",
    "icon": "📅",
    "data": {
      "sowing": "Month range",
      "fertilizing": "Days after sowing",
      "irrigation": "Frequency",
      "harvest": "Month range"
    }
  },
  {
    "type": "warning",
    "title": "Soil Warnings",
    "icon": "⚠️",
    "items": ["warning 1", "warning 2"]
  },
  {
    "type": "tip",
    "title": "Pro Tips",
    "icon": "💡",
    "items": ["tip 1", "tip 2"]
  },
  {
    "type": "market",
    "title": "Market Info",
    "icon": "📈",
    "data": {
      "avgPrice": "₹X–₹Y/quintal",
      "bestMarket": "APMC Mandi, district",
      "season": "Peak price month"
    }
  }
]
</cards>

Only include relevant cards. Not every response needs cards.
4. If the user asks you to set a reminder or alert, include a JSON block in this exact format at the very end of your response. MUST include a valid farm_id from the FARMER'S FARMS section:
<reminder>
{
  "farm_id": "THE_FARM_ID",
  "title": "Short title",
  "description": "Details about the reminder",
  "due_date": "YYYY-MM-DD",
  "category": "operation|scheme|price|weather|pest|general",
  "priority": "high|medium|low"
}
</reminder>
(Note: Today's date is: ${new Date().toISOString()})
5. If the user asks to mark a reminder as complete or done, use the exact ID from the ACTIVE REMINDERS section and include this exact JSON block at the very end of your response:
<complete_reminder>
{
  "reminder_id": "THE_ID_HERE"
}
</complete_reminder>
6. Be concise, friendly, and practical.
7. ACTIVITY LOGGING via Chat: If the user wants to log a farm activity (e.g., "I irrigated today", "Log sowing for tomorrow", "I sprayed pesticide"), you MUST extract the following fields and include a <log_activity> JSON block at the end of your response:
   - farm_id (REQUIRED — must be a valid Farm ID from the FARMER'S FARMS section above. If the farmer has exactly one farm, auto-select it. If multiple farms exist and the user didn't specify which, ASK them which farm.)
   - activity_type (REQUIRED — must be one of: sowing, irrigation, fertilizer, pesticide, weeding, harvesting, pest_issue, disease_issue, other)
   - text_note (a short description of what was done/planned)
   - date (YYYY-MM-DD format. Default to today if not specified.)
   If ANY required field is unclear or missing, DO NOT emit the tag. Instead, ask the user conversationally for the missing info.
   When you have all the info, include:
<log_activity>
{
  "farm_id": "THE_FARM_ID",
  "activity_type": "irrigation",
  "text_note": "Description of the activity",
  "date": "YYYY-MM-DD"
}
</log_activity>
   After logging, confirm to the user what was logged.`;

    // ── Build valid Gemini history ──
    const rawHistory = (conversation_history || []).slice(-10);
    const validHistory: any[] = [];

    for (const m of rawHistory) {
      const role = m.role === "assistant" || m.sender === "bot" ? "model" : "user";
      const text = (m.text || m.content || "").trim();
      if (!text) continue;
      validHistory.push({ role, parts: [{ text }] });
    }

    while (validHistory.length > 0 && validHistory[0].role === "model") {
      validHistory.shift();
    }

    const cleanHistory: any[] = [];
    for (const msg of validHistory) {
      const last = cleanHistory[cleanHistory.length - 1];
      if (last && last.role === msg.role) continue;
      cleanHistory.push(msg);
    }

    const finalHistory = cleanHistory.filter(
      (m) => m.parts[0].text !== message
    );

    console.log(`📜 History length: ${finalHistory.length}`);

    // ── Call Gemini with fallback chain ──
    const { text: fullText, modelUsed } = await callGeminiWithFallback(
      systemText,
      finalHistory,
      message
    );

    // ── Parse <cards> ──
    let reply = fullText;
    let cards = null;

    const cardsMatch = fullText.match(/<cards>([\s\S]*?)<\/cards>/i);
    if (cardsMatch) {
      try {
        cards = JSON.parse(cardsMatch[1].trim());
        reply = reply.replace(/<cards>[\s\S]*?<\/cards>/i, "").trim();
      } catch (e: any) {
        console.error("❌ Cards parse error:", e.message);
      }
    }

    // ── Parse <reminder> ──
    let reminderCreated = false;
    const reminderMatch = fullText.match(/<reminder>([\s\S]*?)<\/reminder>/i);
    if (reminderMatch && farmer_id) {
      try {
        const remData = JSON.parse(reminderMatch[1].trim());
        
        let targetFarmId = remData.farm_id;
        
        // Fallback to the first farm if none provided but farms exist
        if (!targetFarmId) {
           const farms: any[] = await Farm.find({ farmer: farmer_id }).lean();
           if (farms.length > 0) targetFarmId = farms[0]._id;
        }

        if (targetFarmId) {
          await Reminder.create({
            farmer: farmer_id,
            farm: targetFarmId,
            title: remData.title || "New Reminder",
            description: remData.description || "",
            due_date: new Date(remData.due_date),
            category: remData.category || "general",
            priority: remData.priority || "medium",
          });
          reminderCreated = true;
        }
        reply = reply.replace(/<reminder>[\s\S]*?<\/reminder>/i, "").trim();
      } catch (e: any) {
        console.error("❌ Reminder parse error:", e.message);
      }
    }

    // ── Parse <complete_reminder> ──
    let reminderCompleted = false;
    const completeMatch = fullText.match(/<complete_reminder>([\s\S]*?)<\/complete_reminder>/i);
    if (completeMatch && farmer_id) {
      try {
        const compData = JSON.parse(completeMatch[1].trim());
        if (compData.reminder_id) {
          await Reminder.findByIdAndUpdate(compData.reminder_id, { is_completed: true });
          reply = reply.replace(/<complete_reminder>[\s\S]*?<\/complete_reminder>/i, "").trim();
          reminderCompleted = true;
        }
      } catch (e: any) {
        console.error("❌ Complete reminder parse error:", e.message);
      }
    }

    // ── Parse <log_activity> ──
    let activityLogged = false;
    let loggedActivityData = null;
    const activityMatch = fullText.match(/<log_activity>([\s\S]*?)<\/log_activity>/i);
    if (activityMatch && farmer_id) {
      try {
        const actData = JSON.parse(activityMatch[1].trim());
        const validTypes = ['sowing', 'irrigation', 'fertilizer', 'pesticide', 'weeding', 'harvesting', 'pest_issue', 'disease_issue', 'other'];

        let targetFarmId = actData.farm_id;
        // Fallback to first farm if not provided
        if (!targetFarmId) {
          const farms: any[] = await Farm.find({ farmer: farmer_id }).lean();
          if (farms.length > 0) targetFarmId = farms[0]._id;
        }

        const actType = validTypes.includes(actData.activity_type) ? actData.activity_type : 'other';

        if (targetFarmId) {
          const newActivity = await Activity.create({
            farmer: farmer_id,
            farm: targetFarmId,
            activity_type: actType,
            text_note: actData.text_note || '',
            date: actData.date ? new Date(actData.date) : new Date(),
          });
          activityLogged = true;
          loggedActivityData = {
            id: newActivity._id,
            activity_type: actType,
            text_note: actData.text_note || '',
            date: actData.date || new Date().toISOString().split('T')[0],
          };
          console.log(`✅ Activity logged via chat: ${actType} for farmer ${farmer_id}`);
        }
        reply = reply.replace(/<log_activity>[\s\S]*?<\/log_activity>/i, "").trim();
      } catch (e: any) {
        console.error("❌ Activity log parse error:", e.message);
      }
    }

    return res.status(200).json({
      success: true,
      reply,
      cards,
      reminderCreated,
      reminderCompleted,
      activityLogged,
      loggedActivityData,
      modelUsed,
      context_used: {
        hasCropRecommendation: !!cropContext,
        recommendedCrop: cropContext
          ? cropContext.match(/Recommended Crop\s*:\s*(.+)/)?.[1]?.trim()
          : null,
      },
    });
  } catch (err: any) {
    console.error("❌ Gemini chat error:", err.message.slice(0, 200) + '...');
    return res.status(503).json({
      success: false,
      message: "AI Assistant is currently overloaded or unavailable. Please try again later.",
      reply: "I am currently experiencing high traffic and cannot generate insights right now.",
      cards: null
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chatbot/suggestions
// ---------------------------------------------------------------------------
export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer_id } = req.query as { farmer_id: string };

    let suggestions = [
      "What fertilizer should I use for my recommended crop?",
      "Show me a crop calendar for this season",
      "How do I improve my soil health?",
      "What government schemes can I apply for?",
      "What are the market prices for my crop?",
      "How to protect crops from pests?",
    ];

    if (farmer_id) {
      try {
        const rec: any = await Recommendation.findOne({ farmer: farmer_id })
          .sort({ createdAt: -1 } as any)
          .lean();

        const crop = rec?.recommendedCrop || rec?.recommended_crop;
        if (crop) {
          suggestions = [
            `Fertilizer schedule for ${crop}`,
            `Best practices for growing ${crop}`,
            `Market prices for ${crop}`,
            `Pest control for ${crop}`,
            "How to improve my soil health?",
            "What government schemes can I apply for?",
          ];
        }
      } catch (e: any) {
        console.error("❌ Suggestions fetch error:", e.message);
      }
    }

    return res.status(200).json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
};
