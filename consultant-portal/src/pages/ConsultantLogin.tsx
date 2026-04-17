import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

export default function ConsultantLogin() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In State
  const [loginName, setLoginName] = useState('');
  
  // Sign Up State
  const [signupForm, setSignupForm] = useState({
    name: '',
    state: '',
    district: '',
    designation: '',
    specialization: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/consultants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName }),
      });
      const data = await res.json();
      
      if (data.success) {
        saveSessionAndRedirect(data.data);
      } else {
        setError(data.message || 'Login failed. Please check your name.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/consultants/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => saveSessionAndRedirect(data.data), 1000);
      } else {
        setError(data.message || 'Sign up failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveSessionAndRedirect = (consultant: any) => {
    localStorage.setItem('consultant_session', JSON.stringify({
      id: consultant._id || consultant.id,
      name: consultant.name,
      designation: consultant.designation,
      phone: consultant.phone,
      email: consultant.email,
      state: consultant.state,
      specialization: consultant.specialization,
    }));
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ${authMode === 'signup' ? 'lg:flex-row-reverse' : ''} transition-all duration-700`}>
      {/* Background blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Branding Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 relative z-10 transition-transform duration-700">
        <div className="w-28 h-28 mb-8 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-5xl shadow-2xl shadow-emerald-500/30 transform hover:scale-105 transition-transform duration-500">
          👨‍🌾
        </div>
        <h1 className="text-5xl lg:text-6xl font-black mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
          Krishi Sakhi
        </h1>
        <p className="text-xl text-indigo-200/80 font-light mb-4 text-center">
          Agricultural Consultant Portal
        </p>
        <p className="text-sm text-slate-400 mb-12 text-center max-w-md">
          {authMode === 'signin' 
            ? 'Manage your consultations, connect with farmers via video calls, and track your appointments — all in one place.'
            : 'Join our network of elite agricultural experts. Provide guidance to thousands of farmers in your region.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
          {[
            { icon: '📹', text: 'Video Consultations', desc: 'WebRTC video calls' },
            { icon: '📅', text: 'Calendar View', desc: 'Track appointments' },
            { icon: '✅', text: 'Approve Requests', desc: 'From all states' },
            { icon: '📊', text: 'Analytics', desc: 'Track your impact' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 cursor-default" style={{ animation: `slideUp 0.5s ease-out ${0.1 + i * 0.1}s both` }}>
              <span className="text-2xl">{f.icon}</span>
              <div>
                <span className="font-bold text-white text-sm">{f.text}</span>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 w-full">
        <div className="w-full max-w-xl glass rounded-3xl p-8 shadow-2xl shadow-black/30" style={{ animation: 'slideUp 0.6s ease-out' }}>
          {/* Top accent */}
          <div className="h-1.5 -mt-8 -mx-8 mb-8 rounded-t-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"></div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white mb-2">
              {authMode === 'signin' ? 'Consultant Sign In' : 'Consultant Sign Up'}
            </h2>
            <p className="text-slate-400">
              {authMode === 'signin' ? 'Access your dashboard instantly' : 'Register to become a certified consultant'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
                authMode === 'signin'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-medium flex items-center gap-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
              <span className="text-xl">⚠️</span>
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
              <span className="text-xl">✅</span>
              {successMsg}
            </div>
          )}

          {/* Sign In Form */}
          {authMode === 'signin' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fadeIn">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Consultant Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  required
                  className="w-full px-5 py-4 rounded-xl text-base font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 rounded-xl text-base font-bold uppercase tracking-wide text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In as Consultant'}
              </button>

              <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                <p className="text-slate-400 text-sm">
                  💡 Type your exact exact name as shown on the farmer portal to login instantly.
                </p>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4 animate-fadeIn max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Consultant Full Name *</label>
                <input type="text" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} placeholder="e.g. Dr. Anil Sharma" required
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500 hover:border-emerald-500/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">State *</label>
                  <div className="relative">
                    <select value={signupForm.state} onChange={e => setSignupForm({ ...signupForm, state: e.target.value, district: '' })} required
                      className="w-full px-4 py-3 appearance-none rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer">
                      <option value="" disabled>Select State</option>
                      {Object.keys(INDIAN_STATES).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-400">▼</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">District *</label>
                  <div className="relative">
                    <select value={signupForm.district} onChange={e => setSignupForm({ ...signupForm, district: e.target.value })} required disabled={!signupForm.state}
                      className="w-full px-4 py-3 appearance-none rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer disabled:opacity-50">
                      <option value="" disabled>Select District</option>
                      {(INDIAN_STATES[signupForm.state] || []).sort().map((district: string) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-400">▼</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Designation</label>
                  <input type="text" value={signupForm.designation} onChange={e => setSignupForm({ ...signupForm, designation: e.target.value })} placeholder="e.g. Senior Agronomist" required
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500 hover:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Specialization</label>
                  <input type="text" value={signupForm.specialization} onChange={e => setSignupForm({ ...signupForm, specialization: e.target.value })} placeholder="e.g. Soil Health, Crop Disease" required
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500 hover:border-emerald-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input type="tel" value={signupForm.phone} onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })} placeholder="e.g. 9876543210" required
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500 hover:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} placeholder="e.g. expert@agri.in" required
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/80 border border-slate-600/50 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all placeholder-slate-500 hover:border-emerald-500/50" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-4 rounded-xl text-base font-bold uppercase tracking-wide text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Sign Up'}
              </button>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
