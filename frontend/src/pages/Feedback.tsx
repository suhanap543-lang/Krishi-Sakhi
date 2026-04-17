import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Feedback() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General',
    rating: 5,
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const categories = [
    { id: 'General', label: 'General Feedback', icon: '📝', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
    { id: 'Bug', label: 'Report a Bug', icon: '🐞', color: 'from-rose-500 to-red-500', bg: 'bg-rose-50' },
    { id: 'Feature', label: 'Feature Request', icon: '✨', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
    { id: 'Other', label: 'Other', icon: '💬', color: 'from-purple-500 to-fuchsia-500', bg: 'bg-purple-50' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex bg-gray-50 min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full text-center shadow-2xl border border-white/50 relative z-10" style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-white/50 overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%222%22%20cy%3D%222%22%20r%3D%221%22%20fill%3D%22white%22%20opacity%3D%220.2%22%2F%3E%3C%2Fsvg%3E')]"></div>
              <span className="text-5xl drop-shadow-md relative z-10 animate-bounce" style={{ animationDuration: '2s' }}>🎉</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-3 tracking-tight"><TranslatedText text="Thank You!" /></h2>
            <p className="text-gray-500 mb-8 font-medium leading-relaxed">
              <TranslatedText text="Your feedback has been submitted successfully. We appreciate your input to make Krishi Sakhi better!" />
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ ...formData, message: '', rating: 5, category: 'General' });
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-1 active:scale-95"
            >
              <TranslatedText text="Submit Another Response" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-[#f8fafc] min-h-screen font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Sidebar />
      <main className="flex-1 md:ml-64 relative">
        {/* Dynamic Header */}
        <header className="bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 px-6 pt-12 pb-24 relative overflow-hidden shadow-lg border-b border-emerald-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h40v40H0V0zm20%2020h20v20H20V20zM0%2020h20v20H0V20z%22%20fill%3D%22white%22%20fill-opacity%3D%220.03%22%2F%3E%3C%2Fsvg%3E')]"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>

          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-6 shadow-xl transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <span className="text-3xl drop-shadow-md">💌</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-sm">
              <TranslatedText text="We Value Your Feedback" />
            </h1>
            <p className="text-emerald-50 text-lg md:text-xl font-medium max-w-2xl mx-auto opacity-90">
              <TranslatedText text="Help us improve Krishi Sakhi by sharing your thoughts, ideas, and experiences." />
            </p>
          </div>
        </header>

        {/* Form Container */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-16 relative z-20 pb-20">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 overflow-hidden">

            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50/50 border-b border-gray-100 backdrop-blur-sm">
              <div className="p-6 md:p-8 text-center group hover:bg-white transition-colors cursor-default">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-white">📞</div>
                <h3 className="font-bold text-gray-800 mb-1"><TranslatedText text="Call Us" /></h3>
                <p className="text-gray-500 text-sm font-medium tracking-wide">+91 1800 120 4567</p>
              </div>
              <div className="p-6 md:p-8 text-center group hover:bg-white transition-colors cursor-default">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-white">📧</div>
                <h3 className="font-bold text-gray-800 mb-1"><TranslatedText text="Email Us" /></h3>
                <p className="text-gray-500 text-sm font-medium">support@krishisakhi.com</p>
              </div>
              <div className="p-6 md:p-8 text-center group hover:bg-white transition-colors cursor-default">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-white">🏛️</div>
                <h3 className="font-bold text-gray-800 mb-1"><TranslatedText text="Visit Us" /></h3>
                <p className="text-gray-500 text-sm font-medium">New Delhi, India</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">

              {/* Category Selection */}
              <div>
                <label className="block text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">1</span>
                  <TranslatedText text="What is this about?" />
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 ${formData.category === cat.id
                          ? 'border-transparent shadow-[0_0_0_2px_rgba(16,185,129,1)] scale-[1.02] bg-white'
                          : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-md'
                        } overflow-hidden group`}
                    >
                      {/* Active Background Gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 ${formData.category === cat.id ? 'opacity-5' : 'group-hover:opacity-[0.02]'} transition-opacity`}></div>

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-sm ${formData.category === cat.id ? 'bg-gradient-to-br text-white ' + cat.color : cat.bg + ' grayscale-[50%] group-hover:grayscale-0'}`}>
                        {cat.icon}
                      </div>
                      <div className={`text-sm font-bold ${formData.category === cat.id ? 'text-gray-900' : 'text-gray-600'}`}>
                        <TranslatedText text={cat.label} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Star Rating */}
              <div className="bg-gray-50/50 rounded-3xl p-6 md:p-8 border border-gray-100/80">
                <label className="block text-base font-bold text-gray-800 mb-6 flex items-center gap-2 justify-center md:justify-start">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">2</span>
                  <TranslatedText text="Rate your experience" />
                </label>
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="flex gap-2" onMouseLeave={() => setHoveredStar(0)}>
                    {[1, 2, 3, 4, 5].map(star => {
                      const isActive = star <= (hoveredStar || formData.rating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          onMouseEnter={() => setHoveredStar(star)}
                          className="focus:outline-none relative transition-transform duration-200 hover:scale-125"
                        >
                          {/* Glow effect behind stars */}
                          {isActive && <div className="absolute inset-0 bg-amber-400 blur-md opacity-30 rounded-full scale-150"></div>}
                          <svg
                            className={`w-12 h-12 md:w-14 md:h-14 relative z-10 transition-all duration-300 ${isActive ? 'text-amber-400 drop-shadow-md' : 'text-gray-200'} ${star === hoveredStar && star === formData.rating ? 'animate-pulse' : ''}`}
                            fill={isActive ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rating Label Box */}
                  <div className="h-10 px-6 rounded-full flex items-center justify-center font-bold text-sm bg-white shadow-sm border border-gray-100 min-w[120px] transition-all duration-300">
                    <span className={`
                      ${(hoveredStar || formData.rating) === 1 ? 'text-rose-500' : ''}
                      ${(hoveredStar || formData.rating) === 2 ? 'text-orange-500' : ''}
                      ${(hoveredStar || formData.rating) === 3 ? 'text-amber-500' : ''}
                      ${(hoveredStar || formData.rating) === 4 ? 'text-teal-500' : ''}
                      ${(hoveredStar || formData.rating) === 5 ? 'text-emerald-500' : ''}
                    `}>
                      {(hoveredStar || formData.rating) === 1 && "Needs Work 😕"}
                      {(hoveredStar || formData.rating) === 2 && "Could be better 😥"}
                      {(hoveredStar || formData.rating) === 3 && "Good 🙂"}
                      {(hoveredStar || formData.rating) === 4 && "Great! 😄"}
                      {(hoveredStar || formData.rating) === 5 && "Excellent! 🌟"}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Inputs */}
              <div className="space-y-6">
                <label className="block text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">3</span>
                  <TranslatedText text="Tell us more" />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-gray-50/50 focus:bg-white text-gray-800 font-medium placeholder-gray-400"
                      placeholder="Your Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <input
                      type="email"
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-gray-50/50 focus:bg-white text-gray-800 font-medium placeholder-gray-400"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="relative group pt-2">
                  <textarea
                    required
                    rows={5}
                    className="w-full p-5 rounded-2xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-gray-50/50 focus:bg-white text-gray-800 font-medium placeholder-gray-400 resize-none shadow-inner"
                    placeholder="Please share the details of your feedback, report, or idea..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  ></textarea>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative overflow-hidden group bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-[length:200%_auto] hover:bg-right text-white font-extrabold text-lg py-5 rounded-2xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.7)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span><TranslatedText text="Send Feedback" /></span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
