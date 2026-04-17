import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

export default function FarmerProfile() {
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    district: 'Ernakulam',
    state: 'Kerala',
    preferred_language: 'English',
    experience_years: ''
  });

  const states = Object.keys(INDIAN_STATES).sort();
  const districts = formData.state ? INDIAN_STATES[formData.state]?.sort() || [] : [];

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/farmers/');
      const data = await response.json();
      setFarmers(data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmerDetails = async (farmerId) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/farmers/${farmerId}/dashboard/`);
      const data = await response.json();
      setSelectedFarmer(data);
    } catch (error) {
      console.error('Error fetching farmer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingFarmer ? 'PUT' : 'POST';
      const url = editingFarmer ? `/api/farmers/${editingFarmer.id}/` : '/api/farmers/';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchFarmers();
        resetForm();
        setShowAddForm(false);
        setEditingFarmer(null);
      }
    } catch (error) {
      console.error('Error saving farmer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name,
      phone: farmer.phone,
      email: farmer.email || '',
      district: farmer.district,
      state: farmer.state,
      preferred_language: farmer.preferred_language,
      experience_years: farmer.experience_years
    });
    setEditingFarmer(farmer);
    setShowAddForm(true);
  };

  const handleDelete = async (farmerId) => {
    if (window.confirm('Are you sure you want to delete this farmer? This will also delete all associated farms and activities.')) {
      try {
        await apiFetch(`/api/farmers/${farmerId}/`, { method: 'DELETE' });
        fetchFarmers();
        if (selectedFarmer && selectedFarmer.farmer.id === farmerId) {
          setSelectedFarmer(null);
        }
      } catch (error) {
        console.error('Error deleting farmer:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      district: 'Ernakulam',
      state: 'Kerala',
      preferred_language: 'English',
      experience_years: ''
    });
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Farmer Profiles</h1>
            <p className="text-gray-500 mt-1">Manage farmer information and view their dashboard</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingFarmer(null);
              setShowAddForm(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <span>+</span> Add New Farmer
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Farmers List */}
          <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-700">Farmers ({farmers.length})</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {loading && farmers.length === 0 ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : farmers.length === 0 ? (
                <div className="text-center p-8 text-gray-500 italic">
                  No farmers registered yet.
                </div>
              ) : (
                farmers.map(farmer => (
                  <div
                    key={farmer.id}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedFarmer?.farmer.id === farmer.id ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
                    onClick={() => fetchFarmerDetails(farmer.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800">{farmer.name}</h4>
                        <p className="text-sm text-gray-500">{farmer.district}</p>
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-emerald-100">{farmer.farms_count} farms</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(farmer); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(farmer.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Farmer Details */}
          <div className="w-full lg:w-2/3">
            {selectedFarmer ? (
              <FarmerDashboard farmer={selectedFarmer} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">👨🌾</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a farmer</h3>
                <p className="text-gray-500 max-w-xs">Click on a farmer from the list to see their detailed information, farms, activities, and reminders.</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Farmer Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-800">{editingFarmer ? 'Edit Farmer' : 'Add New Farmer'}</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value, district: '' })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Select State</option>
                        {states.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">District</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        disabled={!formData.state}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
                      >
                        <option value="">Select District</option>
                        {districts.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Language</label>
                      <select
                        value={formData.preferred_language}
                        onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="English">English</option>
                        <option value="Malayalam">Malayalam</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Experience (Years)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.experience_years}
                        onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingFarmer(null);
                        resetForm();
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-colors"
                    >
                      {loading ? 'Saving...' : (editingFarmer ? 'Update Farmer' : 'Add Farmer')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FarmerDashboard({ farmer }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <h2 className="text-2xl font-bold mb-4">{farmer.farmer.name}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-90">
          <div><span className="block opacity-70 text-xs uppercase">Phone</span>{farmer.farmer.phone}</div>
          <div><span className="block opacity-70 text-xs uppercase">District</span>{farmer.farmer.district}</div>
          <div><span className="block opacity-70 text-xs uppercase">Language</span>{farmer.farmer.preferred_language}</div>
          <div><span className="block opacity-70 text-xs uppercase">Experience</span>{farmer.farmer.experience_years} years</div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{farmer.stats.total_farms}</div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Farms</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{farmer.stats.total_acres}</div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Acres</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{farmer.stats.activities_this_month}</div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Activities This Month</div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <section>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
            <span>Farms</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{farmer.farms.length}</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farmer.farms.map(farm => (
              <div key={farm.id} className="bg-white border border-gray-200 p-4 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all">
                <h4 className="font-bold text-gray-700 mb-2">{farm.name}</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between"><span className="opacity-70">Size:</span> <span>{farm.land_size_acres} acres</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Crops:</span> <span>{farm.primary_crops}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Soil:</span> <span>{farm.soil_type}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="font-bold text-gray-800 mb-4">Recent Activities</h3>
            <div className="space-y-3">
              {farmer.recent_activities.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No recent activities.</p>
              ) : (
                farmer.recent_activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-xs font-bold text-emerald-700 uppercase mb-0.5">{activity.activity_type}</div>
                      <div className="text-sm text-gray-700 mb-1">{activity.text_note}</div>
                      <div className="text-xs text-gray-400">{formatDate(activity.date)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 mb-4">Upcoming Reminders</h3>
            <div className="space-y-3">
              {farmer.upcoming_reminders.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No upcoming reminders.</p>
              ) : (
                farmer.upcoming_reminders.map(reminder => (
                  <div key={reminder.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-amber-800">{reminder.title}</span>
                      <span className="text-xs bg-white/50 px-2 py-0.5 rounded text-amber-700">{formatDate(reminder.due_date)}</span>
                    </div>
                    <div className="text-xs text-amber-600/70 capitalize">{reminder.category}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
