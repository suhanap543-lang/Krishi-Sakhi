import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TranslatedText from '../components/TranslatedText';
import { getSoilHealthAssessment } from '../utils/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SOIL_FIELDS = [
  { key: 'N',  label: 'Nitrogen (N)',              unit: 'kg/ha',  min: 0, max: 500,  step: 1,    placeholder: 'e.g. 200' },
  { key: 'P',  label: 'Phosphorous (P)',            unit: 'kg/ha',  min: 0, max: 200,  step: 0.1,  placeholder: 'e.g. 8.0' },
  { key: 'K',  label: 'Potassium (K)',              unit: 'kg/ha',  min: 0, max: 1000, step: 1,    placeholder: 'e.g. 500' },
  { key: 'ph', label: 'Soil pH',                    unit: '',       min: 0, max: 14,   step: 0.01, placeholder: 'e.g. 7.2' },
  { key: 'ec', label: 'Electrical Conductivity',    unit: 'dS/m',   min: 0, max: 5,    step: 0.01, placeholder: 'e.g. 0.55' },
  { key: 'oc', label: 'Organic Carbon',             unit: '%',      min: 0, max: 5,    step: 0.01, placeholder: 'e.g. 0.75' },
  { key: 'S',  label: 'Sulfur (S)',                 unit: 'mg/kg',  min: 0, max: 100,  step: 0.1,  placeholder: 'e.g. 10.0' },
  { key: 'zn', label: 'Zinc (Zn)',                  unit: 'mg/kg',  min: 0, max: 5,    step: 0.01, placeholder: 'e.g. 0.45' },
  { key: 'fe', label: 'Iron (Fe)',                  unit: 'mg/kg',  min: 0, max: 50,   step: 0.01, placeholder: 'e.g. 3.5' },
  { key: 'cu', label: 'Copper (Cu)',                unit: 'mg/kg',  min: 0, max: 10,   step: 0.01, placeholder: 'e.g. 1.0' },
  { key: 'Mn', label: 'Manganese (Mn)',             unit: 'mg/kg',  min: 0, max: 50,   step: 0.01, placeholder: 'e.g. 5.0' },
  { key: 'B',  label: 'Boron (B)',                  unit: 'mg/kg',  min: 0, max: 5,    step: 0.01, placeholder: 'e.g. 0.5' },
];

const FERTILITY_STYLES: Record<string, any> = {
  'Less Fertile':   { bg: 'bg-red-500',    bgLight: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    emoji: '⚠️',  gradient: 'from-red-500 to-orange-500' },
  'Fertile':        { bg: 'bg-amber-500',  bgLight: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  emoji: '✅',  gradient: 'from-amber-500 to-yellow-500' },
  'Highly Fertile': { bg: 'bg-emerald-500',bgLight: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',emoji: '🌟', gradient: 'from-emerald-500 to-teal-500' },
};

const STATUS_STYLES: Record<string, any> = {
  low:     { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500',     label: 'Low' },
  optimal: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Optimal' },
  high:    { bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-500',   label: 'High' },
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------
function SoilHealthGauge({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 60;
  const progress = (value / 100) * circumference;
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="70" cy="70" r="60" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{value}</span>
        <span className="text-xs text-gray-400 font-semibold">/ 100</span>
      </div>
    </div>
  );
}

function MicrobialGauge({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 40;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function NutrientCard({ nutrient }: { nutrient: any }) {
  const style = STATUS_STYLES[nutrient.status] || STATUS_STYLES.optimal;
  return (
    <div className={`rounded-2xl p-4 border ${style.bg} border-opacity-60 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{nutrient.parameter}</span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style.bg} ${style.text} flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>
      <p className="text-lg font-extrabold text-gray-800">{nutrient.value} <span className="text-xs text-gray-400 font-medium">{nutrient.unit}</span></p>
      <p className="text-[11px] text-gray-400 mt-1">{nutrient.name} • Range: {nutrient.optimal_range} {nutrient.unit}</p>
      {nutrient.impact && nutrient.status !== 'optimal' && (
        <p className="text-[10px] text-gray-500 mt-1.5 italic leading-relaxed">⚠ {nutrient.impact}</p>
      )}
    </div>
  );
}

function BioRecommendationCard({ rec, index }: { rec: any; index: number }) {
  const isLow = rec.status === 'low';
  const [expanded, setExpanded] = useState(false);

  const sevColors: Record<string, any> = {
    severe:   { bg: 'bg-red-100', text: 'text-red-700' },
    moderate: { bg: 'bg-amber-100', text: 'text-amber-700' },
    mild:     { bg: 'bg-blue-100', text: 'text-blue-700' },
  };
  const sev = sevColors[rec.severity] || sevColors.mild;
  const typeIcons: Record<string, string> = { biofertilizer: '🦠', organic: '🌿', chemical: '⚗️', amendment: '🧱', practice: '🔄' };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${isLow ? 'border-l-red-400' : 'border-l-amber-400'} overflow-hidden hover:shadow-lg transition-all duration-300`}
      style={{ animation: `fadeSlideUp 0.5s ${index * 0.08}s ease-out both` }}
    >
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLow ? 'bg-red-100' : 'bg-amber-100'}`}>
            <span className="text-lg">{isLow ? '🧬' : '⚡'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-bold text-gray-800">{rec.name}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {rec.status === 'low' ? '↓ Deficient' : '↑ Excess'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                {rec.severity}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{rec.crop_impact}</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 space-y-2.5">
        {(rec.products || []).slice(0, expanded ? undefined : 2).map((prod: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 hover:bg-white transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm">{typeIcons[prod.type] || '💊'}</span>
              <span className="text-xs font-bold text-gray-800">{prod.product}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{prod.type}</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{prod.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] text-emerald-500 mt-0.5">💉</span>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Dosage</p>
                  <p className="text-[10px] text-gray-600 font-medium">{prod.dosage}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] text-blue-500 mt-0.5">⏱</span>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Timing</p>
                  <p className="text-[10px] text-gray-600 font-medium">{prod.timing}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Mechanism</p>
              <p className="text-[10px] text-purple-600 font-medium italic">{prod.mechanism}</p>
            </div>
          </div>
        ))}
        {(rec.products || []).length > 2 && (
          <button onClick={() => setExpanded(!expanded)}
            className="w-full text-xs font-semibold text-blue-600 hover:text-blue-800 py-2 hover:bg-blue-50 rounded-xl transition-colors">
            {expanded ? '▲ Show less' : `▼ Show ${rec.products.length - 2} more product${rec.products.length - 2 > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SoilHealth() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setResult(null);
    const missing = SOIL_FIELDS.filter(f => !formData[f.key] || formData[f.key] === '').map(f => f.label);
    if (missing.length > 0) {
      setError(`Please fill in all fields. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`);
      return;
    }
    const payload: Record<string, number> = {};
    for (const field of SOIL_FIELDS) {
      const val = parseFloat(formData[field.key]);
      if (isNaN(val)) { setError(`Invalid number for ${field.label}`); return; }
      payload[field.key] = val;
    }
    setLoading(true);
    try {
      const data = await getSoilHealthAssessment(payload as any);
      if (data.success) { setResult(data.assessment); }
      else { setError(data.message || 'Assessment failed'); }
    } catch (err: any) { setError(err.message || 'Request failed'); }
    finally { setLoading(false); }
  };

  const handleReset = () => { setFormData({}); setResult(null); setError(''); };
  const handleSample = () => {
    setFormData({ N: '270', P: '8.6', K: '486', ph: '7.52', ec: '0.41', oc: '0.68', S: '7.84', zn: '0.66', fe: '4.21', cu: '1.08', Mn: '11.47', B: '0.44' });
    setResult(null); setError('');
  };

  const fertilityStyle = result ? (FERTILITY_STYLES[result.fertility_class] || FERTILITY_STYLES['Fertile']) : null;
  const report = result?.health_report;
  const gradeColors: Record<string, string> = { A: 'from-emerald-500 to-teal-500', B: 'from-blue-500 to-cyan-500', C: 'from-amber-500 to-yellow-500', D: 'from-orange-500 to-red-400', F: 'from-red-600 to-rose-600' };

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar />
      <main className="flex-1 md:ml-64 transition-all duration-300">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-6">
          <div className="w-full flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.25 3.25 0 0 1-2.295.951h-4.47a3.25 3.25 0 0 1-2.295-.951L5 14.5m14 0V17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight"><TranslatedText text="Soil Health Assessment" /></h1>
              <p className="text-sm text-gray-400 mt-0.5"><TranslatedText text="Comprehensive biological indicators, fertility prediction, and remediation plan" /></p>
            </div>
          </div>
        </div>

        <div className="w-full px-6 py-8 space-y-8">

          {/* ── INPUT FORM ── */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/80 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">🧪 <TranslatedText text="Enter Soil Test Results" /></h2>
                <p className="text-xs text-gray-400 mt-1"><TranslatedText text="Enter values from your soil testing lab report" /></p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleSample} className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">📋 Load Sample</button>
                <button type="button" onClick={handleReset} className="text-xs font-semibold px-4 py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">🔄 Reset</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SOIL_FIELDS.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {field.label}{field.unit && <span className="text-gray-400 font-medium ml-1">({field.unit})</span>}
                  </label>
                  <input type="number" step={field.step} min={field.min} max={field.max}
                    placeholder={field.placeholder} value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-gray-800 bg-gray-50/50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all placeholder:text-gray-300" />
                </div>
              ))}
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2"><span className="text-base">⚠</span> {error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50 active:scale-[0.99]">
              {loading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><TranslatedText text="Analyzing your soil..." /></>)
                : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.25 3.25 0 0 1-2.295.951h-4.47a3.25 3.25 0 0 1-2.295-.951L5 14.5m14 0V17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2.5" /></svg><TranslatedText text="Assess Soil Health" /></>)}
            </button>
          </form>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* RESULTS                                                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {result && (
            <div className="space-y-8" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>

              {/* ── 1. Fertility Hero Card ── */}
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100/80">
                <div className={`relative bg-gradient-to-br ${fertilityStyle?.gradient} p-8 text-white overflow-hidden`}>
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/[0.06] rounded-full" />
                  <div className="absolute bottom-0 left-16 w-32 h-32 bg-white/[0.04] rounded-full translate-y-1/2" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                      <p className="text-center text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">Soil Health Index</p>
                      <SoilHealthGauge value={result.soil_health_index} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">Fertility Classification</p>
                      <h2 className="text-4xl md:text-5xl font-black flex items-center gap-4 justify-center md:justify-start tracking-tight">
                        <span className="text-5xl drop-shadow-md">{fertilityStyle?.emoji}</span>{result.fertility_class}
                      </h2>
                      <p className="mt-3 text-sm text-white/80 leading-relaxed max-w-xl">{result.summary?.replace(/\*\*/g, '')}</p>
                      <div className="mt-4 flex items-center gap-3 justify-center md:justify-start flex-wrap">
                        <span className="text-sm font-bold px-4 py-2 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md">{Math.round(result.confidence * 100)}% confidence</span>
                        {report && <span className={`text-sm font-bold px-4 py-2 rounded-2xl bg-gradient-to-r ${gradeColors[report.report_grade] || gradeColors.C} text-white shadow-lg`}>Grade {report.report_grade}</span>}
                        <span className="text-sm font-bold px-4 py-2 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md">{result.deficiencies?.length || 0} deficiencies</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 bg-gradient-to-r from-slate-50 to-gray-50/50">
                  {Object.entries(result.class_probabilities || {}).map(([label, prob]: [string, any], i: number) => {
                    const pStyle = FERTILITY_STYLES[label] || FERTILITY_STYLES['Fertile'];
                    return (
                      <div key={label} className={`flex flex-col items-center py-4 ${i < 2 ? 'border-r border-gray-100' : ''}`}>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
                        <span className={`text-lg font-extrabold ${pStyle.text} mt-0.5`}>{Math.round(prob * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. Report Grade + Soil Type ── */}
              {report && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className={`rounded-2xl p-6 bg-gradient-to-br ${gradeColors[report.report_grade] || gradeColors.C} text-white shadow-lg`}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                        <span className="text-3xl font-black">{report.report_grade}</span>
                      </div>
                      <div>
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Report Grade</p>
                        <h3 className="text-lg font-bold leading-snug">{report.report_title}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🏔️ Inferred Soil Type</p>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed">{report.soil_type_inference}</p>
                  </div>
                </div>
              )}

              {/* ── 3. Nutrient Analysis ── */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-200/50">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Nutrient Analysis</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Detailed breakdown with severity and crop impact</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(result.nutrient_analysis || []).map((n: any) => <NutrientCard key={n.parameter} nutrient={n} />)}
                </div>
              </div>

              {/* ── 4. NPK Balance + Microbial Health ── */}
              {report && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* NPK Balance */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center"><span className="text-white text-sm">⚖️</span></div>
                      <h3 className="text-sm font-extrabold text-gray-800">NPK Balance Analysis</h3>
                      <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full ${report.npk_balance.balance_status === 'Balanced' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{report.npk_balance.balance_status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[{ label: 'N:P', val: report.npk_balance.n_p_ratio }, { label: 'N:K', val: report.npk_balance.n_k_ratio }, { label: 'P:K', val: report.npk_balance.p_k_ratio }].map(r => (
                        <div key={r.label} className="text-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{r.label}</p>
                          <p className="text-xl font-extrabold text-gray-800">{r.val}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">{report.npk_balance.interpretation}</p>
                    <p className="text-xs text-blue-600 font-medium">💡 {report.npk_balance.correction_advice}</p>
                  </div>
                  {/* Biological Activity Index */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="bg-[#e2f1e6] rounded-xl p-4 mb-4 border border-[#c2e2cb]">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-serif font-bold text-[#3d5a45]">Biological Activity Index</h3>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${report.microbial_assessment.overall_microbial_health === 'Excellent' || report.microbial_assessment.overall_microbial_health === 'Good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{report.microbial_assessment.overall_microbial_health}</span>
                      </div>
                      <p className="text-sm text-[#4d6a55] font-medium">AI-based microbial health simulation using Biological Indicator Modeling.</p>
                    </div>
                    <div className="flex items-center gap-6 mb-4">
                      <MicrobialGauge score={report.microbial_assessment.microbial_score} label="Score" />
                      <p className="flex-1 text-xs text-gray-500 leading-relaxed">{report.microbial_assessment.organic_matter_status}</p>
                    </div>
                    <div className="space-y-2">
                      {(report.microbial_assessment.biological_activity_indicators || []).map((ind: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-700 flex-1">{ind.indicator}</span>
                          <span className="text-[10px] font-bold text-gray-500 mx-2">{ind.value}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${['Low','Limiting','Limited','Stressful','Suboptimal'].includes(ind.status) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{ind.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 5. Microbial Inoculant Recommendations ── */}
              {report?.microbial_assessment?.recommended_microbial_inputs?.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-md shadow-teal-200/50"><span className="text-xl text-white">🧫</span></div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Microbial Inoculant Recommendations</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Boost your soil's biological engine with proven microbial cultures</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.microbial_assessment.recommended_microbial_inputs.map((inp: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm border-l-4 border-l-teal-400 hover:shadow-md transition-all" style={{ animation: `fadeSlideUp 0.5s ${i * 0.08}s ease-out both` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">🧫</span>
                          <h4 className="text-sm font-bold text-gray-800">{inp.product}</h4>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 ml-auto">{inp.benefit}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{inp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 6. Biological Remediation Products ── */}
              {result.bio_recommendations?.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-green-200/50"><span className="text-xl">🧬</span></div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Biological Remediation Products</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Multiple targeted products per deficiency with dosage, timing & mechanism</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {result.bio_recommendations.map((rec: any, idx: number) => (
                      <BioRecommendationCard key={rec.parameter + rec.status} rec={rec} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── 7. Crop Suitability Matrix ── */}
              {report?.crop_suitability?.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200/50"><span className="text-xl">🌾</span></div>
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Crop Suitability Matrix</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Crops matched to your soil's unique nutrient profile</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.crop_suitability.map((cs: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-800">{cs.category}</h4>
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${cs.match_score === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{cs.match_score} Match</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {cs.crops.map((c: string) => <span key={c} className="text-xs bg-green-50 text-green-700 rounded-lg px-2.5 py-1 font-semibold border border-green-100">🌱 {c}</span>)}
                        </div>
                        <p className="text-[11px] text-gray-400 italic">{cs.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 8. Remediation Priority ── */}
              {report?.remediation_priority?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-50 to-orange-50 px-6 py-4 border-b border-rose-100/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-md"><span className="text-white text-lg">🎯</span></div>
                      <div><h3 className="text-lg font-extrabold text-gray-900">Remediation Priority Order</h3><p className="text-xs text-gray-400">Address issues in this order for maximum impact</p></div>
                    </div>
                  </div>
                  <div className="p-5 space-y-2.5">
                    {report.remediation_priority.map((item: any) => (
                      <div key={item.rank} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100 hover:bg-white transition-colors">
                        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">{item.rank}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-800">{item.parameter}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.issue.includes('severe') ? 'bg-red-100 text-red-600' : item.issue.includes('moderate') ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{item.issue}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 9. Seasonal Calendar ── */}
              {report?.seasonal_calendar?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"><span className="text-white text-lg">📅</span></div>
                      <div><h3 className="text-lg font-extrabold text-gray-900">Seasonal Action Calendar</h3><p className="text-xs text-gray-400">When to apply amendments through the year</p></div>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.seasonal_calendar.map((s: any, i: number) => (
                      <div key={i} className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl p-4 border border-blue-100/40">
                        <h4 className="text-xs font-bold text-blue-700 mb-2">{s.season}</h4>
                        <p className="text-[11px] text-gray-600 leading-relaxed">{s.actions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 10. Soil Biology Tips ── */}
              {report?.soil_biology_tips?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl flex items-center justify-center shadow-md"><span className="text-white text-lg">💡</span></div>
                    <h3 className="text-lg font-extrabold text-gray-900">Soil Biology Best Practices</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.soil_biology_tips.map((tip: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 bg-green-50/40 rounded-xl p-3.5 border border-green-100/40">
                        <span className="text-sm mt-0.5 shrink-0">🌱</span>
                        <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 11. Recovery Timeline ── */}
              {report?.estimated_recovery_timeline && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100/60">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">⏳ Estimated Recovery Timeline</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.estimated_recovery_timeline}</p>
                </div>
              )}

              {/* ── 12. AI Improvement Plan ── */}
              {result.ai_insights && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-purple-100/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"><span className="text-white text-lg">🤖</span></div>
                      <div><h3 className="text-lg font-extrabold text-gray-900">AI Soil Improvement Plan</h3><p className="text-xs text-gray-400">Powered by Gemini AI — personalized to your soil profile</p></div>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📋 Overall Assessment</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.ai_insights.overall_assessment}</p>
                    </div>
                    {result.ai_insights.improvement_plan?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">📈 Improvement Steps</h4>
                        <div className="space-y-3">
                          {result.ai_insights.improvement_plan.map((step: any, i: number) => (
                            <div key={i} className="flex gap-4 bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">{step.priority}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{step.action}</p>
                                <p className="text-xs text-gray-500 mt-1">{step.expected_impact}</p>
                                <p className="text-[11px] text-purple-500 font-medium mt-1">⏱ {step.timeline}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.ai_insights.suitable_crops?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🌾 Suitable Crops (AI)</h4>
                        <div className="flex gap-2 flex-wrap">
                          {result.ai_insights.suitable_crops.map((crop: string) => <span key={crop} className="text-xs bg-emerald-50 text-emerald-700 rounded-lg px-3 py-1.5 font-semibold border border-emerald-100">🌱 {crop}</span>)}
                        </div>
                      </div>
                    )}
                    {result.ai_insights.organic_practices && (
                      <div className="bg-green-50/50 rounded-2xl p-5 border border-green-100">
                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">🌿 Organic Practices</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.ai_insights.organic_practices}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">
                  <strong>⚠ Disclaimer:</strong> This is an AI-based assessment system. For precise soil management, consult your local Krishi Vigyan Kendra (KVK) or soil testing laboratory.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
