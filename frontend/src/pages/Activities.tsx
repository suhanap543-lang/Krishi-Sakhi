import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';
import { Mic, Square } from 'lucide-react';

const TYPE_COLORS = {
  sowing: { bg: 'from-green-400 to-emerald-500', light: 'bg-green-50 text-green-700', iconBg: 'bg-green-100 text-green-600' },
  irrigation: { bg: 'from-blue-400 to-cyan-500', light: 'bg-blue-50 text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
  fertilizer: { bg: 'from-teal-400 to-green-500', light: 'bg-teal-50 text-teal-700', iconBg: 'bg-teal-100 text-teal-600' },
  pesticide: { bg: 'from-purple-400 to-indigo-500', light: 'bg-purple-50 text-purple-700', iconBg: 'bg-purple-100 text-purple-600' },
  weeding: { bg: 'from-yellow-400 to-amber-500', light: 'bg-yellow-50 text-yellow-700', iconBg: 'bg-yellow-100 text-yellow-600' },
  harvesting: { bg: 'from-orange-400 to-red-500', light: 'bg-orange-50 text-orange-700', iconBg: 'bg-orange-100 text-orange-600' },
  pest_issue: { bg: 'from-red-400 to-pink-500', light: 'bg-red-50 text-red-700', iconBg: 'bg-red-100 text-red-600' },
  disease_issue: { bg: 'from-rose-400 to-red-500', light: 'bg-rose-50 text-rose-700', iconBg: 'bg-rose-100 text-rose-600' },
  other: { bg: 'from-gray-400 to-slate-500', light: 'bg-gray-50 text-gray-700', iconBg: 'bg-gray-100 text-gray-600' }
};

const ACTIVITY_TYPES = [
  { value: 'sowing', label: 'Sowing', icon: '🌱' },
  { value: 'irrigation', label: 'Irrigation', icon: '💧' },
  { value: 'fertilizer', label: 'Fertilizer Application', icon: '🧪' },
  { value: 'pesticide', label: 'Pesticide Application', icon: '🛡️' },
  { value: 'weeding', label: 'Weeding', icon: '🌿' },
  { value: 'harvesting', label: 'Harvesting', icon: '🌾' },
  { value: 'pest_issue', label: 'Pest Issue', icon: '🐛' },
  { value: 'disease_issue', label: 'Disease Issue', icon: '🦠' },
  { value: 'other', label: 'Other', icon: '📋' }
];

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    farm: '', text_note: '',
    date: new Date().toISOString().split('T')[0],
    activity_type: 'irrigation'
  });

  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'upcoming'

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const sessionRaw = localStorage.getItem('ammachi_session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (session?.userId) {
      setCurrentUser(session);
      fetchFarmsForUser(session.userId);
      fetchData(session.userId);
    } else {
      window.location.hash = '#/login';
    }
  }, []);

  const fetchData = async (farmerId, forceRefreshInsights = false) => {
    setLoading(true);
    setLoadingInsights(true);
    try {
      // Fetch activities
      const actRes = await apiFetch(`/api/activities/?farmer_id=${farmerId}`);
      const actData = await actRes.json();
      setActivities(actData);

      // Check localStorage for cached insights first
      const stateHash = actData.map(a => a.id + (a.updated_at || a.date)).join('_');
      const cacheKey = `krishi_insights_v3_${farmerId}`;
      const cachedDataStr = localStorage.getItem(cacheKey);

      if (cachedDataStr && !forceRefreshInsights) {
        try {
          const cachedPayload = JSON.parse(cachedDataStr);
          // Only use cache if it matches the current exact activity state
          if (cachedPayload.stateHash === stateHash) {
            console.log('Serving insights from local browser cache');
            setInsights(cachedPayload);
            return;
          }
        } catch (e) {
          console.warn('Cache corrupted, fetching fresh.');
        }
      }

      // Fetch AI Insights (if forced or cache miss/invalid)
      const insRes = await apiFetch(`/api/activities/insights?farmer_id=${farmerId}`);
      if (insRes.ok) {
        const insData = await insRes.json();
        insData.stateHash = stateHash; // Attach the current state hash
        setInsights(insData);
        // Only save to cache if it's a real AI response, NOT a fallback error state
        if (insData.source !== 'fallback_api_error') {
          localStorage.setItem(cacheKey, JSON.stringify(insData));
        } else {
          console.warn('Received fallback insights, skipping localStorage cache to retry later.');
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setLoadingInsights(false);
    }
  };

  const fetchFarmsForUser = async (farmerId) => {
    try {
      const response = await apiFetch(`/api/farms/?farmer_id=${farmerId}`);
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser doesn't support speech recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, text_note: prev.text_note ? `${prev.text_note} ${transcript}` : transcript }));
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!formData.farm) {
      setError('Please select a farm');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData, farmer: currentUser.userId };
      const response = await apiFetch('/api/activities/quick_add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchData(currentUser.userId, true); // Force refresh insights on new activity
        setFormData({ farm: '', text_note: '', date: new Date().toISOString().split('T')[0], activity_type: 'irrigation' });
        setShowAddForm(false);
        setSuccess('Activity logged successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to log activity');
      }
    } catch (error) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (activityId) => {
    if (window.confirm('Delete this activity?')) {
      try {
        await apiFetch(`/api/activities/${activityId}/`, { method: 'DELETE' });
        fetchData(currentUser.userId, true); // Force refresh insights on deletion
      } catch (error) {
        console.error('Error deleting activity:', error);
      }
    }
  };

  const getTypeInfo = (type) => ACTIVITY_TYPES.find(a => a.value === type) || ACTIVITY_TYPES[8];
  const getTypeColor = (type) => TYPE_COLORS[type] || TYPE_COLORS.other;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Date utils for calculating if upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex bg-gradient-to-br from-indigo-50 via-purple-50/30 to-blue-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        {/* --- Gradient Hero Header --- */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl shadow-purple-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" style={{ animation: 'pulse 4s ease-in-out infinite' }}></div>
          <div className="absolute top-6 right-16 text-6xl opacity-15 animate-bounce" style={{ animationDuration: '3s' }}>🌾</div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                📊 Activity Tracking & AI Insights
              </h1>
              <p className="text-purple-100 text-lg">
                Manage your farm schedule and get smart recommendations
                {currentUser && (
                  <span className="ml-3 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md border border-white/20">
                    👨‍🌾 {currentUser.name}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setShowAddForm(true)}
              className="px-8 py-3.5 bg-white text-purple-700 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-purple-50 transition-all transform hover:-translate-y-1 flex items-center gap-2 text-lg">
              <span className="text-2xl leading-none mb-0.5">+</span> Log Activity
            </button>
          </div>
        </div>

        {/* Success/Error Toasts */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-2xl border border-emerald-200 font-bold flex items-center gap-2 shadow-sm" style={{ animation: 'slideDown 0.3s ease-out' }}>
            <span className="text-xl">✅</span> {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 text-red-700 rounded-2xl border border-red-200 font-bold flex items-center gap-2 shadow-sm" style={{ animation: 'slideDown 0.3s ease-out' }}>
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-8">

          {/* --- Left Column: Activities Timeline --- */}
          <div className="flex-1 space-y-6">

            <div className="flex items-center gap-2 px-1">
              <span className="text-xl font-extrabold text-gray-800">📋 All Activities ({activities.length})</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold">Loading schedule...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-purple-200">
                <div className="text-6xl mb-4 opacity-50">📝</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No activities logged yet</h3>
                <p className="text-gray-500 mb-6">Start logging past tasks or schedule future ones to stay organized.</p>
                <button onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-colors">
                  + Log Something
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const typeInfo = getTypeInfo(activity.activity_type);
                  const typeColor = getTypeColor(activity.activity_type);

                  const activityDate = new Date(activity.date);
                  const isUpcoming = activityDate > today;
                  const daysAway = isUpcoming ? Math.ceil((activityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <div key={activity.id}
                      className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden`}
                      style={{ animation: `slideUp 0.4s ease-out ${index * 0.05}s both` }}>

                      {/* Left glowing stripe */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${typeColor.bg} opacity-80`}></div>

                      {/* Icon */}
                      <div className={`flex-shrink-0 w-14 h-14 ${typeColor.iconBg} rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300 ml-2 ${isUpcoming ? 'opacity-80 ring-2 ring-pink-200 ring-offset-2' : ''}`}>
                        {typeInfo.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-extrabold text-gray-800 text-lg group-hover:text-purple-700 transition-colors">{typeInfo.label}</h4>
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold mt-1 ${typeColor.light}`}>
                              {activity.activity_type.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isUpcoming && daysAway !== null ? (
                              <span className="text-xs font-extrabold text-pink-600 bg-pink-50 px-3 py-1 rounded-lg border border-pink-200 shadow-sm">
                                ⏳ Upcoming in {daysAway} day{daysAway !== 1 ? 's' : ''}
                              </span>
                            ) : null}
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-500">{formatDate(activity.date)}</span>
                              <button onClick={() => handleDelete(activity.id)}
                                className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-700 font-medium mb-3 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100">{activity.text_note}</p>

                        <div className="flex flex-wrap gap-2 text-sm font-bold">
                          {activity.farm_name && (
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <span>🏡</span> {activity.farm_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* --- Right Column: AI Smart Insights --- */}
          <div className="w-full xl:w-96 space-y-5">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-500/10 border border-white/60 overflow-hidden sticky top-8">

              {/* Header */}
              <div className="relative p-6 text-white text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)' }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent_50%)]"></div>
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-md"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    AI-Powered
                  </div>
                  <h3 className="font-extrabold text-xl mb-1">Smart Insights</h3>
                  <p className="text-white/70 text-xs font-medium">Personalized data-driven farming advice</p>
                </div>
              </div>

              {loadingInsights ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-14 h-14 border-[3px] border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                  <p className="text-purple-500 font-semibold text-sm animate-pulse">Analyzing your farm patterns...</p>
                </div>
              ) : insights?.insights ? (
                <div className="p-5 space-y-5">

                  {/* -- Productivity Score -- */}
                  <div className="text-center">
                    {activities.length === 0 ? (
                      <div className="py-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center text-gray-300 text-3xl mb-3 border-2 border-dashed border-gray-200">📊</div>
                        <p className="font-bold text-gray-400 text-sm">Log activities to see your score</p>
                      </div>
                    ) : (() => {
                      const score = insights.insights.productivity_score;
                      const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                      const scoreBg = score >= 80 ? 'from-emerald-50 to-green-50' : score >= 50 ? 'from-amber-50 to-yellow-50' : 'from-red-50 to-rose-50';
                      const scoreBorder = score >= 80 ? 'border-emerald-200' : score >= 50 ? 'border-amber-200' : 'border-red-200';
                      const scoreTextColor = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <div className={`bg-gradient-to-br ${scoreBg} rounded-2xl p-5 border ${scoreBorder}`}>
                          <div className="relative inline-flex items-center justify-center mb-2">
                            <svg className="w-28 h-28 transform -rotate-90" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))' }}>
                              <circle cx="56" cy="56" r="48" stroke="#e5e7eb" strokeWidth="8" fill="transparent" />
                              <circle cx="56" cy="56" r="48" stroke={scoreColor} strokeWidth="8" fill="transparent"
                                strokeDasharray="301.59" strokeDashoffset={301.59 - (301.59 * score) / 100}
                                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-3xl font-black text-gray-800" style={{ letterSpacing: '-0.05em' }}>{score}</span>
                              <span className="text-[10px] text-gray-400 block font-semibold">/100</span>
                            </div>
                          </div>
                          <p className={`font-bold text-sm ${scoreTextColor}`}>{insights.insights.productivity_label}</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* -- Weekly Summary -- */}
                  {insights.insights.weekly_summary && (
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">📅 This Week</p>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">{insights.insights.weekly_summary}</p>
                    </div>
                  )}

                  {/* -- Top Recommendation -- */}
                  <div className="relative rounded-2xl p-4 border border-indigo-100 overflow-hidden" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)' }}>
                    <div className="absolute top-2 right-2 text-3xl opacity-10">💡</div>
                    <h4 className="font-bold text-indigo-700 mb-1.5 flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xs">✨</span>
                      Top Recommendation
                    </h4>
                    <p className="text-indigo-900/75 text-[13px] leading-relaxed font-medium">{insights.insights.top_recommendation}</p>
                  </div>

                  {/* -- Risk Alert -- */}
                  {insights.insights.risk_alert && !insights.insights.risk_alert.toLowerCase().includes('no risk') && !insights.insights.risk_alert.toLowerCase().includes('no current risk') && (
                    <div className="relative rounded-2xl p-4 border border-red-200 overflow-hidden" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)' }}>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                      <h4 className="font-bold text-red-600 text-sm flex items-center gap-2 mb-1.5">
                        <span className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center text-white text-xs">⚠️</span>
                        Risk Alert
                      </h4>
                      <p className="text-red-700/80 text-xs font-medium leading-relaxed">{insights.insights.risk_alert}</p>
                    </div>
                  )}

                  {/* -- Focus Areas -- */}
                  {insights.insights.next_actions?.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-600 text-xs mb-3 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-5 h-0.5 bg-purple-400 rounded-full"></span>
                        Focus Areas
                        <span className="w-5 h-0.5 bg-purple-400 rounded-full"></span>
                      </h4>
                      <div className="space-y-2">
                        {insights.insights.next_actions.map((action, i) => (
                          <div key={i} className="flex gap-3 items-start bg-gray-50/80 hover:bg-white p-3 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-sm group">
                            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-[10px] shadow-sm shadow-purple-500/30 group-hover:scale-110 transition-transform">{i + 1}</span>
                            <span className="text-gray-600 text-[13px] font-medium leading-snug pt-0.5">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* -- Pattern & Streak Row -- */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {insights.insights.pattern_insight && !insights.insights.pattern_insight.toLowerCase().includes('log more') && (
                      <div className="flex items-start gap-3 bg-violet-50/80 p-3 rounded-xl border border-violet-100">
                        <span className="text-lg mt-0.5">🔍</span>
                        <div>
                          <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-0.5">Pattern</p>
                          <p className="text-violet-800 text-xs font-medium leading-relaxed">{insights.insights.pattern_insight}</p>
                        </div>
                      </div>
                    )}
                    {insights.insights.streak_info && (
                      <div className="flex items-start gap-3 bg-orange-50/80 p-3 rounded-xl border border-orange-100">
                        <span className="text-lg mt-0.5">🔥</span>
                        <div>
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Streak</p>
                          <p className="text-orange-800 text-xs font-medium leading-relaxed">{insights.insights.streak_info}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* -- Seasonal Tip -- */}
                  {insights.insights.seasonal_tip && (
                    <div className="flex items-start gap-3 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                      <span className="text-lg mt-0.5">🌤️</span>
                      <div>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Seasonal Tip</p>
                        <p className="text-emerald-800 text-xs font-medium leading-relaxed">{insights.insights.seasonal_tip}</p>
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            {/* -- Activity Breakdown with bars -- */}
            {activities.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 shadow-lg shadow-gray-200/50 border border-white/60 overflow-hidden relative">
                <div className="absolute -bottom-10 -right-10 text-8xl opacity-[0.03]">📊</div>
                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px]">📈</span>
                  Activity Breakdown
                </h4>
                <div className="space-y-2.5 relative z-10">
                  {ACTIVITY_TYPES.map((t, i) => {
                    const cnt = activities.filter(a => a.activity_type === t.value).length;
                    if (cnt === 0) return null;
                    const pct = Math.round((cnt / activities.length) * 100);
                    const c = getTypeColor(t.value);
                    return (
                      <div key={i} className="group">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${c.iconBg}`}>{t.icon}</span>
                            {t.label}
                          </div>
                          <span className="text-[11px] font-bold text-gray-400">{cnt} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${c.bg} rounded-full`} style={{ width: `${pct}%`, transition: 'width 0.8s ease-out' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* --- Add Activity Modal --- */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">📝 Schedule/Log Activity</h3>
                <button onClick={() => setShowAddForm(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">×</button>
              </div>

              <form onSubmit={handleQuickAdd} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🏡 Select Farm</label>
                  <select value={formData.farm} onChange={(e) => setFormData({ ...formData, farm: e.target.value })} required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 font-bold text-gray-700">
                    <option value="">-- Choose Farm --</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔧 Activity</label>
                    <select value={formData.activity_type} onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-500 font-bold text-gray-700">
                      {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 Date</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-500 font-bold text-gray-700" />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-2">📝 Notes & Details</label>
                  <textarea value={formData.text_note} onChange={(e) => setFormData({ ...formData, text_note: e.target.value })}
                    placeholder="Describe what was done or needs to be done..." rows={4} required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 font-medium pr-12 resize-none" />

                  <button type="button" onClick={toggleListening}
                    className={`absolute bottom-4 right-4 p-2 rounded-xl transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                    {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                    {loading ? '⏳ Saving...' : (new Date(formData.date) > today ? '📅 Schedule' : '✅ Save Activity')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
