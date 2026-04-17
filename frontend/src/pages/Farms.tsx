import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

const FARM_GRADIENTS = [
  'from-emerald-400 via-green-500 to-teal-600',
  'from-amber-400 via-orange-500 to-red-500',
  'from-blue-400 via-indigo-500 to-purple-600',
  'from-pink-400 via-rose-500 to-red-500',
  'from-cyan-400 via-teal-500 to-emerald-600',
  'from-violet-400 via-purple-500 to-indigo-600',
];

const FARM_EMOJIS = ['\ud83c\udf3e', '\ud83c\udf3b', '\ud83c\udf3f', '\ud83c\udf43', '\ud83c\udf31', '\u2618\ufe0f'];

export default function Farms() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    land_size_acres: '',
    soil_type: 'loamy',
    irrigation_type: 'rain_fed',
    nitrogen_value: '',
    phosphorus_value: '',
    potassium_value: '',
    soil_ph: ''
  });

  const SOIL_TYPES = [
    { value: 'clay', label: 'Clay', icon: '\ud83e\uddf1' },
    { value: 'sandy', label: 'Sandy', icon: '\ud83c\udfdc\ufe0f' },
    { value: 'loamy', label: 'Loamy', icon: '\ud83c\udf3f' },
    { value: 'black', label: 'Black Soil', icon: '\u2b1b' },
    { value: 'red', label: 'Red Soil', icon: '\ud83d\udd34' },
    { value: 'alluvial', label: 'Alluvial', icon: '\ud83c\udfde\ufe0f' },
    { value: 'laterite', label: 'Laterite', icon: '\ud83d\udfe4' }
  ];

  const IRRIGATION_TYPES = [
    { value: 'rain_fed', label: 'Rain Fed', icon: '\ud83c\udf27' },
    { value: 'drip', label: 'Drip Irrigation', icon: '\ud83d\udca7' },
    { value: 'sprinkler', label: 'Sprinkler', icon: '\ud83d\udebf' },
    { value: 'flood', label: 'Flood Irrigation', icon: '\ud83c\udf0a' },
    { value: 'canal', label: 'Canal', icon: '\ud83c\udf0a' },
    { value: 'bore_well', label: 'Bore Well', icon: '\ud83d\udd73' },
    { value: 'open_well', label: 'Open Well', icon: '\u26f2' }
  ];

  useEffect(() => {
    const sessionRaw = localStorage.getItem('ammachi_session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (session?.userId) {
      setCurrentUser(session);
      fetchFarms(session.userId);
    } else {
      window.location.hash = '#/login';
    }
  }, []);

  const fetchFarms = async (farmerId) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/farms/?farmer_id=${farmerId}`);
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingFarm ? 'PUT' : 'POST';
      const url = editingFarm ? `/api/farms/${editingFarm.id}/` : '/api/farms/';
      const payload = { ...formData, farmer: currentUser.userId };
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchFarms(currentUser.userId);
        resetForm();
        setShowAddForm(false);
        setEditingFarm(null);
        setSuccess(editingFarm ? 'Farm updated!' : 'Farm added!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error saving farm:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (farm) => {
    setFormData({
      name: farm.name,
      land_size_acres: farm.land_size_acres,
      soil_type: farm.soil_type,
      irrigation_type: farm.irrigation_type,
      nitrogen_value: farm.nitrogen_value || '',
      phosphorus_value: farm.phosphorus_value || '',
      potassium_value: farm.potassium_value || '',
      soil_ph: farm.soil_ph || ''
    });
    setEditingFarm(farm);
    setShowAddForm(true);
  };

  const handleDelete = async (farmId) => {
    if (window.confirm('Are you sure you want to delete this farm?')) {
      try {
        await apiFetch(`/api/farms/${farmId}/`, { method: 'DELETE' });
        fetchFarms(currentUser.userId);
      } catch (error) {
        console.error('Error deleting farm:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      land_size_acres: '',
      soil_type: 'loamy',
      irrigation_type: 'rain_fed',
      nitrogen_value: '',
      phosphorus_value: '',
      potassium_value: '',
      soil_ph: ''
    });
  };

  const totalAcres = farms.reduce((sum, f) => sum + parseFloat(f.land_size_acres || 0), 0);

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-3xl p-8 mb-8 overflow-hidden shadow-xl shadow-emerald-500/20">
          {/* Animated background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-10 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" style={{ animation: 'pulse 3s ease-in-out infinite' }}></div>
          <div className="absolute top-4 right-20 text-6xl opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>{'\ud83c\udf3e'}</div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                {'\ud83c\udfe0'} Farm Management
              </h1>
              <p className="text-green-100 text-lg">
                Manage your farms and their details
                {currentUser && (
                  <span className="ml-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                    {'\ud83d\udccd'} {currentUser.district}, {currentUser.state}
                  </span>
                )}
              </p>
            </div>
            <button
              className="px-7 py-3 bg-white text-emerald-700 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center gap-2 text-lg"
              onClick={() => { resetForm(); setEditingFarm(null); setShowAddForm(true); }}
            >
              <span className="text-2xl">+</span> Add New Farm
            </button>
          </div>

          {/* Stats bar */}
          {farms.length > 0 && (
            <div className="relative z-10 grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-3xl font-extrabold text-white">{farms.length}</div>
                <div className="text-green-100 text-sm font-medium">Total Farms</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-3xl font-extrabold text-white">{totalAcres.toFixed(1)}</div>
                <div className="text-green-100 text-sm font-medium">Total Acres</div>
              </div>
            </div>
          )}
        </div>

        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-2xl border border-emerald-200 font-medium flex items-center gap-2 shadow-sm animate-bounce" style={{ animationDuration: '0.5s', animationIterationCount: 1 }}>
            <span className="text-xl">{'\u2705'}</span> {success}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {editingFarm ? '\u270f\ufe0f Edit Farm' : '\ud83c\udf31 Add New Farm'}
                </h3>
                <button onClick={() => setShowAddForm(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors text-lg">{'\u00d7'}</button>
              </div>

              <div className="p-6">
                {currentUser && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl text-white shadow-lg shadow-emerald-500/30">{'\ud83d\udc68\u200d\ud83c\udf3e'}</div>
                    <div>
                      <p className="font-bold text-emerald-800">{currentUser.name}</p>
                      <p className="text-sm text-emerald-600">{'\ud83d\udccd'} {currentUser.district}, {currentUser.state}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{'\ud83c\udff7\ufe0f'} Farm Name</label>
                      <input type="text" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Green Valley Farm" required
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{'\ud83d\udcd0'} Land Size (Acres)</label>
                      <input type="number" step="0.1" value={formData.land_size_acres}
                        onChange={(e) => setFormData({ ...formData, land_size_acres: e.target.value })}
                        placeholder="e.g., 2.5" required
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{'\ud83e\uddf1'} Soil Type</label>
                      <select value={formData.soil_type}
                        onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all">
                        {SOIL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{'\ud83d\udca7'} Irrigation Type</label>
                      <select value={formData.irrigation_type}
                        onChange={(e) => setFormData({ ...formData, irrigation_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all">
                        {IRRIGATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                        <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <span className="text-xl">{'\ud83e\uddea'}</span> Soil Nutrients & pH Levels
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 group-focus-within:text-emerald-600 transition-colors">Nitrogen (N) <span className="text-gray-400 font-normal">0-140</span></label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="140"
                              value={formData.nitrogen_value}
                              onChange={(e) => setFormData({ ...formData, nitrogen_value: e.target.value })}
                              placeholder="e.g., 40"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 group-focus-within:text-emerald-600 transition-colors">Phosphorus (P) <span className="text-gray-400 font-normal">0-145</span></label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="145"
                              value={formData.phosphorus_value}
                              onChange={(e) => setFormData({ ...formData, phosphorus_value: e.target.value })}
                              placeholder="e.g., 60"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 group-focus-within:text-emerald-600 transition-colors">Potassium (K) <span className="text-gray-400 font-normal">0-205</span></label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="205"
                              value={formData.potassium_value}
                              onChange={(e) => setFormData({ ...formData, potassium_value: e.target.value })}
                              placeholder="e.g., 50"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 group-focus-within:text-emerald-600 transition-colors">Soil pH <span className="text-gray-400 font-normal">0-14</span></label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="14"
                              value={formData.soil_ph}
                              onChange={(e) => setFormData({ ...formData, soil_ph: e.target.value })}
                              placeholder="e.g., 6.5"
                              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => { setShowAddForm(false); setEditingFarm(null); resetForm(); }}
                      className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70">
                      {loading ? '\u23f3 Saving...' : (editingFarm ? '\ud83d\udcbe Update Farm' : '\ud83c\udf31 Add Farm')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Farm Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && farms.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-16">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading your farms...</p>
            </div>
          ) : farms.length === 0 ? (
            <div className="col-span-full text-center p-16 bg-white rounded-3xl border-2 border-dashed border-emerald-200">
              <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>{'\ud83d\ude9c'}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No farms added yet</h3>
              <p className="text-gray-500 mb-6">Start by adding your first farm to track everything!</p>
              <button onClick={() => { resetForm(); setEditingFarm(null); setShowAddForm(true); }}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all hover:-translate-y-1">
                + Add Your First Farm
              </button>
            </div>
          ) : (
            farms.map((farm, index) => {
              const gradient = FARM_GRADIENTS[index % FARM_GRADIENTS.length];
              const emoji = FARM_EMOJIS[index % FARM_EMOJIS.length];

              return (
                <div key={farm.id} className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
                  style={{ animation: `slideUp 0.5s ease-out ${index * 0.1}s both` }}>
                  {/* Gradient Top Banner */}
                  <div className={`bg-gradient-to-r ${gradient} p-5 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 text-6xl opacity-20 -translate-y-2 translate-x-2 group-hover:scale-125 transition-transform duration-500">{emoji}</div>
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-extrabold text-white mb-1 drop-shadow-sm">{farm.name}</h3>
                        <p className="text-white/80 text-sm flex items-center gap-1">{'\ud83d\udccd'} {farm.district}, {farm.state}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(farm)}
                          className="w-9 h-9 bg-white/20 hover:bg-white/40 rounded-xl flex items-center justify-center text-white transition-all backdrop-blur-sm" title="Edit">
                          {'\u270f\ufe0f'}
                        </button>
                        <button onClick={() => handleDelete(farm.id)}
                          className="w-9 h-9 bg-white/20 hover:bg-red-500/80 rounded-xl flex items-center justify-center text-white transition-all backdrop-blur-sm" title="Delete">
                          {'\ud83d\uddd1\ufe0f'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Size badge */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                      <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">{'\ud83d\udcd0'} Land Size</span>
                      <span className="text-lg font-extrabold text-emerald-800">{farm.land_size_acres} <span className="text-sm font-medium">acres</span></span>
                    </div>

                    {/* Soil & Irrigation */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 group-hover:bg-amber-100/50 transition-colors">
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Soil Type</div>
                        <div className="text-sm font-bold text-amber-900 flex items-center gap-1">
                          {SOIL_TYPES.find(s => s.value === farm.soil_type)?.icon} {SOIL_TYPES.find(s => s.value === farm.soil_type)?.label || farm.soil_type}
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 group-hover:bg-blue-100/50 transition-colors">
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Irrigation</div>
                        <div className="text-sm font-bold text-blue-900 flex items-center gap-1">
                          {IRRIGATION_TYPES.find(i => i.value === farm.irrigation_type)?.icon} {IRRIGATION_TYPES.find(i => i.value === farm.irrigation_type)?.label || farm.irrigation_type}
                        </div>
                      </div>
                    </div>


                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
