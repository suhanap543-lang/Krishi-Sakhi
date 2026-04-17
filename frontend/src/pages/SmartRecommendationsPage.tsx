import React, { useState, useEffect, useMemo } from "react";
import { getCropRecommendation, apiFetch } from "../utils/api";
import Sidebar from "../components/Sidebar";
import {
  Leaf,
  FlaskConical,
  CloudRain,
  Lightbulb,
  Calendar,
  TrendingUp,
  Loader2,
  Droplets,
  Bug,
  Beaker,
  Sparkles,
  Bookmark,
  Trash2,
  LayoutGrid,
  Sprout,
  MapPin,
  Thermometer,
  Wind,
  CloudDrizzle,
  Star,
  ChevronDown,
} from "lucide-react";

const CROP_EMOJI = {
  rice: "🌾", wheat: "🌿", maize: "🌽", cotton: "🌸", sugarcane: "🎋",
  banana: "🍌", mango: "🥭", grapes: "🍇", apple: "🍎", coffee: "☕",
  chickpea: "🫘", lentil: "🫘", mungbean: "🫛", pomegranate: "🍎",
  default: "🌱",
};

const CATEGORY_CONFIG = {
  crop_planning: {
    label: "Crop Planning", icon: Sprout,
    gradient: "from-orange-500 to-amber-500",
    border: "border-l-orange-500", badge: "bg-orange-100 text-orange-700",
  },
  soil_health: {
    label: "Soil Health", icon: FlaskConical,
    gradient: "from-amber-500 to-yellow-500",
    border: "border-l-amber-500", badge: "bg-amber-100 text-amber-700",
  },
  irrigation: {
    label: "Irrigation", icon: Droplets,
    gradient: "from-blue-500 to-cyan-500",
    border: "border-l-blue-500", badge: "bg-blue-100 text-blue-700",
  },
  pest_control: {
    label: "Pest Control", icon: Bug,
    gradient: "from-rose-500 to-red-500",
    border: "border-l-rose-500", badge: "bg-rose-100 text-rose-700",
  },
  fertilizer: {
    label: "Fertilizer", icon: Beaker,
    gradient: "from-violet-500 to-purple-500",
    border: "border-l-violet-500", badge: "bg-violet-100 text-violet-700",
  },
  best_practices: {
    label: "Best Practices", icon: Sparkles,
    gradient: "from-emerald-500 to-teal-500",
    border: "border-l-emerald-500", badge: "bg-emerald-100 text-emerald-700",
  },
};

const IMPACT_STYLES = {
  high: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "High Impact" },
  medium: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", label: "Medium Impact" },
  low: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500", label: "Low Impact" },
};

const FILTER_TABS = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "crop_planning", label: "Crops", icon: Sprout },
  { key: "soil_health", label: "Soil", icon: FlaskConical },
  { key: "irrigation", label: "Irrigation", icon: Droplets },
  { key: "pest_control", label: "Pest", icon: Bug },
  { key: "fertilizer", label: "Fertilizer", icon: Beaker },
  { key: "best_practices", label: "Best Practices", icon: Sparkles },
];

/* ========================================================================= */
/* CROP RESULT HEADER                                                          */
/* ========================================================================= */
function CropResultHeader({ rec }) {
  const emoji = CROP_EMOJI[rec.recommendedCrop?.toLowerCase()] ?? CROP_EMOJI.default;
  const pct = Math.round(rec.confidence * 100);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100/80">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-8 pb-6 text-white overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/[0.06] rounded-full" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-white/[0.04] rounded-full translate-y-1/2" />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-white/[0.03] rounded-full" />

        <div className="relative z-10">
          <p className="text-green-200 text-xs font-semibold uppercase tracking-widest mb-2">
            Recommended Crop
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-4xl md:text-5xl font-black capitalize flex items-center gap-4 tracking-tight">
              <span className="text-5xl drop-shadow-md">{emoji}</span>
              {rec.recommendedCrop}
            </h2>
            <span className={`text-sm font-bold px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg ${pct >= 70 ? "bg-white/20 border border-white/30"
              : pct >= 40 ? "bg-yellow-400/25 border border-yellow-300/40"
                : "bg-red-400/25 border border-red-300/40"
              }`}>
              {pct}% confidence
            </span>
          </div>
          <p className="mt-4 text-[15px] text-green-50/90 leading-relaxed max-w-3xl">
            {rec.explanation}
          </p>
        </div>
      </div>

      {/* Weather Strip */}
      <div className="grid grid-cols-3 bg-gradient-to-r from-slate-50 to-blue-50/50">
        {[
          { label: "Temperature", val: `${rec.weather?.temperature ?? "--"}°C`, Icon: Thermometer, color: "text-rose-500" },
          { label: "Humidity", val: `${rec.weather?.humidity ?? "--"}%`, Icon: Wind, color: "text-sky-500" },
          { label: "Rainfall", val: `${rec.weather?.rainfall ?? "--"} mm`, Icon: CloudDrizzle, color: "text-blue-500" },
        ].map((w, i) => (
          <div key={w.label} className={`flex flex-col items-center py-5 ${i < 2 ? "border-r border-gray-100" : ""}`}>
            <w.Icon size={22} className={`${w.color} mb-1`} />
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{w.label}</span>
            <span className="text-lg font-extrabold text-gray-800 mt-0.5">{w.val}</span>
          </div>
        ))}
      </div>

      {/* Quick Info Row */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickInfoCard icon={Calendar} color="amber" title="Best Sowing" text={rec.bestSowingTime} />
        <QuickInfoCard icon={TrendingUp} color="green" title="Expected Yield" text={rec.estimatedYield} />
        {rec.alternativeCrops?.length > 0 && (
          <div className="flex items-start gap-3 bg-purple-50/70 rounded-2xl p-4 border border-purple-100/60">
            <Leaf size={18} className="text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1.5">Alternatives</p>
              <div className="flex gap-1.5 flex-wrap">
                {rec.alternativeCrops.map((alt) => {
                  const name = alt.crop ?? alt;
                  return (
                    <span key={name} className="text-xs bg-purple-100/80 text-purple-700 rounded-lg px-2.5 py-1 font-semibold capitalize inline-flex items-center gap-1">
                      {CROP_EMOJI[name.toLowerCase()] ?? "🌱"} {name}
                      {alt.confidence !== undefined && <span className="text-purple-400">({Math.round(alt.confidence * 100)}%)</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickInfoCard({ icon: Icon, color, title, text }) {
  return (
    <div className={`flex items-start gap-3 bg-${color}-50/70 rounded-2xl p-4 border border-${color}-100/60`}>
      <Icon size={18} className={`text-${color}-500 mt-0.5 shrink-0`} />
      <div>
        <p className={`text-[10px] font-bold text-${color}-600 uppercase tracking-widest mb-1`}>{title}</p>
        <p className="text-[13px] text-gray-700 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* RECOMMENDATION CARD                                                         */
/* ========================================================================= */
function RecommendationCard({ rec, index, isSaved, onSave, onRemove }) {
  const cfg = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.best_practices;
  const impact = IMPACT_STYLES[rec.impact] || IMPACT_STYLES.medium;
  const Icon = cfg.icon;

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100/80 border-l-[5px] ${cfg.border} transition-all duration-500 ease-out overflow-hidden`}
      style={{ animation: `fadeSlideUp 0.6s ${index * 0.1}s ease-out both` }}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 bg-gradient-to-br ${cfg.gradient} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
              <Icon size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-lg ${cfg.badge} uppercase tracking-wider`}>
              {cfg.label}
            </span>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${impact.bg} ${impact.text} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${impact.dot} animate-pulse`} />
            {impact.label}
          </span>
        </div>

        <h3 className="text-[15px] font-bold text-gray-800 leading-snug mb-2 group-hover:text-gray-900 transition-colors">
          {rec.title}
        </h3>
        <p className="text-[13px] text-gray-500 leading-relaxed">{rec.description}</p>
      </div>

      {/* Tags */}
      {rec.tags?.length > 0 && (
        <div className="px-5 pb-3 flex gap-1.5 flex-wrap">
          {rec.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-gray-400 bg-gray-50 rounded-md px-2 py-0.5 font-medium hover:bg-gray-100 transition-colors">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        <button
          onClick={() => onSave?.(rec)}
          className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${isSaved
            ? "text-amber-600 bg-amber-50 shadow-sm"
            : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
            }`}
        >
          {isSaved ? <Star size={14} className="fill-amber-400" /> : <Bookmark size={14} />}
          {isSaved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => onRemove?.(rec)}
          className="text-xs font-medium text-gray-300 hover:text-red-500 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all duration-200"
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MAIN PAGE                                                                   */
/* ========================================================================= */
export default function SmartRecommendationsPage() {
  const loadState = (key, defaultVal) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(() => loadState("smart_recs_farm", ""));
  const [coords, setCoords] = useState(() => loadState("smart_recs_coords", null));
  const [geoStatus, setGeoStatus] = useState("loading");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadState("smart_recs_result", null));
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState(() => loadState("smart_recs_filter", "all"));
  const [savedCards, setSavedCards] = useState(() => new Set(loadState("smart_recs_saved", [])));
  const [removedCards, setRemovedCards] = useState(() => new Set(loadState("smart_recs_removed", [])));

  const selectedFarm = useMemo(() => farms.find((f) => f.id === selectedFarmId) || null, [farms, selectedFarmId]);

  useEffect(() => {
    sessionStorage.setItem("smart_recs_farm", JSON.stringify(selectedFarmId));
    if (coords) sessionStorage.setItem("smart_recs_coords", JSON.stringify(coords));
    if (result) sessionStorage.setItem("smart_recs_result", JSON.stringify(result));
    sessionStorage.setItem("smart_recs_filter", JSON.stringify(activeFilter));
    sessionStorage.setItem("smart_recs_saved", JSON.stringify([...savedCards]));
    sessionStorage.setItem("smart_recs_removed", JSON.stringify([...removedCards]));
  }, [selectedFarmId, coords, result, activeFilter, savedCards, removedCards]);

  /* ---- Session data ---- */
  const session = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("ammachi_session") || "{}"); } catch { return {}; }
  }, []);
  const profile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("ammachi_profile") || "{}"); } catch { return {}; }
  }, []);

  const userState = session.state || profile.state || "";
  const userDistrict = session.district || profile.district || "";

  /* ---- Fetch farms ---- */
  useEffect(() => {
    const userId = session.userId;
    if (!userId) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/farms/?farmer_id=${userId}`);
        const data = await res.json();
        setFarms(data);
        // Auto-select first farm if none selected
        if (!selectedFarmId && data.length > 0) setSelectedFarmId(data[0].id);
      } catch (err) {
        console.error("Failed to fetch farms:", err);
      }
    })();
  }, [session.userId]);

  /* ---- Geocode ---- */
  useEffect(() => {
    if (!userState || !userDistrict) { setGeoStatus("error"); return; }
    (async () => {
      try {
        const q = encodeURIComponent(`${userDistrict}, ${userState}, India`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
        const d = await res.json();
        if (d?.length) { setCoords({ lat: +d[0].lat, lon: +d[0].lon }); setGeoStatus("ready"); return; }
        const sq = encodeURIComponent(`${userState}, India`);
        const sr = await fetch(`https://nominatim.openstreetmap.org/search?q=${sq}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
        const sd = await sr.json();
        if (sd?.length) { setCoords({ lat: +sd[0].lat, lon: +sd[0].lon }); setGeoStatus("ready"); }
        else setGeoStatus("error");
      } catch { setGeoStatus("error"); }
    })();
  }, [userState, userDistrict]);

  /* ---- Filtered cards ---- */
  const visibleCards = useMemo(() => {
    if (!result?.detailedRecommendations) return [];
    return result.detailedRecommendations
      .filter((c) => !removedCards.has(c.title))
      .filter((c) => activeFilter === "all" || c.category === activeFilter);
  }, [result, activeFilter, removedCards]);

  const getCategoryCount = (key) => {
    if (!result?.detailedRecommendations) return 0;
    const recs = result.detailedRecommendations.filter((c) => !removedCards.has(c.title));
    return key === "all" ? recs.length : recs.filter((r) => r.category === key).length;
  };

  /* ---- Handlers ---- */
  const handleSave = (card) => {
    setSavedCards((prev) => {
      const n = new Set(prev);
      n.has(card.title) ? n.delete(card.title) : n.add(card.title);
      return n;
    });
  };

  const handleRemove = (card) => setRemovedCards((prev) => new Set(prev).add(card.title));

  const SOIL_TYPE_MAP = {
    clay: "Clay", sandy: "Sandy", loamy: "Loamy", black: "Black",
    red: "Red", alluvial: "Alluvial", laterite: "Laterite",
  };

  const IRRIGATION_LABEL_MAP = {
    rain_fed: "Rain Fed", drip: "Drip Irrigation", sprinkler: "Sprinkler",
    flood: "Flood Irrigation", canal: "Canal", bore_well: "Bore Well", open_well: "Open Well",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setActiveFilter("all");
    setSavedCards(new Set()); setRemovedCards(new Set());

    if (!selectedFarm) { setError("Please select a farm first."); return; }
    if (!coords) { setError("Could not determine your location. Please update your profile."); return; }

    const N = selectedFarm.nitrogen_value;
    const P = selectedFarm.phosphorus_value;
    const K = selectedFarm.potassium_value;
    const ph = selectedFarm.soil_ph;

    if ([N, P, K, ph].some((v) => v === undefined || v === null || v === "")) {
      setError("Selected farm is missing soil nutrient data (N/P/K/pH). Please update your farm details.");
      return;
    }

    setLoading(true);
    try {
      const res = await getCropRecommendation({
        N: +N, P: +P, K: +K, ph: +ph,
        lat: coords.lat, lon: coords.lon,
        userState,
        userDistrict,
        soilType: SOIL_TYPE_MAP[selectedFarm.soil_type] || selectedFarm.soil_type || "",
        irrigationType: IRRIGATION_LABEL_MAP[selectedFarm.irrigation_type] || selectedFarm.irrigation_type || "",
        landSizeAcres: selectedFarm.land_size_acres || "",
        farmId: selectedFarm.id,
      });
      res.success ? setResult(res.recommendation) : setError(res.message || "Something went wrong.");
    } catch (err) { setError(err.message || "Request failed."); }
    finally { setLoading(false); }
  };

  /* ================================================================= */
  /* RENDER                                                              */
  /* ================================================================= */
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar />
      <main className="flex-1 md:ml-64 transition-all duration-300">

        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-6">
          <div className="w-full flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200/50">
              <Leaf size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Smart Crop Recommendation</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                AI-powered crop & farming strategy recommendations based on your soil and location
              </p>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="w-full px-6 py-8 space-y-8">

          {/* ── Input Form ── */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/80 space-y-6">

            {/* Farm Selector */}
            <div>
              <p className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                <Sprout size={16} className="text-emerald-500" /> Select Your Farm
              </p>
              {farms.length === 0 ? (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700">
                  ⚠ No farms found.{" "}
                  <a href="#/farms" className="underline font-semibold hover:text-amber-800">Add a farm</a> with soil nutrient data to get started.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedFarmId}
                    onChange={(e) => { setSelectedFarmId(e.target.value); setResult(null); setError(""); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 font-semibold bg-gray-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="">— Choose a farm —</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        🏠 {farm.name} — {farm.land_size_acres} acres
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Selected Farm Details */}
            {selectedFarm && (
              <div className="bg-gradient-to-br from-emerald-50/80 via-green-50/40 to-teal-50/60 border border-emerald-100/60 rounded-2xl p-5 space-y-4" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                    <span className="text-lg">🏠</span> {selectedFarm.name}
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-3 py-1.5 rounded-full uppercase tracking-wide">
                    Farm Data
                  </span>
                </div>

                {/* Soil Nutrients Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Nitrogen (N)", value: selectedFarm.nitrogen_value, unit: "kg/ha", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "Phosphorus (P)", value: selectedFarm.phosphorus_value, unit: "kg/ha", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                    { label: "Potassium (K)", value: selectedFarm.potassium_value, unit: "kg/ha", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
                    { label: "Soil pH", value: selectedFarm.soil_ph, unit: "", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                  ].map((item) => (
                    <div key={item.label} className={`${item.bg} ${item.border} border rounded-xl p-3 text-center`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className={`text-xl font-extrabold ${item.color}`}>
                        {item.value !== undefined && item.value !== null && item.value !== "" ? item.value : <span className="text-gray-300 text-sm">—</span>}
                      </p>
                      {item.unit && <p className="text-[10px] text-gray-400">{item.unit}</p>}
                    </div>
                  ))}
                </div>

                {/* Farm Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2.5 bg-white/80 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-base">🧱</span>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Soil Type</p>
                      <p className="text-sm font-bold text-gray-800 capitalize">{SOIL_TYPE_MAP[selectedFarm.soil_type] || selectedFarm.soil_type || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white/80 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-base">💧</span>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Irrigation</p>
                      <p className="text-sm font-bold text-gray-800">{IRRIGATION_LABEL_MAP[selectedFarm.irrigation_type] || selectedFarm.irrigation_type || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white/80 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-base">📍</span>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Land Size</p>
                      <p className="text-sm font-bold text-gray-800">{selectedFarm.land_size_acres || "—"} acres</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <p className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-blue-500" /> Your Farming Location
              </p>
              {userState && userDistrict ? (
                <div className="bg-gradient-to-r from-blue-50/80 to-sky-50/50 border border-blue-100/60 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{userDistrict}, {userState}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {geoStatus === "loading" && "Resolving coordinates…"}
                      {geoStatus === "ready" && coords && `${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E`}
                      {geoStatus === "error" && "⚠ Could not resolve coordinates"}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-100/80 px-3 py-1.5 rounded-full uppercase tracking-wide shrink-0">
                    From Profile
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700">
                  ⚠ No location in your profile.{" "}
                  <a href="#/signup" className="underline font-semibold hover:text-amber-800">Update your profile</a> for location-based recommendations.
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-base">⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || geoStatus !== "ready"}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/50 active:scale-[0.99]"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Analysing your soil data…</>
              ) : (
                <><Leaf size={20} /> Get Recommendation</>
              )}
            </button>
          </div>

          {/* ============================================================ */}
          {/* RESULTS                                                        */}
          {/* ============================================================ */}
          {result && (
            <div className="space-y-8" style={{ animation: "fadeSlideUp 0.6s ease-out" }}>
              {/* Crop Header */}
              <CropResultHeader rec={result} />

              {/* Detailed Recommendations */}
              {result.detailedRecommendations?.length > 0 && (
                <div className="space-y-5">
                  {/* Section Title */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200/50">
                      <Lightbulb size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Detailed Recommendations</h3>
                      <p className="text-xs text-gray-400 mt-0.5">AI-powered strategies tailored to your soil, weather & location</p>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex gap-2 flex-wrap bg-white rounded-2xl p-2 shadow-sm border border-gray-100/80">
                    {FILTER_TABS.map((tab) => {
                      const count = getCategoryCount(tab.key);
                      const isActive = activeFilter === tab.key;
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveFilter(tab.key)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                            ? "bg-gray-900 text-white shadow-md"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                            }`}
                        >
                          <TabIcon size={14} />
                          {tab.label}
                          {count > 0 && (
                            <span className={`ml-0.5 w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${isActive ? "bg-white/20" : "bg-gray-100"
                              }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {visibleCards.map((card, idx) => (
                      <RecommendationCard
                        key={card.title + card.category}
                        rec={card}
                        index={idx}
                        isSaved={savedCards.has(card.title)}
                        onSave={handleSave}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>

                  {visibleCards.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <LayoutGrid size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400">No recommendations in this category</p>
                      <p className="text-xs text-gray-300 mt-1">Try selecting "All" to see all cards</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Global Animation Styles */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
