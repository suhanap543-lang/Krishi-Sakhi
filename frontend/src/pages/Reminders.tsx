import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    farm: '', title: '', description: '', due_date: '',
    category: 'operation', priority: 'medium'
  });

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [filter, setFilter] = useState({
    category: '', is_completed: '', priority: ''
  });

  const REMINDER_CATEGORIES = [
    { value: 'operation', label: 'Farm Operation', icon: '🚜', gradient: 'from-emerald-400 to-teal-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { value: 'scheme', label: 'Government Scheme', icon: '🏛️', gradient: 'from-blue-400 to-indigo-500', light: 'bg-blue-50 border-blue-200 text-blue-700' },
    { value: 'price', label: 'Price Alert', icon: '💰', gradient: 'from-amber-400 to-orange-500', light: 'bg-amber-50 border-amber-200 text-amber-700' },
    { value: 'weather', label: 'Weather Alert', icon: '🌦', gradient: 'from-cyan-400 to-blue-500', light: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
    { value: 'pest', label: 'Pest/Disease Alert', icon: '🐛', gradient: 'from-red-400 to-rose-500', light: 'bg-red-50 border-red-200 text-red-700' },
    { value: 'general', label: 'General', icon: '📝', gradient: 'from-gray-400 to-slate-500', light: 'bg-gray-100 border-gray-200 text-gray-700' }
  ];

  const PRIORITY_CONFIG = {
    high: { label: 'High', icon: '🔴', gradient: 'from-red-500 to-rose-600', light: 'bg-red-50 border-red-200 text-red-700', ring: 'ring-red-200' },
    medium: { label: 'Medium', icon: '🟡', gradient: 'from-amber-400 to-yellow-500', light: 'bg-amber-50 border-amber-200 text-amber-700', ring: 'ring-amber-200' },
    low: { label: 'Low', icon: '🟢', gradient: 'from-green-400 to-emerald-500', light: 'bg-green-50 border-green-200 text-green-700', ring: 'ring-green-200' }
  };

  useEffect(() => {
    const sessionRaw = localStorage.getItem('ammachi_session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (session?.userId) {
      setCurrentUser(session);
    } else {
      window.location.hash = '#/login';
    }
  }, []);

  useEffect(() => {
    if (currentUser?.userId) {
      fetchReminders(currentUser.userId);
      fetchFarmsForUser(currentUser.userId);
    }
  }, [currentUser, filter]);

  const fetchFarmsForUser = async (farmerId) => {
    try {
      const response = await apiFetch(`/api/farms/?farmer_id=${farmerId}`);
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({
        ...prev,
        description: prev.description ? `${prev.description} ${transcript}` : transcript
      }));
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const fetchReminders = async (farmerId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('farmer_id', farmerId);
      Object.entries(filter).forEach(([key, value]) => { if (value) params.append(key, value); });
      const response = await apiFetch(`/api/reminders/?${params}`);
      const data = await response.json();
      setReminders(data);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, farmer: currentUser.userId, due_date: new Date(formData.due_date).toISOString() };
      const response = await apiFetch('/api/reminders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchReminders(currentUser.userId);
        setFormData({ farm: '', title: '', description: '', due_date: '', category: 'operation', priority: 'medium' });
        setShowAddForm(false);
        setSuccess('Reminder added!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errData = await response.json();
        console.error('Error adding reminder:', errData.message);
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (reminderId) => {
    try {
      await apiFetch(`/api/reminders/${reminderId}/mark_completed/`, { method: 'POST' });
      fetchReminders(currentUser.userId);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteReminder = async (reminderId) => {
    if (window.confirm('Delete this reminder?')) {
      try {
        await apiFetch(`/api/reminders/${reminderId}/`, { method: 'DELETE' });
        fetchReminders(currentUser.userId);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const getCategoryInfo = (category) => REMINDER_CATEGORIES.find(c => c.value === category) || REMINDER_CATEGORIES[5];

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const getDaysUntilDue = (dueDate) => {
    const diffTime = new Date(dueDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const overdueReminders = reminders.filter(r => !r.is_completed && isOverdue(r.due_date));
  const upcomingReminders = reminders.filter(r => !r.is_completed && !isOverdue(r.due_date));
  const completedReminders = reminders.filter(r => r.is_completed);

  const pendingCount = overdueReminders.length + upcomingReminders.length;
  const highCount = reminders.filter(r => r.priority === 'high' && !r.is_completed).length;

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-8 mb-8 overflow-hidden shadow-xl shadow-orange-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" style={{ animation: 'pulse 4s ease-in-out infinite' }}></div>
          <div className="absolute top-6 right-16 text-6xl opacity-15 animate-bounce" style={{ animationDuration: '3s' }}>🔔</div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                🔔 Reminders & Alerts
              </h1>
              <p className="text-orange-100 text-lg">
                Stay on top of your farming schedule
                {currentUser && (
                  <span className="ml-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                    👨🌾 {currentUser.name}
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setShowAddForm(true)}
              className="px-7 py-3 bg-white text-orange-700 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center gap-2 text-lg">
              <span className="text-2xl">+</span> Add Reminder
            </button>
          </div>

          {/* Stats */}
          <div className="relative z-10 grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-3xl font-extrabold text-white">{reminders.length}</div>
              <div className="text-orange-100 text-sm font-medium">Total</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-3xl font-extrabold text-white">{pendingCount}</div>
              <div className="text-orange-100 text-sm font-medium">Pending</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-3xl font-extrabold text-white">{highCount}</div>
              <div className="text-orange-100 text-sm font-medium">🔴 High</div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
              <div className="text-3xl font-extrabold text-white">{overdueReminders.length}</div>
              <div className="text-orange-100 text-sm font-medium">⚠ Overdue</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 font-medium">
              <option value="">📂 All Categories</option>
              {REMINDER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 font-medium">
              <option value="">⚡ All Priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select value={filter.is_completed} onChange={(e) => setFilter({ ...filter, is_completed: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 font-medium">
              <option value="">📋 All Status</option>
              <option value="false">â³ Pending</option>
              <option value="true">✅ Completed</option>
            </select>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-2xl border border-emerald-200 font-medium flex items-center gap-2 shadow-sm" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <span className="text-xl">✅</span> {success}
          </div>
        )}

        {/* Add Reminder Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-t-3xl flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">🔔 Add New Reminder</h3>
                <button onClick={() => setShowAddForm(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors text-lg">×</button>
              </div>

              <div className="p-6">
                {currentUser && (
                  <div className="mb-5 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xl text-white shadow-lg shadow-orange-500/30">👨🌾</div>
                    <div>
                      <p className="font-bold text-orange-800">{currentUser.name}</p>
                      <p className="text-sm text-orange-600">📍 {currentUser.district}, {currentUser.state}</p>
                    </div>
                  </div>
                )}


                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🏠 Farm</label>
                    <select value={formData.farm} onChange={(e) => setFormData({ ...formData, farm: e.target.value })} required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10">
                      <option value="">Select Farm</option>
                      {farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">📂 Category</label>
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10">
                        {REMINDER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">⚡ Priority</label>
                      <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10">
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📌 Title</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Apply fertilizer" required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 Due Date & Time</label>
                    <input type="datetime-local" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10" />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2">📝 Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Additional details..." rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 pr-12" />

                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? "Stop listening" : "Start speaking"}
                      className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 ${isListening
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                        }`}
                    >
                      {isListening ? (
                        <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                      ) : (
                        <span className="text-xl">🎙</span>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddForm(false)}
                      className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                    <button type="submit" disabled={loading}
                      className="px-8 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5">
                      {loading ? 'â³ Adding...' : '🔔 Add Reminder'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Reminders Lists */}
        <div className="space-y-8">
          {loading && reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading reminders...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-orange-200">
              <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🔔</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No reminders set</h3>
              <p className="text-gray-500 mb-6">Add a reminder to stay organized!</p>
              <button onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all hover:-translate-y-1">
                + Add First Reminder
              </button>
            </div>
          ) : (
            <>
              {/* Overdue */}
              {overdueReminders.length > 0 && (
                <section style={{ animation: 'slideUp 0.4s ease-out' }}>
                  <h2 className="text-xl font-extrabold text-red-600 mb-4 flex items-center gap-2">
                    ⚠ Overdue
                    <span className="text-sm font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white px-3 py-0.5 rounded-full shadow-sm">{overdueReminders.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {overdueReminders.map((reminder, i) => (
                      <ReminderCard key={reminder.id} reminder={reminder} index={i}
                        onMarkCompleted={markCompleted} onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo} formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue} priorityConfig={PRIORITY_CONFIG} isOverdue={true} />
                    ))}
                  </div>
                </section>
              )}

              {/* Upcoming */}
              {upcomingReminders.length > 0 && (
                <section style={{ animation: 'slideUp 0.5s ease-out' }}>
                  <h2 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                    📅 Upcoming
                    <span className="text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-0.5 rounded-full shadow-sm">{upcomingReminders.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {upcomingReminders.map((reminder, i) => (
                      <ReminderCard key={reminder.id} reminder={reminder} index={i}
                        onMarkCompleted={markCompleted} onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo} formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue} priorityConfig={PRIORITY_CONFIG} />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {completedReminders.length > 0 && (
                <section style={{ animation: 'slideUp 0.6s ease-out' }}>
                  <h2 className="text-xl font-extrabold text-gray-500 mb-4 flex items-center gap-2">
                    ✅ Completed
                    <span className="text-sm font-bold bg-gray-200 text-gray-600 px-3 py-0.5 rounded-full">{completedReminders.length}</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {completedReminders.map((reminder, i) => (
                      <ReminderCard key={reminder.id} reminder={reminder} index={i}
                        onMarkCompleted={markCompleted} onDelete={deleteReminder}
                        getCategoryInfo={getCategoryInfo} formatDateTime={formatDateTime}
                        getDaysUntilDue={getDaysUntilDue} priorityConfig={PRIORITY_CONFIG} isCompleted={true} />
                    ))}
                  </div>
                </section>
              )}
            </>
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

function ReminderCard({ reminder, index, onMarkCompleted, onDelete, getCategoryInfo, formatDateTime, getDaysUntilDue, priorityConfig, isOverdue = false, isCompleted = false }) {
  const categoryInfo = getCategoryInfo(reminder.category);
  const dateTime = formatDateTime(reminder.due_date);
  const daysUntil = getDaysUntilDue(reminder.due_date);
  const priority = priorityConfig[reminder.priority] || priorityConfig.medium;

  return (
    <div className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group ${isOverdue ? 'border-red-200' :
      isCompleted ? 'opacity-70 border-gray-100' :
        reminder.priority === 'high' ? 'border-red-200 ring-2 ring-red-100' :
          'border-gray-100'
      }`} style={{ animation: `slideUp 0.4s ease-out ${index * 0.1}s both` }}>

      {/* Colored top stripe */}
      <div className={`h-2 bg-gradient-to-r ${isCompleted ? 'from-gray-300 to-gray-400' : categoryInfo.gradient}`}></div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryInfo.gradient} flex items-center justify-center text-2xl text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {categoryInfo.icon}
          </div>
          <div className="flex items-center gap-1">
            {/* Priority pill */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${priority.light}`}>
              {priority.icon} {priority.label}
            </span>
          </div>
        </div>

        <h3 className={`text-lg font-extrabold mb-2 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {reminder.title}
        </h3>

        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="font-semibold text-gray-500">{dateTime.date}</span>
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-gray-500">{dateTime.time}</span>
          {!isCompleted && (
            <span className={`ml-auto text-xs font-extrabold px-2.5 py-1 rounded-full ${isOverdue ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-600 border border-red-200' :
              daysUntil <= 2 ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200' :
                'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
              {isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'â° Today' : `${daysUntil}d left`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${categoryInfo.light}`}>
            {categoryInfo.label}
          </span>
          {reminder.farm_name && reminder.farm_name !== 'Unknown Farm' && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border bg-gray-50/80 border-gray-200 text-gray-600">
              🏠 {reminder.farm_name}
            </span>
          )}
        </div>

        {reminder.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{reminder.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {!isCompleted ? (
            <button onClick={() => onMarkCompleted(reminder.id)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:from-emerald-100 hover:to-green-100 transition-all flex items-center gap-1 hover:scale-105">
              ✓ Complete
            </button>
          ) : (
            <button onClick={() => onMarkCompleted(reminder.id)}
              className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1 hover:scale-105">
              ↩ Undo
            </button>
          )}
          <button onClick={() => onDelete(reminder.id)}
            className="px-4 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all flex items-center gap-1 border border-transparent hover:border-red-200 hover:scale-105">
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  );
}
