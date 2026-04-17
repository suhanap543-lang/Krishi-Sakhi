import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export default function SmartRecommendations({ dashboardData, weather }) {
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    const CATEGORY_ICONS = {
        crop: '🌾', soil: '🪨', irrigation: '💧', pest: '🐛',
        fertilizer: '🧪', market: '📈', best_practice: 'â­', general: '💡'
    };

    const CATEGORY_COLORS = {
        crop: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        soil: 'bg-amber-50 text-amber-700 border-amber-200',
        irrigation: 'bg-blue-50 text-blue-700 border-blue-200',
        pest: 'bg-red-50 text-red-700 border-red-200',
        fertilizer: 'bg-purple-50 text-purple-700 border-purple-200',
        market: 'bg-pink-50 text-pink-700 border-pink-200',
        best_practice: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        general: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const IMPACT_BADGES = {
        high: '🔥 High',
        medium: '⚡ Medium',
        low: '💚 Low'
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        setIsLoading(true);
        try {
            const session = JSON.parse(localStorage.getItem('ammachi_session') || '{}');
            if (!session.userId) { setIsLoading(false); return; }

            const res = await apiFetch(`/api/recommendations/?farmer_id=${session.userId}`);
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                setRecommendations(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch recommendations:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = activeTab === 'all'
        ? recommendations.slice(0, 6)
        : recommendations.filter(r => r.category === activeTab).slice(0, 6);

    const tabs = [
        { id: 'all', label: 'All', icon: '📋' },
        { id: 'crop', label: 'Crops', icon: '🌾' },
        { id: 'soil', label: 'Soil', icon: '🪨' },
        { id: 'irrigation', label: 'Water', icon: '💧' },
    ];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Smart Recommendations</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {recommendations.length > 0 ? `${recommendations.length} AI recommendations` : 'AI Analysis Active'}
                        </p>
                    </div>
                </div>

                <div className="flex p-1 bg-gray-100/80 rounded-xl overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    [1, 2].map(i => (
                        <div key={i} className="border border-gray-100 rounded-xl p-5 animate-pulse bg-gray-50">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-2 text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <div className="text-4xl mb-2">🤖</div>
                        <p className="text-gray-500 font-medium text-sm">No recommendations yet.</p>
                        <a href="#/smart-recommendations" className="text-indigo-600 font-bold text-sm mt-2 inline-block hover:underline">
                            Generate Recommendations →
                        </a>
                    </div>
                ) : (
                    filtered.map((item, idx) => {
                        const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
                        const catIcon = CATEGORY_ICONS[item.category] || '💡';
                        return (
                            <div key={item._id || idx}
                                className="border border-gray-100 rounded-xl p-5 hover:border-indigo-100 hover:shadow-md transition-all group bg-white relative overflow-hidden"
                                style={{ animation: `slideUp 0.3s ease-out ${idx * 0.05}s both` }}>
                                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold border ${catColor}`}>
                                    {IMPACT_BADGES[item.impact] || '⚡ Medium'}
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full text-lg border ${catColor}`}>
                                        {catIcon}
                                    </div>
                                    <div className="flex-1 pr-14">
                                        <h4 className="font-bold text-gray-800 mb-1 group-hover:text-indigo-600 transition-colors text-sm">
                                            {item.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                                            {item.description}
                                        </p>
                                        <a href="#/smart-recommendations"
                                            className="mt-3 text-sm font-bold text-indigo-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View Details →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {recommendations.length > 0 && (
                <div className="mt-4 text-center">
                    <a href="#/smart-recommendations"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all hover:-translate-y-0.5">
                        View All {recommendations.length} Recommendations →
                    </a>
                </div>
            )}

            <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
        </div>
    );
}
