import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

const CATEGORY_CONFIG = {
    national: { icon: '🇮🇳', label: 'National Scheme', badge: 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30' },
    state: { icon: '🏛️', label: 'State Scheme', badge: 'bg-[#138808]/10 text-[#138808] border-[#138808]/30' },
};

const TAG_COLORS = [
    'bg-[#FF9933]/10 text-[#FF9933]', 'bg-[#138808]/10 text-[#138808]', 'bg-[#000080]/10 text-[#000080]',
    'bg-amber-50 text-amber-700', 'bg-emerald-50 text-emerald-700', 'bg-indigo-50 text-indigo-700',
    'bg-teal-50 text-teal-700', 'bg-rose-50 text-rose-700'
];

export default function Schemes() {
    const [schemes, setSchemes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedState, setSelectedState] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedScheme, setExpandedScheme] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    const states = Object.keys(INDIAN_STATES).sort();

    useEffect(() => {
        try {
            const session = JSON.parse(localStorage.getItem('ammachi_session') || '{}');
            if (session.userId) {
                setCurrentUser(session);
                if (session.state) setSelectedState(session.state);
            }
        } catch (e) { }
    }, []);

    useEffect(() => {
        if (selectedState) fetchSchemes();
    }, [selectedState, activeFilter]);

    const fetchSchemes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedState) params.append('state', selectedState);
            if (activeFilter !== 'all') params.append('category', activeFilter);

            const res = await apiFetch(`/api/schemes/?${params}`);
            const data = await res.json();
            if (data.success) setSchemes(data.data || []);
            else setSchemes([]);
        } catch (err) {
            console.error('Failed to fetch schemes:', err);
            setSchemes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) { fetchSchemes(); return; }
        setLoading(true);
        try {
            const res = await apiFetch(`/api/schemes/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.success) setSchemes(data.data || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const nationalCount = schemes.filter(s => s.category === 'national').length;
    const stateCount = schemes.filter(s => s.category === 'state').length;

    return (
        <div className="flex bg-gradient-to-br from-orange-50/30 via-white to-green-50/30 min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

                {/* â•â•â• Tricolor Hero Banner â•â•â• */}
                <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    {/* Saffron band */}
                    <div className="bg-gradient-to-r from-[#FF9933] via-[#FFa94d] to-[#FF9933] px-8 pt-8 pb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute top-2 right-8 text-7xl opacity-10" style={{ animation: 'float 4s ease-in-out infinite' }}>🏛️</div>

                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3 drop-shadow-lg">
                                🏛️ Government Schemes
                            </h1>
                            <p className="text-white/90 text-lg font-medium">
                                Empowering Indian farmers — National & State welfare schemes
                                {selectedState && <span className="ml-2 bg-white/25 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">📍</span>}
                            </p>
                        </div>
                    </div>

                    {/* White band with Ashoka Chakra accent + stats */}
                    <div className="bg-white px-8 py-5 relative">
                        {/* Subtle Ashoka Chakra watermark */}
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.03] text-[120px] pointer-events-none select-none">☸</div>

                        <div className="relative z-10 grid grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-[#FF9933]/5 to-[#FF9933]/10 rounded-2xl p-4 text-center border border-[#FF9933]/15 hover:shadow-lg transition-all duration-300">
                                <div className="text-3xl font-extrabold text-[#FF9933]">{schemes.length}</div>
                                <div className="text-gray-600 text-sm font-bold mt-1">Total Schemes</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#000080]/5 to-[#000080]/10 rounded-2xl p-4 text-center border border-[#000080]/15 hover:shadow-lg transition-all duration-300">
                                <div className="text-3xl font-extrabold text-[#000080]">🇮🇳 {nationalCount}</div>
                                <div className="text-gray-600 text-sm font-bold mt-1">National</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#138808]/5 to-[#138808]/10 rounded-2xl p-4 text-center border border-[#138808]/15 hover:shadow-lg transition-all duration-300">
                                <div className="text-3xl font-extrabold text-[#138808]">🏛️</div>
                                <div className="text-gray-600 text-sm font-bold mt-1">State ({selectedState || '—'})</div>
                            </div>
                        </div>
                    </div>

                    {/* Green band */}
                    <div className="bg-gradient-to-r from-[#138808] via-[#1a9e0a] to-[#138808] h-3"></div>
                </div>

                {/* â•â•â• State Selector + Search â•â•â• */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-6" style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">🗺 Select State</label>
                            <select value={selectedState}
                                onChange={(e) => setSelectedState(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#FF9933] focus:ring-4 focus:ring-[#FF9933]/10 font-medium text-gray-800 transition-all">
                                <option value="">Choose a State</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">📐 Search Schemes</label>
                            <div className="flex gap-2">
                                <input type="text" value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search by name, keyword (e.g., insurance, credit, organic)..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#138808] focus:ring-4 focus:ring-[#138808]/10 font-medium transition-all" />
                                <button onClick={handleSearch}
                                    className="px-6 py-3 bg-gradient-to-r from-[#FF9933] to-[#FFa94d] text-white rounded-xl font-bold shadow-lg shadow-[#FF9933]/20 hover:shadow-xl transition-all hover:-translate-y-0.5">
                                    📐
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* â•â•â• Filters â•â•â• */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        { id: 'all', label: '📋 All Schemes', color: '#FF9933' },
                        { id: 'national', label: '🇮🇳 National', color: '#000080' },
                        { id: 'state', label: '🏛️ State', color: '#138808' },
                    ].map(f => (
                        <button key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${activeFilter === f.id
                                ? 'text-white shadow-lg hover:-translate-y-0.5'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
                            style={activeFilter === f.id ? { background: `linear-gradient(135deg, ${f.color}, ${f.color}dd)`, boxShadow: `0 8px 25px ${f.color}30` } : {}}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* â•â•â• Schemes List â•â•â• */}
                {!selectedState ? (
                    <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-[#FF9933]/30">
                        <div className="text-6xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>🗺</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Select a State to View Schemes</h3>
                        <p className="text-gray-500">Choose your state above to browse national & state-specific agricultural schemes</p>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center p-16">
                        {/* Tricolor spinner */}
                        <div className="relative w-16 h-16 mb-4">
                            <div className="w-16 h-16 border-4 border-[#FF9933] border-t-[#138808] border-r-white border-b-[#000080] rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-500 font-medium">Loading government schemes...</p>
                    </div>
                ) : schemes.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="text-6xl mb-4">📐</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No Schemes Found</h3>
                        <p className="text-gray-500">Try a different search term or clear filters</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {schemes.map((scheme, i) => {
                            const cat = CATEGORY_CONFIG[scheme.category] || CATEGORY_CONFIG.national;
                            const isExpanded = expandedScheme === (scheme._id || scheme.id);
                            const isNational = scheme.category === 'national';

                            return (
                                <div key={scheme._id || scheme.id || i}
                                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 group"
                                    style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}>

                                    {/* Tricolor stripe: saffron → white → green */}
                                    <div className="flex h-2">
                                        <div className="flex-1 bg-[#FF9933]"></div>
                                        <div className="flex-1 bg-white"></div>
                                        <div className="flex-1 bg-[#138808]"></div>
                                    </div>

                                    <div className="p-6">
                                        {/* Header row */}
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300 ${isNational ? 'bg-gradient-to-br from-[#FF9933] to-[#e88a2e]' : 'bg-gradient-to-br from-[#138808] to-[#0f6b06]'}`}>
                                                    {cat.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-extrabold text-gray-800 group-hover:text-[#FF9933] transition-colors leading-tight">
                                                        {scheme.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${cat.badge}`}>
                                                            {cat.label}
                                                        </span>
                                                        {scheme.launch_year && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                                                                📅 {scheme.launch_year}
                                                            </span>
                                                        )}
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${scheme.status === 'active' ? 'bg-[#138808]/10 text-[#138808] border border-[#138808]/20' : 'bg-gray-100 text-gray-600'}`}>
                                                            {scheme.status === 'active' ? '✅ Active' : scheme.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {scheme.official_url && (
                                                <a href={scheme.official_url} target="_blank" rel="noopener noreferrer"
                                                    className="px-5 py-2.5 bg-gradient-to-r from-[#138808] to-[#1a9e0a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#138808]/20 hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap">
                                                    🔗 Official Website
                                                </a>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-600 leading-relaxed mb-4 text-sm">{scheme.description}</p>

                                        {/* Department */}
                                        {scheme.department && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                                <span>🏢</span>
                                                <span className="font-medium">{scheme.department}</span>
                                            </div>
                                        )}

                                        {/* Highlights — tricolor accent */}
                                        {scheme.highlights && scheme.highlights.length > 0 && (
                                            <div className="bg-gradient-to-r from-[#FF9933]/5 via-white to-[#138808]/5 rounded-2xl p-4 mb-4 border border-gray-100 relative overflow-hidden">
                                                {/* Mini tricolor left border */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col">
                                                    <div className="flex-1 bg-[#FF9933]"></div>
                                                    <div className="flex-1 bg-white"></div>
                                                    <div className="flex-1 bg-[#138808]"></div>
                                                </div>
                                                <h4 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-1 ml-2">✨ Key Highlights</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-2">
                                                    {scheme.highlights.map((h, j) => (
                                                        <div key={j} className="flex items-start gap-2 text-sm">
                                                            <span className={`font-bold mt-0.5 ${j % 2 === 0 ? 'text-[#FF9933]' : 'text-[#138808]'}`}>▸</span>
                                                            <span className="text-gray-700">{h}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Expand button */}
                                        <button onClick={() => setExpandedScheme(isExpanded ? null : (scheme._id || scheme.id))}
                                            className="text-sm text-[#000080] font-bold hover:text-[#FF9933] flex items-center gap-1 mb-3 transition-colors">
                                            {isExpanded ? '▲ Show Less' : '▼ Show More Details'}
                                        </button>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="space-y-4 pt-4 border-t border-gray-100" style={{ animation: 'slideUp 0.3s ease-out' }}>
                                                {scheme.eligibility && (
                                                    <div className="bg-[#000080]/5 rounded-xl p-4 border border-[#000080]/10">
                                                        <h5 className="text-sm font-extrabold text-[#000080] mb-1.5">👥 Eligibility</h5>
                                                        <p className="text-sm text-gray-700">{scheme.eligibility}</p>
                                                    </div>
                                                )}
                                                {scheme.benefits && (
                                                    <div className="bg-[#138808]/5 rounded-xl p-4 border border-[#138808]/10">
                                                        <h5 className="text-sm font-extrabold text-[#138808] mb-1.5">💰 Benefits</h5>
                                                        <p className="text-sm text-gray-700">{scheme.benefits}</p>
                                                    </div>
                                                )}
                                                {scheme.official_url && (
                                                    <div className="bg-[#FF9933]/5 rounded-xl p-4 border border-[#FF9933]/10">
                                                        <h5 className="text-sm font-extrabold text-[#FF9933] mb-1.5">🔗 Official URL</h5>
                                                        <a href={scheme.official_url} target="_blank" rel="noopener noreferrer"
                                                            className="text-sm text-[#000080] hover:text-[#FF9933] underline break-all font-medium transition-colors">
                                                            {scheme.official_url}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {scheme.tags && scheme.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                                                {scheme.tags.map((tag, j) => (
                                                    <span key={j} className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${TAG_COLORS[j % TAG_COLORS.length]}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </main>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
        </div>
    );
}
