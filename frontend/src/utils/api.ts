const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || '';

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE + path;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), options);
}

// ---------------------------------------------------------------------------
// Crop Recommendation
// ---------------------------------------------------------------------------
export const getCropRecommendation = async (soilData) => {
  const res = await fetch("/api/recommendations/crop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(soilData),
  });

  // ── debug: log raw response before parsing ──
  const text = await res.text();
  console.log("📥 Raw response:", text);

  if (!text) {
    throw new Error("Server returned empty response");
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(json.message || "Recommendation failed");
  }

  return json;
};

export const getRecommendationHistory = async (farmerId) => {
  const res = await fetch(`/api/recommendations/history/${farmerId}`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
};

// ---------------------------------------------------------------------------
// Soil Health Assessment
// ---------------------------------------------------------------------------
export const getSoilHealthAssessment = async (soilData: {
  N: number; P: number; K: number; ph: number;
  ec: number; oc: number; S: number; zn: number;
  fe: number; cu: number; Mn: number; B: number;
}) => {
  const res = await fetch("/api/soil-health/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(soilData),
  });

  const text = await res.text();
  if (!text) throw new Error("Server returned empty response");

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(json.message || "Soil health assessment failed");
  }

  return json;
};

// ---------------------------------------------------------------------------
// Crop Productivity Optimization (integrated Soil + Crop analysis)
// ---------------------------------------------------------------------------
export const getCropProductivityAnalysis = async (soilData: {
  N: number; P: number; K: number; ph: number;
  ec: number; oc: number; S: number; zn: number;
  fe: number; cu: number; Mn: number; B: number;
  lat?: number; lon?: number;
  userState?: string; userDistrict?: string;
}) => {
  const res = await fetch("/api/crop-productivity/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(soilData),
  });

  const text = await res.text();
  if (!text) throw new Error("Server returned empty response");

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(json.message || "Crop productivity analysis failed");
  }

  return json;
};
