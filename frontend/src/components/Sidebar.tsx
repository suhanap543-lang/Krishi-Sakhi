import React, { useState, useEffect } from 'react';
import TranslatedText from './TranslatedText';

const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function Sidebar() {
  const [current, setCurrent] = useState(() => {
    return (window.location.hash || '#/').replace('#/', '') || 'dashboard';
  });

  useEffect(() => {
    const onHash = () => setCurrent((window.location.hash || '#/').replace('#/', '') || 'dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(h) {
    window.location.hash = `#/${h}`;
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { }
  }

  function signOut() {
    localStorage.removeItem('ammachi_profile');
    localStorage.removeItem('ammachi_session');
    window.location.hash = '#/login';
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { }
  }

  const icons = {
    dashboard: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>
    ),
    chat: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    detect: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="3" /></svg>
    ),
    weather: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 18a5 5 0 0 0-9.9-1H7a4 4 0 1 0 0 8h10a4 4 0 0 0 0-8h-.1z" /><circle cx="12" cy="12" r="5" /></svg>
    ),
    market: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 17v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" /><rect x="1" y="17" width="22" height="6" rx="2" /></svg>
    ),
    community: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
    ),
    profile: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
    ),
    logout: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /><rect x="3" y="3" width="7" height="18" rx="2" /></svg>
    ),
    smartRecommendations: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548 5.474a3 3 0 0 1-2.988 2.702h-1.04a3 3 0 0 1-2.987-2.702l-.549-5.475Z" /></svg>
    )
  };

  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
    { key: 'farms', label: 'Farms', icon: icons.market },
    { key: 'activities', label: 'Activities', icon: icons.detect },
    { key: 'reminders', label: 'Reminders', icon: icons.weather },
    { key: 'officers', label: 'Officers', icon: icons.community },
    { key: 'chat', label: 'Chat', icon: icons.chat },
    { key: 'detect', label: 'Detect', icon: icons.detect },
    { key: 'weather', label: 'Weather', icon: icons.weather },
    { key: 'market', label: 'Market', icon: icons.market },
    { key: 'smart-recommendations', label: 'Smart Recs', icon: icons.smartRecommendations },
    { key: 'soil-health', label: 'Soil Health', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a3.25 3.25 0 0 1-2.295.951h-4.47a3.25 3.25 0 0 1-2.295-.951L5 14.5m14 0V17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2.5" /></svg>
    ) },
    { key: 'schemes', label: 'Schemes', icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /><path d="M2 20h20" /></svg>) },
    { key: 'feedback', label: 'Feedback', icon: icons.profile },
    { key: 'profile', label: 'Profile', icon: icons.profile }
  ];

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 bg-green-50/80 backdrop-blur-xl border-r border-green-100 z-50 transition-all duration-300">
      <div className="p-6 flex items-center gap-4 mb-4">
        <img src={logoUrl} alt="Ammachi AI" className="w-12 h-12 rounded-xl object-contain shadow-sm" />
        <div>
          <div className="font-extrabold text-green-900 text-lg tracking-tight">Krishi Sakhi</div>
          <div className="text-xs text-green-700/70 font-medium"><TranslatedText text="Your Farming Companion" /></div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => navigate(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group
              ${current === item.key
                ? 'bg-gradient-to-r from-emerald-100 to-green-50 text-emerald-800 shadow-sm border border-emerald-100/50'
                : 'text-gray-600 hover:bg-white hover:text-emerald-700 hover:shadow-sm'}`}
            aria-current={current === item.key ? 'page' : undefined}
          >
            <span className={`transition-colors duration-200 ${current === item.key ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`}>
              {item.icon}
            </span>
            <span className="text-sm font-semibold"><TranslatedText text={item.label} /></span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-green-100">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <TranslatedText text="Logout" />
        </button>
      </div>
    </aside>
  );
}
