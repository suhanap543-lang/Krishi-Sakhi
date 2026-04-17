import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

const logoUrl = 'https://cdn.builder.io/api/v1/image/assets%2Fc21b63e7074b4525a6e3164505c4a230%2Fac56160c2de4493283652bdd34caa4b0?format=webp&width=300';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    state: 'Kerala',
    district: '',
    experience_years: 0,
    preferred_language: 'English'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const states = Object.keys(INDIAN_STATES).sort();
  const districts = formData.state ? INDIAN_STATES[formData.state].sort() : [];

  React.useEffect(() => {
    if (formData.state && !formData.district) {
      // setFormData(prev => ({ ...prev, district: INDIAN_STATES[prev.state][0] }));
    }
  }, [formData.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create new farmer — backend will reject duplicate phone with 409
      const response = await apiFetch('/api/farmers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const farmer = await response.json();
        console.log('Farmer created:', farmer);

        setSuccess('Account created successfully! Redirecting to dashboard...');

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

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.hash = '#/dashboard';
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
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
        <div className="w-24 h-24 mb-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-5xl shadow-2xl border-2 border-white/20">
          🌾
        </div>
        <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-200 drop-shadow-lg">
          Join Krishi Sakhi
        </h1>
        <p className="text-lg lg:text-xl font-light mb-8 text-center text-emerald-50 opacity-90 max-w-md">
          Empowering Kerala Farmers with AI Technology
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md hidden md:grid">
          {[
            { icon: '🚜', text: 'Smart Farm Management' },
            { icon: '📱', text: 'Activity Tracking' },
            { icon: '⚡', text: 'Instant Alerts' },
            { icon: '🎯', text: 'Personalized Advice' }
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all">
              <span className="text-2xl">{feature.icon}</span>
              <span className="font-semibold text-sm">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-[1.5] flex items-center justify-center p-6 lg:p-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.15)] border border-white/50 relative">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300"></div>

          <div className="text-center mb-8 mt-2">
            <h1 className="text-2xl font-extrabold text-gray-800 mb-1 bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-600">
              Create Account
            </h1>
            <p className="text-gray-500">Start your smart farming journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, district: '' })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="">Select State</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">District</label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  disabled={!formData.state}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                  placeholder="Years"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Language</label>
                <select
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                >
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium flex items-center animate-shake">
                <span className="mr-2 text-xl">⚠</span> {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-emerald-600 font-medium flex items-center animate-pulse">
                <span className="mr-2 text-xl">✅</span> {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 rounded-xl text-lg font-bold uppercase tracking-wide text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 font-medium">
              Already have an account?{' '}
              <a href="#/login" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-colors">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
