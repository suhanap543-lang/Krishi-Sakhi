import React, { useState } from 'react';
import { apiFetch } from '../utils/api';

const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function Login() {
  const [formData, setFormData] = useState({
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with phone:', formData.phone);

      const response = await apiFetch('/api/farmers/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone.trim() }),
      });

      if (response.ok) {
        const farmer = await response.json();
        console.log('Login successful:', farmer.name);

        // Store session
        const sessionData = {
          userId: farmer.id,
          name: farmer.name,
          phone: farmer.phone,
          state: farmer.state,
          district: farmer.district,
        };

        localStorage.setItem('ammachi_session', JSON.stringify(sessionData));
        localStorage.setItem('ammachi_profile', JSON.stringify(farmer));
        localStorage.setItem('ammachi_language', farmer.preferred_language || 'English');

        // Redirect to dashboard
        window.location.hash = '#/dashboard';
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Phone number not registered. Please sign up first.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-600 to-emerald-400">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Left Side - Branding */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 text-white relative z-10">
        <div className="w-32 h-32 mb-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-6xl shadow-2xl border-2 border-white/20 animate-bounce-slow">
          🌾
        </div>
        <h1 className="text-5xl lg:text-6xl font-extrabold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-200 drop-shadow-lg">
          Krishi Sakhi
        </h1>
        <p className="text-xl lg:text-2xl font-light mb-12 text-center text-emerald-50 opacity-90">
          Your Intelligent Farming Companion
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg hidden md:grid">
          {[
            { icon: '🔬', text: 'AI Disease Detection' },
            { icon: '🌦', text: 'Smart Weather Alerts' },
            { icon: '📈', text: 'Live Market Prices' },
            { icon: '🗣', text: 'Voice Chat' }
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-1 duration-300">
              <span className="text-3xl">{feature.icon}</span>
              <span className="font-semibold">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.15)] border border-white/50 relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300"></div>

          <div className="text-center mb-10 mt-2">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-600">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-lg">Sign in to continue your farming journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter your registered phone number"
                required
                className="w-full px-5 py-4 rounded-xl text-lg font-medium bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 placeholder-gray-400"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium flex items-center animate-shake">
                <span className="mr-2 text-xl">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 rounded-xl text-lg font-bold uppercase tracking-wide text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing In...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-500 font-medium">
              New to Ammachi AI?{' '}
              <a href="#/signup" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-colors">
                Create your account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

