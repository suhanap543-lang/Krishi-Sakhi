import { Request, Response, NextFunction } from 'express';
import Activity from '../models/Activity';
import { getCurrentKey, executeWithModelAndKeyFallback } from '../utils/geminiClient';

// ─── GET /api/activities/ — List activities (with filters) ───────────
export const listActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};

    const farmerId = req.query.farmer_id || req.query.farmer;
    if (farmerId) filter.farmer = farmerId;

    if (req.query.farm_id) filter.farm = req.query.farm_id;
    if (req.query.type) filter.activity_type = req.query.type;

    if (req.query.date_from || req.query.date_to) {
      filter.date = {};
      if (req.query.date_from) filter.date.$gte = new Date(req.query.date_from as string);
      if (req.query.date_to) filter.date.$lte = new Date((req.query.date_to as string) + 'T23:59:59');
    }

    const limit = parseInt(req.query.limit as string) || 100;

    const activities = await Activity.find(filter)
      .populate('farmer', 'name phone district state')
      .populate('farm', 'name district')
      .sort({ date: -1 } as any)
      .limit(limit);

    const result = activities.map((a: any) => {
      const obj = a.toJSON();
      obj.farmer_name = a.farmer?.name || 'Unknown';
      obj.farm_name = a.farm?.name || '';
      return obj;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/activities/quick_add/ — Create activity ───────────────
export const quickAdd = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer, farm, activity_type, text_note, date, amount } = req.body;

    if (!farmer) {
      return res.status(400).json({ message: 'Farmer ID is required' });
    }
    
    if (!farm) {
      return res.status(400).json({ message: 'Farm ID is required' });
    }

    const activity = await Activity.create({
      farmer,
      farm,
      activity_type: activity_type || 'other',
      text_note: text_note || '',
      date: date ? new Date(date) : new Date(),
      amount: amount || undefined,
    });

    await activity.populate('farmer', 'name phone district state');
    await activity.populate('farm', 'name district');

    const result = activity.toJSON() as any;
    result.farmer_name = (activity.farmer as any)?.name || 'Unknown';
    result.farm_name = (activity.farm as any)?.name || '';

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/activities/:id/ — Get single activity ──────────────────
export const getActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('farmer', 'name phone district state')
      .populate('farm', 'name district');

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const result = activity.toJSON() as any;
    result.farmer_name = (activity.farmer as any)?.name || 'Unknown';
    result.farm_name = (activity.farm as any)?.name || '';
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/activities/:id/ — Delete activity ───────────────────
export const deleteActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Simple in-memory cache for insights to prevent Gemini API 429 rate limit errors
const insightsCache = new Map();
const inFlightRequests = new Map(); // Prevent race conditions on concurrent requests

// Farmer-specific cooldown to prevent 429s during rapid activity logging
const farmerCooldowns = new Map();
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per farmer

// ─── GET /api/activities/insights — AI-powered smart insights ────────
export const getActivityInsights = async (req: Request, res: Response) => {
  try {
    const farmerId = req.query.farmer_id as string;
    if (!farmerId) return res.status(400).json({ message: 'farmer_id required' });

    const activities = await Activity.find({ farmer: farmerId })
      .populate('farm', 'name')
      .sort({ date: -1 } as any)
      .limit(50);

    // Cache key now uses a hash or simple string based on all activity IDs + updated times to perfectly reflect the state
    const stateHash = activities.map((a: any) => a._id.toString() + (a.updated_at ? a.updated_at.getTime() : a.date.getTime())).join('_');
    const cacheKey = `${farmerId}_${stateHash}`;

    // Calculate current stats locally to always be accurate
    const today = new Date();
    const currentActivities = activities.filter(a => {
      const d = new Date(a.date);
      const daysDiff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff <= 7;
    });
    const upcomingActivities = activities.filter(a => new Date(a.date) > today);
    const typeCounts: Record<string, number> = {};
    activities.forEach(a => {
      typeCounts[a.activity_type] = (typeCounts[a.activity_type] || 0) + 1;
    });

    // 1. Exact Cache Match (No changes since last time)
    if (insightsCache.has(cacheKey)) {
        console.log(`⚡ Serving cached insights for farmer ${farmerId} [${cacheKey}]`);
        return res.json(insightsCache.get(cacheKey));
    }

    // 2. Cooldown Cache Bypass (Farmer is rapidly logging activities)
    const lastCooldown = farmerCooldowns.get(farmerId);
    if (lastCooldown && (Date.now() - lastCooldown.timestamp < COOLDOWN_MS)) {
        console.log(`⏱️ Farmer ${farmerId} is on cooldown. Serving last known insights with updated stats.`);
        // Clone their last payload but force the numbers to be accurate
        const stalePayload = { ...lastCooldown.payload };
        stalePayload.current_count = currentActivities.length;
        stalePayload.upcoming_count = upcomingActivities.length;
        stalePayload.total = activities.length;
        stalePayload.type_counts = typeCounts;
        return res.json(stalePayload);
    }

    // 3. Check if this exact request is already hitting Gemini right now (e.g. React double-fetch)
    if (inFlightRequests.has(cacheKey)) {
        console.log(`⏳ Waiting for in-flight insights generation for farmer ${farmerId}...`);
        const result = await inFlightRequests.get(cacheKey);
        return res.json(result);
    }

    // Create a promise for this generation work so other requests can await it
    const generateInsightsPromise = (async () => {

    // Build activity summary for AI
    const activitySummary = activities.map((a: any) => ({
      type: a.activity_type,
      date: a.date?.toISOString().split('T')[0],
      note: a.text_note,
      farm: a.farm?.name || 'Unknown'
    }));

    const apiKey = getCurrentKey();
    if (!apiKey) {
      return {
        success: true,
        insights: getDefaultInsights(),
        current_count: currentActivities.length,
        upcoming_count: upcomingActivities.length,
        source: 'fallback'
      };
    }

    // Add context to prompt for empty/low activity states
    const promptContext = activities.length === 0 
      ? "This farmer has not logged any activities yet. Give them encouraging advice on what activities they should start logging (e.g., soil preparation, plowing, seed selection) based on general best practices. Set their productivity score to 0."
      : "You are an expert agricultural AI. Critically analyze this farmer's recent activity log. Provide highly specific, actionable insights based ONLY on what they have actually logged. Do not give generic advice. E.g. If they just sowed seeds, advise on immediate watering or specific early-stage care. If they sprayed pesticide, remind them of safety or follow-up intervals.";

    const prompt = `You are a smart farming assistant. ${promptContext}

Activity history (last 50 entries, from newest to oldest):
${JSON.stringify(activitySummary, null, 1)}

Activity counts by type: ${JSON.stringify(typeCounts)}
Current date: ${today.toISOString().split('T')[0]}
Current activities (this week): ${currentActivities.length}
Upcoming scheduled: ${upcomingActivities.length}

Return ONLY a valid JSON object matching this exact structure:
{
  "productivity_score": <number 0-100 based on recent activity frequency and good practices>,
  "productivity_label": "<String: e.g., 'Excellent', 'Good', 'Needs Attention'>",
  "weekly_summary": "<Brief 1-sentence summary analyzing the specific tasks they did this week>",
  "top_recommendation": "<Most important actionable advice based directly on their recent specific activities>",
  "next_actions": ["<Action 1 based on recent logs>", "<Action 2>", "<Action 3>"],
  "seasonal_tip": "<One farming tip relevant to the current month/season>",
  "risk_alert": "<Any risk or warning based on their patterns (e.g., 'Too much pesticide', 'No irrigation logged recently') or 'No current risks detected'>",
  "pattern_insight": "<An interesting observation about their specific farming habits>",
  "streak_info": "<Encouraging message about their logging consistency>",
  "upcoming_suggestion": "<Specific suggestion for what they should schedule next based on what they just did>"
}`;

    // Use executeWithModelAndKeyFallback for automatic key + model rotation
    const response = await executeWithModelAndKeyFallback(async (key, model) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        }
      );
      if (!resp.ok && (resp.status === 429 || resp.status === 403 || resp.status === 404 || resp.status === 503)) {
        throw { status: resp.status, message: `Gemini API Error: ${resp.status} ${resp.statusText}` };
      }
      return resp;
    });

    if (!response.ok) {
        console.error(`Gemini API Error: ${response.status} ${response.statusText}`);
        const fallbackPayload = {
            success: true,
            insights: getDefaultInsights(),
            current_count: currentActivities.length,
            upcoming_count: upcomingActivities.length,
            total: activities.length,
            type_counts: typeCounts,
            source: 'fallback_api_error'
        };
        
        // Cache the fallback
        farmerCooldowns.set(farmerId, { timestamp: Date.now(), payload: fallbackPayload });
        insightsCache.set(cacheKey, fallbackPayload);
        if (insightsCache.size > 100) {
            insightsCache.delete(insightsCache.keys().next().value);
        }
        return fallbackPayload;
    }

    const result: any = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let insights;
    try {
      let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Attempt truncation repair
      if (!jsonStr.endsWith('}')) {
          console.warn('⚠️ Activity Insights JSON seems truncated. Attempting repair...');
          jsonStr += '"}'; // close last string and object
      }
      
      insights = JSON.parse(jsonStr);
    } catch (e: any) {
      console.error('Failed to parse activity insights:', e.message);
      console.error('Raw text:', text.substring(0, 100) + '...');
      insights = getDefaultInsights();
    }

    const responsePayload = {
      success: true,
      insights,
      current_count: currentActivities.length,
      upcoming_count: upcomingActivities.length,
      total: activities.length,
      type_counts: typeCounts, 
      source: 'gemini_ai'
    };

    // Store in cache and cooldown
    farmerCooldowns.set(farmerId, { timestamp: Date.now(), payload: responsePayload });
    insightsCache.set(cacheKey, responsePayload);

    // Keep cache memory small by deleting old entries (basic LRU-like behavior for Map)
    if (insightsCache.size > 100) {
        const firstKey = insightsCache.keys().next().value;
        insightsCache.delete(firstKey);
    }

    return responsePayload;
    })();

    // 3. Store the promise so subsequent requests can await it
    inFlightRequests.set(cacheKey, generateInsightsPromise);

    try {
        const finalPayload = await generateInsightsPromise;
        return res.json(finalPayload);
    } finally {
        // 4. Cleanup the in-flight lock once done
        inFlightRequests.delete(cacheKey);
    }
    
  } catch (error) {
    console.error('getActivityInsights error:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
};

function getDefaultInsights() {
  return {
    productivity_score: 70,
    productivity_label: 'Good',
    weekly_summary: 'Keep logging your farming activities for better tracking and analysis.',
    top_recommendation: 'Schedule regular irrigation and fertilizer application for optimal crop growth.',
    next_actions: [
      'Check soil moisture levels today',
      'Plan next fertilizer application',
      'Monitor crops for pest signs'
    ],
    seasonal_tip: 'Ensure proper drainage during monsoon season to prevent waterlogging.',
    risk_alert: 'No risks detected - keep up the good work!',
    pattern_insight: 'Log more activities to unlock detailed pattern analysis.',
    streak_info: 'Start logging daily to build a consistency streak!',
    upcoming_suggestion: 'Consider scheduling an irrigation cycle within the next 3 days.'
  };
}
