import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TranslatedText from '../components/TranslatedText';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';
import { SUPPORTED_LANGUAGES } from '../utils/translate';
import { clearTranslationCache } from '../utils/sarvamApi';

export default function Profile() {
  const { language: userLanguage } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRealProfileData = async () => {
      setLoading(true);
      try {
        const storedSessionRaw = localStorage.getItem('ammachi_session');
        const session = storedSessionRaw ? JSON.parse(storedSessionRaw) : null;

        if (session?.userId) {
          const [farmerRes, farmsRes, activitiesRes] = await Promise.all([
            apiFetch(`/api/farmers/${session.userId}/`),
            apiFetch(`/api/farms/?farmer=${session.userId}`),
            apiFetch(`/api/activities/?farmer=${session.userId}&limit=10`)
          ]);

          const farmer = await farmerRes.json();
          const farms = await farmsRes.json();
          const activities = await activitiesRes.json();

          const realProfile = {
            id: farmer.id,
            name: farmer.name,
            displayName: farmer.name,
            email: farmer.email || 'Not provided',
            phone: farmer.phone,
            district: farmer.district,
            state: farmer.state || '',
            language: farmer.preferred_language || 'English',
            experience: farmer.experience_years || 0,
            farms: farms.results || [],
            totalFarms: farms.count || 0,
            totalAcres: farms.results?.reduce((sum, f) => sum + parseFloat(f.land_size_acres || 0), 0) || 0,
            recentActivities: activities.results || [],
            activitiesCount: activities.count || 0,
            joinDate: farmer.created_at,
            lastUpdated: farmer.updated_at
          };

          setUser(realProfile);
          setFormData(realProfile);

          if (realProfile.language && realProfile.language !== language) {
            changeLanguage(realProfile.language);
          }
        } else {
          window.location.hash = '#/login';
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        const storedSessionRaw = localStorage.getItem('ammachi_session');
        const session = storedSessionRaw ? JSON.parse(storedSessionRaw) : null;

        if (session) {
          const fallbackProfile = {
            name: session.name || 'Farmer',
            displayName: session.name || 'Farmer',
            phone: session.phone || 'Not provided',
            district: session.district || 'Not provided',
            state: session.state || '',
            email: 'Not provided',
            farms: [],
            experience: 0
          };
          setUser(fallbackProfile);
          setFormData(fallbackProfile);
        } else {
          window.location.hash = '#/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRealProfileData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFarmChange = (idx, field, value) => {
    setFormData(prev => {
      const farms = Array.isArray(prev.farms) ? [...prev.farms] : [];
      farms[idx] = { ...(farms[idx] || {}), [field]: value };
      return { ...prev, farms };
    });
  };

  const addFarm = () => {
    setFormData(prev => ({
      ...prev,
      farms: [...(prev.farms || []), { name: '', acres: '', location: '', crops: [] }]
    }));
  };

  const removeFarm = (idx) => {
    setFormData(prev => {
      const farms = [...(prev.farms || [])];
      farms.splice(idx, 1);
      return { ...prev, farms };
    });
  };

  const handleSave = async () => {
    try {
      const storedSessionRaw = localStorage.getItem('ammachi_session');
      const session = storedSessionRaw ? JSON.parse(storedSessionRaw) : null;

      if (session?.userId) {
        // Persist to backend
        const updateData = {
          name: formData.displayName,
          phone: formData.phone,
          email: formData.email,
          state: formData.state,
          district: formData.district,
          preferred_language: formData.language,
          experience_years: formData.experience,
        };

        const response = await apiFetch(`/api/farmers/${session.userId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          const updatedFarmer = await response.json();

          // Update localStorage
          const updatedSession = {
            ...session,
            name: updatedFarmer.name,
            phone: updatedFarmer.phone,
            state: updatedFarmer.state,
            district: updatedFarmer.district,
          };
          localStorage.setItem('ammachi_session', JSON.stringify(updatedSession));
          localStorage.setItem('ammachi_profile', JSON.stringify(updatedFarmer));

          if (formData.language && formData.language !== language) {
             changeLanguage(formData.language);
          }

          setUser(formData);
          setEditing(false);
          setMessage('Profile updated successfully!');
          setTimeout(() => setMessage(''), 3000);
        } else {
          const err = await response.json();
          setMessage(err.message || 'Failed to update profile');
        }
      } else {
        // Fallback to localStorage only
        localStorage.setItem('ammachi_profile', JSON.stringify(formData));
        setUser(formData);
        setEditing(false);
        setMessage('Profile updated locally!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile. Check your connection.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    localStorage.removeItem('ammachi_profile');
    localStorage.removeItem('ammachi_session');
    window.location.href = '/';
  };

  const { language, changeLanguage } = useLanguage();

  if (loading) {
    return (
      <div className="flex bg-[#f8fafc] min-h-screen items-center justify-center font-sans">
        <Sidebar />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse"><TranslatedText text="Loading your rural profile..." /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#f8fafc] min-h-screen font-sans">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300 relative">
        <div className="max-w-5xl mx-auto space-y-8 relative z-10 pb-20">

          {/* User Summary Card (Hero Profile) */}
          <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 md:gap-12" style={{ animation: 'slideUp 0.4s ease-out' }}>
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-300 opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>

            {/* Profile Avatar */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/10 backdrop-blur-md border-[6px] border-white/20 flex items-center justify-center text-6xl shadow-[0_0_40px_rgba(255,255,255,0.1)] flex-shrink-0 relative group">
              <div className="absolute inset-0 rounded-full border border-white/40 group-hover:scale-105 transition-transform duration-500"></div>
              👨🌾
            </div>

            {/* Profile Details */}
            <div className="flex-1 text-center md:text-left z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight drop-shadow-md">{user?.displayName || 'Farmer Name'}</h2>
              <p className="text-emerald-100/90 text-lg md:text-xl font-medium mb-5 flex items-center justify-center md:justify-start gap-2">
                <TranslatedText text="Verified Farmer" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {user?.district ? user.district : 'India'}
              </p>

              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {user?.language && (
                  <span className="bg-white/15 hover:bg-white/25 border border-white/10 px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5">
                    🌐 {user.language}
                  </span>
                )}
                {user?.state && (
                  <span className="bg-white/15 hover:bg-white/25 border border-white/10 px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5">
                    📍 {user.state}
                  </span>
                )}
                {typeof user?.experience === 'number' && (
                  <span className="bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/20 px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5">
                    â­ {user.experience} yrs exp
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="z-10 mt-4 md:mt-0 flex flex-col gap-3 w-full md:w-auto">
              <button onClick={handleLogout} className="bg-white/10 hover:bg-rose-500/90 hover:border-transparent hover:shadow-lg hover:-translate-y-0.5 text-white px-6 py-3 rounded-2xl backdrop-blur-sm transition-all duration-300 text-sm font-bold border border-white/20 flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Activities & Fast Facts) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Activity Section */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100" style={{ animation: 'slideUp 0.5s ease-out' }}>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <span className="text-2xl">⚡</span> <TranslatedText text="Your Impact" />
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100/50 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🌾</div>
                      <div className="text-sm font-bold text-orange-900/80"><TranslatedText text="Crops" /></div>
                    </div>
                    <div className="text-3xl font-black text-orange-600 drop-shadow-sm">{typeof user?.cropsScanned === 'number' ? user.cropsScanned : '0'}</div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">💬</div>
                      <div className="text-sm font-bold text-blue-900/80"><TranslatedText text="Queries" /></div>
                    </div>
                    <div className="text-3xl font-black text-blue-600 drop-shadow-sm">{typeof user?.questionsAsked === 'number' ? user.questionsAsked : '0'}</div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-100/50 group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🗓</div>
                      <div className="text-sm font-bold text-purple-900/80"><TranslatedText text="Days" /></div>
                    </div>
                    <div className="text-3xl font-black text-purple-600 drop-shadow-sm">{typeof user?.daysActive === 'number' ? user.daysActive : '0'}</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions (Optional placeholder for future) */}
              <div className="bg-emerald-600 rounded-3xl p-8 shadow-lg shadow-emerald-600/20 text-white relative overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <h3 className="font-bold text-xl mb-2">Need Expert Help?</h3>
                <p className="text-emerald-100 text-sm mb-6 leading-relaxed">Connect with Krishi officers or ask the AI assistant for immediate crop advice.</p>
                <button className="w-full bg-white text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors shadow-sm" onClick={() => window.location.hash = '#/chat'}>
                  Go to Chat
                </button>
              </div>
            </div>

            {/* Right Column (Forms & Data) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Personal Information */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100" style={{ animation: 'slideUp 0.5s ease-out' }}>
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                  <h3 className="text-2xl font-extrabold text-gray-800"><TranslatedText text="Personal Information" /></h3>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 bg-gray-50 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 font-bold px-5 py-2.5 rounded-xl transition-all border border-gray-200 hover:border-emerald-200 shadow-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      <TranslatedText text="Edit Profile" />
                    </button>
                  )}
                </div>

                {!editing ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      <InfoItem label="Full Name" icon="user" value={user?.displayName || '—'} />
                      <InfoItem label="Email" icon="mail" value={user?.email || '—'} />
                      <InfoItem label="Phone Number" icon="phone" value={user?.phone || '—'} />
                      <InfoItem label="Language" icon="globe" value={user?.language || '—'} />
                      <InfoItem label="Experience (years)" icon="briefcase" value={typeof user?.experience === 'number' ? `${user.experience}` : '—'} />
                      <InfoItem label="Total Acres" icon="layers" value={user?.totalAcres ? `${user.totalAcres.toFixed(1)} acres` : '—'} />
                      <InfoItem label="State" icon="map" value={user?.state || '—'} />
                      <InfoItem label="District" icon="pin" value={user?.district || '—'} />
                    </div>

                    <div className="pt-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                          🌱 <TranslatedText text="My Farms" />
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                          {(user?.farms || []).length} Farms
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {(user?.farms || []).length === 0 ? (
                          <div className="col-span-full py-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="text-4xl mb-3 opacity-50">🚜</div>
                            <p className="text-gray-500 font-medium"><TranslatedText text="No farms added yet." /></p>
                            <p className="text-sm text-gray-400 mt-1">Edit profile to add your farm details.</p>
                          </div>
                        ) : (
                          user.farms.map((farm, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all group overflow-hidden relative">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                              <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Farm 0{i + 1}</span>
                                  <h4 className="font-extrabold text-gray-800 text-lg">{farm?.name || 'Unnamed Farm'}</h4>
                                </div>
                                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">{farm?.acres ?? '—'} ac</span>
                              </div>
                              <div className="space-y-3 relative z-10">
                                <div className="flex items-start gap-3">
                                  <span className="text-gray-400 mt-0.5">📍</span>
                                  <p className="text-sm text-gray-600 font-medium leading-tight">{farm?.location || 'Location not specified'}</p>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="text-gray-400 mt-0.5">🌾</span>
                                  <p className="text-sm font-bold text-gray-700 capitalize">
                                    {Array.isArray(farm?.crops) && farm.crops.length > 0 ? farm.crops.join(', ') : (farm?.crops || 'No crops listed')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8 animate-fade-in" style={{ animationDuration: '0.3s' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="Full Name" /></label>
                        <input type="text" name="displayName" value={formData.displayName || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="Email" /></label>
                        <input type="email" name="email" value={formData.email || ''} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed font-medium opacity-70" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="Phone Number" /></label>
                        <input type="tel" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="Language" /></label>
                        <select name="language" value={formData.language || ''} onChange={(e) => { handleInputChange(e); changeLanguage(e.target.value); clearTranslationCache(); }} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium appearance-none">
                          <option value=""><TranslatedText text="Select" /></option>
                          {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="Experience (years)" /></label>
                        <input type="number" name="experience" value={formData.experience ?? ''} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="State" /></label>
                        <select name="state" value={formData.state || ''} onChange={(e) => { handleInputChange(e); setFormData(prev => ({ ...prev, district: '' })); }} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium appearance-none">
                          <option value="">Select State</option>
                          {Object.keys(INDIAN_STATES).sort().map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700"><TranslatedText text="District" /></label>
                        <select name="district" value={formData.district || ''} onChange={handleInputChange} disabled={!formData.state} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-gray-50 focus:bg-white transition-all font-medium appearance-none disabled:opacity-50 disabled:bg-gray-100">
                          <option value="">Select District</option>
                          {(formData.state ? INDIAN_STATES[formData.state]?.sort() || [] : []).map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-extrabold text-gray-800"><TranslatedText text="Farm Details" /></h3>
                        <button type="button" onClick={addFarm} className="text-sm bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-bold hover:bg-emerald-200 transition-colors shadow-sm">+ <TranslatedText text="Add Farm" /></button>
                      </div>

                      <div className="space-y-4">
                        {(formData.farms || []).map((farm, i) => (
                          <div key={i} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 relative group transition-all hover:border-emerald-300">
                            <button type="button" onClick={() => removeFarm(i)} className="absolute top-4 right-4 text-gray-400 hover:text-rose-500 hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors" title="Remove Farm">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <h4 className="font-extrabold text-gray-800 mb-4 tracking-wide"><TranslatedText text="Farm" /> 0{i + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input type="text" placeholder="Farm Name" value={farm?.name || ''} onChange={(e) => handleFarmChange(i, 'name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                              <input type="number" placeholder="Acres" value={farm?.acres ?? ''} onChange={(e) => handleFarmChange(i, 'acres', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                              <input type="text" placeholder="Location" value={farm?.location || ''} onChange={(e) => handleFarmChange(i, 'location', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                              <input type="text" placeholder="Crops (comma separated)" value={Array.isArray(farm?.crops) ? farm.crops.join(', ') : (farm?.crops || '')} onChange={(e) => handleFarmChange(i, 'crops', e.target.value.split(',').map(c => c.trim()).filter(c => c))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-gray-100">
                      <button type="button" onClick={() => setEditing(false)} className="px-8 py-3.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors">
                        <TranslatedText text="Cancel" />
                      </button>
                      <button type="submit" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5">
                        <TranslatedText text="Save Changes" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div className="fixed bottom-8 right-8 bg-gray-900 border border-gray-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="font-medium pr-4">{message}</span>
            </div>
          )}

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

function InfoItem({ label, value, icon }) {
  const Icon = () => {
    const iconClass = "w-6 h-6 text-emerald-600";
    switch (icon) {
      case 'user': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M20 21V19C20 17.9 19.58 16.92 18.83 16.17C18.08 15.42 17.06 15 16 15H8C6.94 15 5.92 15.42 5.17 16.17C4.42 16.92 4 17.9 4 19V21" /><path d="M16 7C16 9.21 14.21 11 12 11C9.79 11 8 9.21 8 7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7Z" /></svg>;
      case 'mail': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M4 4H20V20H4V4Z" /><path d="M4 6L12 13L20 6" /></svg>;
      case 'phone': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M22 16.92V19.92C22 20.98 21.12 21.86 20.06 21.86C10.72 21.3 2.7 13.28 2.14 3.94C2.14 2.88 3.02 2 4.08 2H7.08C7.53 2 7.94 2.24 8.15 2.63L9.9 5.94C10.08 6.28 10.05 6.68 9.82 6.98L8.37 8.87C9.77 11.61 12.11 13.95 14.85 15.35L16.74 13.9C17.04 13.67 17.44 13.64 17.78 13.82L21.09 15.57C21.48 15.78 21.72 16.19 21.72 16.64L22 16.92Z" /></svg>;
      case 'globe': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><circle cx="12" cy="12" r="9" /><path d="M3 12H21M12 3C14.5 6.5 14.5 17.5 12 21M12 3C9.5 6.5 9.5 17.5 12 21" /></svg>;
      case 'briefcase': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M3 7H21V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V7Z" /><path d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7" /></svg>;
      case 'layers': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M12 2L2 7L12 12L22 7L12 2Z" /><path d="M2 12L12 17L22 12" /><path d="M2 17L12 22L22 17" /></svg>;
      case 'map': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M9 3L15 5L21 3V17L15 19L9 17L3 19V5L9 3Z" /></svg>;
      case 'pin': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}><path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.6 3.95 5.32 5.64 3.64C7.32 1.95 9.61 1 12 1C14.39 1 16.68 1.95 18.36 3.64C20.05 5.32 21 7.6 21 10Z" /><circle cx="12" cy="10" r="3" /></svg>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col relative group">
      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</span>
      <div className="flex items-center gap-4 bg-gray-50/80 px-4 py-3.5 rounded-2xl border border-gray-100/80 hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all">
        <div className="p-2.5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-110 group-hover:text-emerald-500 transition-transform">
          <Icon />
        </div>
        <span className="text-gray-900 font-bold text-base truncate">{value}</span>
      </div>
    </div>
  );
}
