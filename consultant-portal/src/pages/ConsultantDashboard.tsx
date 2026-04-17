import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/api';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  completed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const TYPE_ICONS: Record<string, string> = {
  phone: '📞', video: '📹', visit: '🚜', office: '🏢',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ConsultantDashboard() {
  const [session, setSession] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('consultant_session') || 'null');
      if (s) {
        setSession(s);
        fetchConsultations(s.id);
        fetchStats(s.id);
      }
    } catch {
      window.location.hash = '#/';
    }
  }, []);

  const fetchConsultations = async (officerId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/consultants/consultations?officer_id=${officerId}`);
      const data = await res.json();
      if (data.success) setConsultations(data.data || []);
    } catch (err) {
      console.error('Fetch consultations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (officerId: string) => {
    try {
      const res = await apiFetch(`/api/consultants/profile/${officerId}`);
      const data = await res.json();
      if (data.success && data.data.stats) setStats(data.data.stats);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await apiFetch(`/api/consultants/consultations/${id}/approve`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setConsultations(prev => prev.map(c => (c._id === id || c.id === id) ? data.data : c));
        if (session) fetchStats(session.id);
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Optional: Reason for rejection?') || '';
    try {
      const res = await apiFetch(`/api/consultants/consultations/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        setConsultations(prev => prev.map(c => (c._id === id || c.id === id) ? data.data : c));
        if (session) fetchStats(session.id);
      }
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/consultants/consultations/${id}/complete`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setConsultations(prev => prev.map(c => (c._id === id || c.id === id) ? data.data : c));
        if (session) fetchStats(session.id);
      }
    } catch (err) {
      console.error('Complete error:', err);
    }
  };

  const handleStartCall = async (consultation: any) => {
    try {
      const id = consultation._id || consultation.id;
      const res = await apiFetch(`/api/consultants/consultations/${id}/start-call`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        window.location.hash = `#/video-call?room=${data.data.room_id}&cid=${id}`;
      }
    } catch (err) {
      console.error('Start call error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('consultant_session');
    window.location.hash = '#/';
    window.location.reload();
  };

  // Filter consultations
  const filteredConsultations = useMemo(() => {
    let list = [...consultations];
    if (activeTab === 'pending') list = list.filter(c => c.status === 'pending');
    else if (activeTab === 'confirmed') list = list.filter(c => c.status === 'confirmed');
    else if (activeTab === 'completed') list = list.filter(c => c.status === 'completed' || c.status === 'cancelled');
    return list;
  }, [consultations, activeTab]);

  // Calendar data
  const calendarConsultations = useMemo(() => {
    const map = new Map<string, any[]>();
    consultations
      .filter(c => c.status !== 'cancelled')
      .forEach(c => {
        if (c.preferred_date) {
          const key = new Date(c.preferred_date).toISOString().split('T')[0];
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(c);
        }
      });
    return map;
  }, [consultations]);

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    const days: any[] = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        date: dateStr,
        isToday: dateStr === today,
        consultations: calendarConsultations.get(dateStr) || [],
      });
    }
    return days;
  }, [calendarDate, calendarConsultations]);

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      {/* ─── Top Nav ─────────────────────────────────────────────── */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between" style={{ animation: 'slideDown 0.4s ease-out' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
            👨‍🌾
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Consultant Portal</h1>
            <p className="text-xs text-slate-400">Krishi Sakhi</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse-glow 2s infinite' }}></span>
            <span className="text-emerald-300 text-sm font-bold">{session.name}</span>
            <span className="text-slate-400 text-xs">• {session.designation}</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-bold hover:bg-red-500/20 transition-all"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* ─── Stats Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, icon: '📋', gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20' },
            { label: 'Pending', value: stats.pending, icon: '⏳', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
            { label: 'Confirmed', value: stats.confirmed, icon: '✅', gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
            { label: 'Completed', value: stats.completed, icon: '🏆', gradient: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`glass-light rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-300`}
              style={{ animation: `slideUp 0.4s ease-out ${i * 0.1}s both` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-lg shadow-lg ${stat.shadow}`}>
                  {stat.icon}
                </div>
                <span className="text-3xl font-black text-white">{stat.value}</span>
              </div>
              <p className="text-sm text-slate-400 font-medium">{stat.label} Consultations</p>
            </div>
          ))}
        </div>

        {/* ─── Tab Navigation ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-6" style={{ animation: 'slideUp 0.4s ease-out 0.3s both' }}>
          {[
            { id: 'pending', label: '⏳ Pending Requests', count: consultations.filter(c => c.status === 'pending').length },
            { id: 'confirmed', label: '✅ Confirmed', count: consultations.filter(c => c.status === 'confirmed').length },
            { id: 'completed', label: '🏆 History', count: consultations.filter(c => c.status === 'completed' || c.status === 'cancelled').length },
            { id: 'calendar', label: '📅 Calendar' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'glass-light text-slate-300 hover:text-white hover:border-emerald-500/30'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Content ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full mb-4" style={{ animation: 'spin 0.8s linear infinite' }}></div>
            <p className="text-slate-400 font-bold">Loading consultations...</p>
          </div>
        ) : activeTab === 'calendar' ? (
          /* ─── Calendar View ──────────────────────────────────── */
          <div className="glass rounded-3xl p-6 md:p-8" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="w-10 h-10 rounded-xl glass-light flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg">‹</button>
              <h2 className="text-xl font-extrabold text-white">
                {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="w-10 h-10 rounded-xl glass-light flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg">›</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, i) => (
                <div
                  key={i}
                  className={`min-h-[80px] md:min-h-[100px] rounded-xl p-2 transition-all duration-200 ${
                    cell
                      ? cell.isToday
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'glass-light hover:bg-white/8'
                      : ''
                  }`}
                >
                  {cell && (
                    <>
                      <div className={`text-sm font-bold mb-1 ${cell.isToday ? 'text-emerald-300' : 'text-slate-300'}`}>
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {cell.consultations.slice(0, 2).map((c: any, j: number) => (
                          <div
                            key={j}
                            className={`text-xs px-1.5 py-0.5 rounded-md truncate font-medium ${
                              c.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : c.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                            title={`${c.subject} - ${c.farmer?.name || 'Farmer'}`}
                          >
                            {TYPE_ICONS[c.consultation_type] || '📞'} {c.preferred_time || ''} {c.subject?.substring(0, 15)}
                          </div>
                        ))}
                        {cell.consultations.length > 2 && (
                          <div className="text-xs text-slate-400 font-bold pl-1">
                            +{cell.consultations.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Today's agenda */}
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const todayConsults = calendarConsultations.get(today) || [];
              return todayConsults.length > 0 ? (
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
                    📌 Today's Agenda ({todayConsults.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {todayConsults.map((c: any, i: number) => (
                      <div key={i} className="glass-light rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">{TYPE_ICONS[c.consultation_type] || '📞'}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{c.subject}</h4>
                          <p className="text-xs text-slate-400">{c.preferred_time || '10:00 AM'} • {c.farmer?.name || 'Farmer'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[c.status]}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        ) : filteredConsultations.length === 0 ? (
          /* ─── Empty State ───────────────────────────────────── */
          <div className="text-center p-20 glass rounded-3xl" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="text-6xl mb-4">
              {activeTab === 'pending' ? '⏳' : activeTab === 'confirmed' ? '✅' : '📋'}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No {activeTab} consultations</h3>
            <p className="text-slate-400">
              {activeTab === 'pending'
                ? 'No new consultation requests at the moment'
                : activeTab === 'confirmed'
                ? 'No confirmed consultations yet'
                : 'No consultation history available'}
            </p>
          </div>
        ) : (
          /* ─── Consultation Cards ─────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredConsultations.map((c, i) => {
              const cId = c._id || c.id;
              return (
                <div
                  key={cId || i}
                  className="glass rounded-2xl overflow-hidden hover:scale-[1.01] transition-all duration-300 group"
                  style={{ animation: `slideUp 0.4s ease-out ${i * 0.06}s both` }}
                >
                  {/* Status stripe */}
                  <div className={`h-1 ${
                    c.status === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                    c.status === 'confirmed' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
                    c.status === 'completed' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                    'bg-gradient-to-r from-red-400 to-rose-400'
                  }`}></div>

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {c.subject}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg">{TYPE_ICONS[c.consultation_type] || '📞'}</span>
                          <span className="text-sm text-slate-400 font-medium capitalize">{c.consultation_type} consultation</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-extrabold border ${STATUS_COLORS[c.status]}`}>
                        {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                      </span>
                    </div>

                    {c.description && (
                      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{c.description}</p>
                    )}

                    {/* Farmer Info */}
                    <div className="bg-slate-800/50 rounded-xl p-4 mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-400 font-bold">👤 Farmer:</span>
                        <span className="text-white font-medium">{c.farmer?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs">
                        {c.farmer?.phone && (
                          <span className="flex items-center gap-1 text-slate-300">📱 {c.farmer.phone}</span>
                        )}
                        {c.farmer?.state && (
                          <span className="flex items-center gap-1 text-slate-300">📍 {c.farmer.state}{c.farmer.district ? `, ${c.farmer.district}` : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Date/Time */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <span className="text-sm">📅</span>
                        <span className="text-sm font-bold text-indigo-300">
                          {c.preferred_date ? new Date(c.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <span className="text-sm">⏰</span>
                        <span className="text-sm font-bold text-purple-300">{c.preferred_time || '10:00 AM'}</span>
                      </div>
                      {c.farmer_location && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 rounded-lg border border-teal-500/20">
                          <span className="text-sm">📍</span>
                          <span className="text-sm font-medium text-teal-300 truncate max-w-[150px]">{c.farmer_location}</span>
                        </div>
                      )}
                    </div>

                    {c.notes && c.notes !== '' && (
                      <div className="text-xs text-slate-500 italic mb-3 px-3 py-2 bg-slate-800/30 rounded-lg">
                        💬 {c.notes}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(cId)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleReject(cId)}
                            className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {c.status === 'confirmed' && (
                        <>
                          {c.consultation_type === 'video' && (
                            <button
                              onClick={() => handleStartCall(c)}
                              className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                              style={{ animation: 'pulse-glow 2s infinite' }}
                            >
                              📹 Start Video Call
                            </button>
                          )}
                          <button
                            onClick={() => handleComplete(cId)}
                            className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                          >
                            🏆 Mark Complete
                          </button>
                        </>
                      )}
                      {c.status === 'completed' && (
                        <div className="w-full py-2.5 text-center text-sm font-bold text-blue-300 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          ✅ Completed
                        </div>
                      )}
                      {c.status === 'cancelled' && (
                        <div className="w-full py-2.5 text-center text-sm font-bold text-red-300 bg-red-500/10 rounded-xl border border-red-500/20">
                          ❌ Cancelled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
