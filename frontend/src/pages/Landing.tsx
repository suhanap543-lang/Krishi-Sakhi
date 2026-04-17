import React from 'react';

const bgUrl = '/images/landing-bg.webp';
const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function Landing() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden" aria-label="Ammachi AI landing">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center z-[-2] transform scale-105"
        style={{ backgroundImage: `url(${bgUrl})` }}
        aria-hidden="true"
      />
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 z-[-1]" aria-hidden="true" />

      <div className="w-full max-w-5xl px-6 py-12 flex flex-col items-center text-center z-10">
        <img src={logoUrl} alt="Ammachi logo" className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/20 shadow-2xl mb-8 animate-bounce-slow" />

        <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight drop-shadow-lg">
          Welcome to <span className="text-emerald-400">Krishi Sakhi</span>
        </h1>
        <p className="text-xl md:text-2xl font-light text-emerald-100 mb-4 tracking-wide">Your Farming Assistant</p>
        <p className="text-lg text-gray-200 max-w-2xl mb-12 leading-relaxed">
          Smart, simple, and supportive tools for every farmer.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mb-16 w-full max-w-md">
          <a className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg shadow-emerald-500/30" href="#/login" aria-label="Login">
            <span aria-hidden>↪</span>
            <span>Login</span>
          </a>
          <a className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 backdrop-blur-sm" href="#/signup" aria-label="Sign Up">
            <span aria-hidden>✚</span>
            <span>Sign Up</span>
          </a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {[
            { icon: '🌱', title: 'Disease Detection', desc: 'Instant crop diagnosis' },
            { icon: '☀', title: 'Weather Alerts', desc: '7-day forecasts' },
            { icon: '💰', title: 'Market Prices', desc: 'Live crop rates' },
            { icon: '🤖', title: 'AI Assistant', desc: '24/7 farming help' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-white/20 transition-all">
              <div className="text-4xl mb-2">{feature.icon}</div>
              <strong className="text-emerald-200 text-lg">{feature.title}</strong>
              <div className="text-sm text-gray-300">{feature.desc}</div>
            </div>
          ))}
        </div>

        <footer className="mt-16 text-gray-400 text-sm font-medium">
          © 2026 Krishi Sakhi. Built for the heart of farming.
        </footer>
      </div>
    </main>
  );
}
