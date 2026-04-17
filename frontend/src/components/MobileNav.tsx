import React from 'react';

export default function MobileNav() {
  function navigate(h) {
    window.location.hash = '#/' + h;
    try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { }
  }

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-100 p-2 flex justify-around items-center">
      <button className="flex flex-col items-center gap-1 p-2 text-emerald-800 font-bold hover:bg-emerald-50 rounded-xl transition-colors w-full" onClick={() => navigate('dashboard')}>
        <span className="text-xl">📍</span>
        <span className="text-xs">Dashboard</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-emerald-800 font-bold hover:bg-emerald-50 rounded-xl transition-colors w-full" onClick={() => navigate('chat')}>
        <span className="text-xl">💬</span>
        <span className="text-xs">Chat</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-emerald-800 font-bold hover:bg-emerald-50 rounded-xl transition-colors w-full" onClick={() => navigate('detect')}>
        <span className="text-xl">🔎</span>
        <span className="text-xs">Detect</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-emerald-800 font-bold hover:bg-emerald-50 rounded-xl transition-colors w-full" onClick={() => navigate('weather')}>
        <span className="text-xl">☁️</span>
        <span className="text-xs">Weather</span>
      </button>
      <button className="flex flex-col items-center gap-1 p-2 text-emerald-800 font-bold hover:bg-emerald-50 rounded-xl transition-colors w-full" onClick={() => navigate('market')}>
        <span className="text-xl">💰</span>
        <span className="text-xs">Market</span>
      </button>
    </nav>
  );
}
