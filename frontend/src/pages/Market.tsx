import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

export default function Market() {
  const [selectedState, setSelectedState] = useState('Kerala');
  const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam');
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [marketData, setMarketData] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [priceSource, setPriceSource] = useState(null);
  const [priceSources, setPriceSources] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const chartRef = useRef(null);

  // Buy/Sell modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('buy');
  const [modalItem, setModalItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalUnit, setModalUnit] = useState('quintal');
  const [modalPrice, setModalPrice] = useState(0);
  const [modalNotes, setModalNotes] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState('prices');

  const states = Object.keys(INDIAN_STATES).sort();
  const districts = INDIAN_STATES[selectedState]?.sort() || [];

  // Init user
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('ammachi_session') || '{}');
      if (session.userId) {
        setCurrentUser(session);
        if (session.state) setSelectedState(session.state);
        if (session.district) setSelectedDistrict(session.district);
      }
    } catch (e) { }
  }, []);

  // Fetch crops when state changes
  useEffect(() => {
    if (!selectedState) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/market/crops?state=${encodeURIComponent(selectedState)}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCrops(data.data);
          setSelectedCrop(data.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch crops:', err);
      }
    })();
  }, [selectedState]);

  // Fetch prices when crop/district changes
  useEffect(() => {
    if (!selectedCrop || !selectedState) return;
    fetchPrices();
    fetchPriceHistory();
  }, [selectedCrop, selectedState, selectedDistrict]);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/market/prices?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(selectedDistrict)}&commodity=${encodeURIComponent(selectedCrop)}`
      );
      const data = await res.json();
      if (data.success) {
        setMarketData(data.data || []);
        setPriceSource(data.source || null);
        setPriceSources(data.sources || []);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch market data');
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      setError('Failed to connect to market API');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const res = await apiFetch(
        `/api/market/price-history?state=${encodeURIComponent(selectedState)}&commodity=${encodeURIComponent(selectedCrop)}&days=7`
      );
      const data = await res.json();
      if (data.success) setPriceHistory(data.data || []);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    }
  };

  const fetchInsights = async () => {
    if (!selectedCrop || !selectedState) return;
    setInsightsLoading(true);
    try {
      const mainPrice = marketData[0] || {};
      const res = await apiFetch('/api/market/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: selectedCrop,
          state: selectedState,
          district: selectedDistrict,
          modal_price: mainPrice.modal_price,
          min_price: mainPrice.min_price,
          max_price: mainPrice.max_price
        })
      });
      const data = await res.json();
      if (data.success) setInsights(data.data);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!currentUser?.userId) return;
    try {
      const res = await apiFetch(`/api/market/transactions?farmer_id=${currentUser.userId}`);
      const data = await res.json();
      if (data.success) setTransactions(data.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  // ECharts
  useEffect(() => {
    if (priceHistory.length === 0 || !chartRef.current) return;
    let chart;
    (async () => {
      try {
        let echarts;
        try {
          echarts = await new Function('return import("echarts")')();
        } catch {
          if (!(window as any).echarts) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js';
              s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            }).catch(() => { });
          }
          echarts = (window as any).echarts;
        }
        if (!chartRef.current || !echarts) return;
        chart = (echarts.init || (window as any).echarts.init).call(echarts, chartRef.current);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dates = priceHistory.map(d => {
          const dt = new Date(d.date);
          return `${months[dt.getMonth()]} ${dt.getDate()}`;
        });

        // Find the index that separates past from prediction
        const todayIdx = priceHistory.findIndex(d => d.live) >= 0
          ? priceHistory.findIndex(d => d.live)
          : priceHistory.findIndex(d => d.predicted) - 1;

        // Split data: past data has nulls for future, predicted has nulls for past
        // They share one overlapping point at todayIdx for continuity
        const pastModal = priceHistory.map((d, i) => i <= todayIdx ? d.modal_price : null);
        const pastMin = priceHistory.map((d, i) => i <= todayIdx ? d.min_price : null);
        const pastMax = priceHistory.map((d, i) => i <= todayIdx ? d.max_price : null);
        const predModal = priceHistory.map((d, i) => i >= todayIdx ? d.modal_price : null);
        const predMin = priceHistory.map((d, i) => i >= todayIdx ? d.min_price : null);
        const predMax = priceHistory.map((d, i) => i >= todayIdx ? d.max_price : null);

        const lastIsLive = priceHistory[todayIdx]?.live;

        chart.setOption({
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#e5e7eb',
            textStyle: { color: '#374151', fontWeight: 500 },
            formatter: (params) => {
              const idx = params[0]?.dataIndex;
              const isPredicted = idx > todayIdx;
              let html = `<b>${params[0].axisValue}</b>${isPredicted ? ' <span style="color:#8B5CF6">(Predicted)</span>' : ''}<br/>`;
              params.forEach(p => {
                if (p.value != null) {
                  html += `<span style="color:${p.color}">â—</span> ${p.seriesName}: <b>₹${p.value.toLocaleString()}</b><br/>`;
                }
              });
              return html;
            }
          },
          legend: {
            data: ['Modal Price', 'Min Price', 'Max Price', '🔮 Predicted'],
            bottom: 0,
            textStyle: { color: '#6B7280', fontWeight: 600 },
            itemStyle: { borderWidth: 0 }
          },
          grid: { left: '3%', right: '4%', bottom: '14%', top: '8%', containLabel: true },
          xAxis: {
            type: 'category',
            data: dates,
            axisLine: { lineStyle: { color: '#E5E7EB' } },
            axisLabel: {
              color: '#6B7280', fontWeight: 500,
              formatter: (val, idx) => idx === todayIdx ? `📍 ${val}` : val
            }
          },
          yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#6B7280', formatter: '₹{value}' },
            splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
          },
          series: [
            // ── Past Modal Price (solid green) ──
            {
              name: 'Modal Price',
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 8,
              data: pastModal,
              connectNulls: false,
              lineStyle: { width: 3, color: '#10B981' },
              itemStyle: { color: '#10B981', borderWidth: 2 },
              areaStyle: {
                color: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(16,185,129,0.3)' },
                    { offset: 1, color: 'rgba(16,185,129,0.02)' }
                  ]
                }
              },
              markPoint: lastIsLive ? {
                data: [{
                  name: 'TODAY',
                  coord: [todayIdx, pastModal[todayIdx]],
                  symbol: 'pin',
                  symbolSize: 50,
                  itemStyle: { color: '#EF4444' },
                  label: { show: true, formatter: '🔴 LIVE', color: '#fff', fontWeight: 'bold', fontSize: 10 }
                }]
              } : undefined,
              markLine: {
                silent: true,
                symbol: 'none',
                data: [{
                  xAxis: todayIdx,
                  lineStyle: { color: '#6B7280', type: 'dashed', width: 2 },
                  label: { show: true, formatter: 'Today', color: '#6B7280', fontWeight: 'bold', position: 'insideStartTop' }
                }]
              }
            },
            // ── Past Min Price ──
            {
              name: 'Min Price',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: pastMin,
              connectNulls: false,
              lineStyle: { width: 2, color: '#F59E0B', type: 'dashed' },
              itemStyle: { color: '#F59E0B' }
            },
            // ── Past Max Price ──
            {
              name: 'Max Price',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: pastMax,
              connectNulls: false,
              lineStyle: { width: 2, color: '#EF4444', type: 'dashed' },
              itemStyle: { color: '#EF4444' }
            },
            // ── Predicted Modal (dashed purple) ──
            {
              name: '🔮 Predicted',
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 6,
              symbol: 'diamond',
              data: predModal,
              connectNulls: false,
              lineStyle: { width: 3, color: '#8B5CF6', type: 'dashed' },
              itemStyle: { color: '#8B5CF6', borderWidth: 2 },
              areaStyle: {
                color: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(139,92,246,0.15)' },
                    { offset: 1, color: 'rgba(139,92,246,0.02)' }
                  ]
                }
              }
            },
            // ── Predicted Min (dashed orange-light) ──
            {
              name: 'Min Price',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: predMin,
              connectNulls: false,
              lineStyle: { width: 1.5, color: '#C084FC', type: 'dotted' },
              itemStyle: { color: '#C084FC' }
            },
            // ── Predicted Max (dashed pink) ──
            {
              name: 'Max Price',
              type: 'line',
              smooth: true,
              showSymbol: false,
              data: predMax,
              connectNulls: false,
              lineStyle: { width: 1.5, color: '#A78BFA', type: 'dotted' },
              itemStyle: { color: '#A78BFA' }
            }
          ],
          animationDuration: 1500,
          animationEasing: 'cubicOut'
        });

        const onResize = () => chart && chart.resize();
        window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('resize', onResize); chart && chart.dispose(); };
      } catch (e) {
        console.error('Chart init failed:', e);
      }
    })();
    return () => { if (chart) chart.dispose(); };
  }, [priceHistory, selectedCrop]);

  // Modal helpers
  const openModal = (type, item) => {
    if (!currentUser?.userId) { alert('Please login first'); return; }
    setModalType(type);
    setModalItem(item);
    setModalQuantity(1);
    setModalUnit('quintal');
    setModalPrice(item.modal_price || item.price || 0);
    setModalNotes('');
    setShowModal(true);
  };

  const totalPrice = modalQuantity * modalPrice;

  const submitTransaction = async () => {
    if (!currentUser?.userId) return;
    setModalLoading(true);
    try {
      const res = await apiFetch('/api/market/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer: currentUser.userId,
          type: modalType,
          commodity: selectedCrop,
          variety: modalItem?.variety || 'Standard',
          market: `${selectedDistrict} Market`,
          state: selectedState,
          district: selectedDistrict,
          quantity: modalQuantity,
          unit: modalUnit,
          price_per_unit: modalPrice,
          total_price: totalPrice,
          notes: modalNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`${modalType === 'buy' ? '🛒 Purchase' : '💰 Sale'} order placed successfully!`);
        setTimeout(() => setSuccess(''), 4000);
        setShowModal(false);
        fetchTransactions();
      }
    } catch (err) {
      console.error('Transaction error:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  // Derived
  const mainPrice = marketData[0];
  const priceChange = priceHistory.length >= 2
    ? ((priceHistory[priceHistory.length - 1].modal_price - priceHistory[0].modal_price) / priceHistory[0].modal_price * 100).toFixed(1)
    : 0;

  const TABS = [
    { id: 'prices', label: '📊 Market Prices', icon: '📊' },
    { id: 'insights', label: '🧠 AI Insights', icon: '🧠' },
    { id: 'orders', label: '📋 My Orders', icon: '📋' },
  ];

  return (
    <div className="flex bg-gradient-to-br from-gray-50 via-emerald-50/20 to-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        {/* â•â•â• Hero Header â•â•â• */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-8 mb-8 overflow-hidden shadow-xl shadow-emerald-600/20">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
          <div className="absolute bottom-0 left-20 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" style={{ animation: 'pulse 4s ease-in-out infinite' }}></div>
          <div className="absolute top-4 right-12 text-7xl opacity-10 animate-bounce" style={{ animationDuration: '3s' }}>📈</div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center gap-3">
                📈 Live Market Prices
              </h1>
              <p className="text-emerald-100 text-lg">
                Real-time crop prices, trends & smart market insights
                {currentUser && (
                  <span className="ml-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                    👨🌾 {currentUser.name}
                  </span>
                )}
              </p>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-3">
                {priceSource === 'scraped_live' && (
                  <div className="bg-red-500/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-red-300/30 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                    <span className="text-white text-sm font-bold">LIVE</span>
                  </div>
                )}
                {priceSources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {priceSources.map(s => (
                      <span key={s} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
                        {s === 'CommodityOnline' ? '🌐' : s === 'KisanDeals' ? '🌾' : '🤖'} {s}
                      </span>
                    ))}
                  </div>
                )}
                {priceSource === 'generated' && (
                  <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 flex items-center gap-2">
                    <span className="text-emerald-100 text-sm font-medium">📊 Estimated</span>
                  </div>
                )}
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-emerald-100 text-xs font-medium">📅 {lastUpdated.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="text-white font-bold text-lg">{lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats */}
          {mainPrice && (
            <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-2xl font-extrabold text-white">₹{mainPrice.min_price?.toLocaleString()}</div>
                <div className="text-emerald-100 text-sm font-medium">Min Price</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/30 ring-2 ring-white/20">
                <div className="text-3xl font-extrabold text-white">₹{mainPrice.modal_price?.toLocaleString()}</div>
                <div className="text-emerald-100 text-sm font-bold">Modal Price</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                <div className="text-2xl font-extrabold text-white">₹{mainPrice.max_price?.toLocaleString()}</div>
                <div className="text-emerald-100 text-sm font-medium">Max Price</div>
              </div>
            </div>
          )}
        </div>

        {/* â•â•â• Selectors â•â•â• */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 mb-8" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🗺 State</label>
              <select value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(INDIAN_STATES[e.target.value]?.[0] || ''); }}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-gray-800">
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📍 District</label>
              <select value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-gray-800">
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🌾 Crop</label>
              <select value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium text-gray-800">
                {crops.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1 font-medium">{crops.length} crops available in {selectedState}</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={fetchPrices} disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
              {loading ? 'â³ Loading...' : '🔄 Refresh Prices'}
            </button>
          </div>
        </div>

        {/* success toast */}
        {success && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-2xl border border-emerald-200 font-bold flex items-center gap-2 shadow-sm" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <span className="text-xl">✅</span> {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 text-red-700 rounded-2xl border border-red-200 font-medium flex items-center gap-2">
            <span>⚠</span> {error}
            <button onClick={fetchPrices} className="ml-auto text-sm font-bold underline">Retry</button>
          </div>
        )}

        {/* â•â•â• Tabs â•â•â• */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'insights' && !insights) fetchInsights();
                if (tab.id === 'orders') fetchTransactions();
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* â•â•â• Tab: Prices â•â•â• */}
        {activeTab === 'prices' && (
          <div className="space-y-8" style={{ animation: 'slideUp 0.4s ease-out' }}>
            {/* Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  📉 Price Trend & 🔮 7-Day Forecast — {selectedCrop}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-extrabold ${Number(priceChange) >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {Number(priceChange) >= 0 ? `▲ +${priceChange}%` : `▼ ${priceChange}%`}
                </span>
              </div>
              <div ref={chartRef} className="w-full h-72" />
            </div>

            {/* Market Cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Fetching live prices...</p>
              </div>
            ) : marketData.length === 0 ? (
              <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-emerald-200">
                <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a crop to see prices</h3>
                <p className="text-gray-500">Choose your state, district, and crop above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketData.map((item, i) => {
                  const gradients = [
                    'from-emerald-500 to-teal-500', 'from-blue-500 to-indigo-500', 'from-amber-500 to-orange-500',
                    'from-purple-500 to-pink-500', 'from-cyan-500 to-blue-500', 'from-rose-500 to-red-500'
                  ];
                  return (
                    <div key={item.id || i}
                      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group"
                      style={{ animation: `slideUp 0.4s ease-out ${i * 0.1}s both` }}>
                      {/* gradient stripe */}
                      <div className={`h-2 bg-gradient-to-r ${gradients[i % gradients.length]}`}></div>
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-extrabold text-gray-800">{selectedCrop}</h4>
                            <span className="text-sm font-medium text-gray-500">{item.variety || 'Standard'} • {item.grade || 'FAQ'}</span>
                          </div>
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                            🌾
                          </div>
                        </div>

                        {item.scraped && (
                          <div className="mb-3 flex flex-wrap items-center gap-1.5">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold text-red-600">LIVE</span>
                            {priceSources.map(s => (
                              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-4">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 font-medium mb-1">Modal Price</div>
                            <div className="text-3xl font-extrabold text-gray-900">₹{item.modal_price?.toLocaleString()}</div>
                            <div className="text-sm text-gray-500 font-medium">/quintal</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="text-center p-2 bg-white rounded-xl">
                              <div className="text-xs text-amber-600 font-bold">Min</div>
                              <div className="text-lg font-extrabold text-gray-800">₹{item.min_price?.toLocaleString()}</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded-xl">
                              <div className="text-xs text-red-500 font-bold">Max</div>
                              <div className="text-lg font-extrabold text-gray-800">₹{item.max_price?.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                          <span>🏢</span>
                        </div>

                        {/* Buy / Sell buttons */}
                        <div className="flex gap-3">
                          <button onClick={() => openModal('buy', item)}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            🛒 Buy
                          </button>
                          <button onClick={() => openModal('sell', item)}
                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            💰 Sell
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* â•â•â• Tab: AI Insights â•â•â• */}
        {activeTab === 'insights' && (
          <div className="space-y-6" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">🧠 AI Market Insights for {selectedCrop}</h3>
              <button onClick={fetchInsights} disabled={insightsLoading}
                className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                {insightsLoading ? 'â³ Analyzing...' : '✨ Generate Insights'}
              </button>
            </div>

            {insightsLoading ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-gray-100">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Gemini is analyzing market data...</p>
              </div>
            ) : insights ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── 1. Market Summary ── */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-500/20">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2 opacity-90">📊 Market Summary</h4>
                  <p className="text-indigo-100 leading-relaxed text-base">{insights.summary}</p>
                  <div className="flex flex-wrap gap-3 mt-5">
                    <span className={`px-4 py-2 rounded-full text-sm font-extrabold ${insights.trend === 'rising' ? 'bg-green-400/20 text-green-200' : insights.trend === 'falling' ? 'bg-red-400/20 text-red-200' : 'bg-white/20 text-white'}`}>
                      {insights.trend === 'rising' ? '📈 Rising' : insights.trend === 'falling' ? '📉 Falling' : '➡ Stable'}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-extrabold ${insights.recommendation === 'sell' ? 'bg-amber-400/20 text-amber-200' : insights.recommendation === 'buy' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/20 text-white'}`}>
                      {insights.recommendation === 'sell' ? '💰 Sell Now' : insights.recommendation === 'buy' ? '🛒 Buy Now' : 'â³ Hold'}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-extrabold ${insights.riskLevel === 'high' ? 'bg-red-400/20 text-red-200' : insights.riskLevel === 'low' ? 'bg-green-400/20 text-green-200' : 'bg-yellow-400/20 text-yellow-200'}`}>
                      {insights.riskLevel === 'high' ? '🔴 High Risk' : insights.riskLevel === 'low' ? '🟢 Low Risk' : '🟡 Medium Risk'}
                    </span>
                  </div>
                </div>

                {/* ── 2. Price Forecast ── */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-200 shadow-sm">
                  <h4 className="font-extrabold text-amber-800 text-lg mb-3 flex items-center gap-2">🔮 Price Forecast</h4>
                  <p className="text-amber-700 font-medium leading-relaxed mb-4">{insights.forecast}</p>
                  {insights.priceRange && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
                        <div className="text-xs text-amber-600 font-bold">Week Low</div>
                        <div className="text-lg font-extrabold text-gray-800">₹{insights.priceRange.weekLow?.toLocaleString()}</div>
                      </div>
                      <div className="bg-amber-100 rounded-xl p-3 text-center border border-amber-200">
                        <div className="text-xs text-amber-700 font-bold">Current</div>
                        <div className="text-lg font-extrabold text-amber-800">₹{insights.priceRange.current?.toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
                        <div className="text-xs text-amber-600 font-bold">Week High</div>
                        <div className="text-lg font-extrabold text-gray-800">₹{insights.priceRange.weekHigh?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. Demand & Supply ── */}
                {insights.demandSupply && (
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-3xl p-6 border border-cyan-200 shadow-sm">
                    <h4 className="font-extrabold text-cyan-800 text-lg mb-3 flex items-center gap-2">📦 Demand & Supply</h4>
                    <p className="text-cyan-700 font-medium leading-relaxed">{insights.demandSupply}</p>
                  </div>
                )}

                {/* ── 4. Best Strategy ── */}
                {insights.bestStrategy && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-200 shadow-sm">
                    <h4 className="font-extrabold text-emerald-800 text-lg mb-3 flex items-center gap-2">🎯 Best Strategy</h4>
                    <p className="text-emerald-700 font-medium leading-relaxed">{insights.bestStrategy}</p>
                  </div>
                )}

                {/* ── 5. Seasonal Note ── */}
                {insights.seasonalNote && (
                  <div className="lg:col-span-2 bg-gradient-to-r from-rose-50 to-pink-50 rounded-3xl p-5 border border-rose-200 shadow-sm flex items-start gap-4">
                    <span className="text-3xl">🌦</span>
                    <div>
                      <h4 className="font-extrabold text-rose-800 text-base mb-1">Seasonal Factors</h4>
                      <p className="text-rose-700 font-medium leading-relaxed text-sm">{insights.seasonalNote}</p>
                    </div>
                  </div>
                )}

                {/* ── 6. Actionable Tips ── */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <h4 className="font-extrabold text-gray-800 text-lg mb-4 flex items-center gap-2">💡 Actionable Market Tips</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(insights.tips || []).map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-gray-700 font-medium text-sm leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-purple-200">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Get AI-Powered Insights</h3>
                <p className="text-gray-500 mb-6">Click "Generate Insights" for Gemini-powered market analysis</p>
              </div>
            )}
          </div>
        )}

        {/* â•â•â• Tab: My Orders â•â•â• */}
        {activeTab === 'orders' && (
          <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <h3 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">📋 My Transactions</h3>
            {transactions.length === 0 ? (
              <div className="text-center p-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No transactions yet</h3>
                <p className="text-gray-500">Your buy and sell orders will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {transactions.map((txn, i) => (
                  <div key={txn.id || i}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all"
                    style={{ animation: `slideUp 0.4s ease-out ${i * 0.08}s both` }}>
                    <div className={`h-2 bg-gradient-to-r ${txn.type === 'buy' ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-orange-500'}`}></div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${txn.type === 'buy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {txn.type === 'buy' ? '🛒 BUY' : '💰 SELL'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${txn.status === 'completed' ? 'bg-green-50 text-green-700' : txn.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                          {txn.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-extrabold text-gray-800 mb-1">{txn.commodity}</h4>
                      <p className="text-sm text-gray-500 mb-3">{txn.variety} • {txn.market}</p>
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Quantity:</span>
                          <span className="font-bold text-gray-800">{txn.quantity} {txn.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Price:</span>
                          <span className="font-bold text-gray-800">₹{txn.price_per_unit?.toLocaleString()}/{txn.unit}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1 pt-1 border-t border-gray-200">
                          <span className="text-gray-500 font-bold">Total:</span>
                          <span className="font-extrabold text-emerald-600 text-lg">₹{txn.total_price?.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        {new Date(txn.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* â•â•â• Buy/Sell Modal â•â•â• */}
        {showModal && modalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100" style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
              {/* gradient header */}
              <div className={`p-6 rounded-t-3xl text-white flex justify-between items-center bg-gradient-to-r ${modalType === 'buy' ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-amber-500 via-orange-500 to-red-500'}`}>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {modalType === 'buy' ? '🛒 Purchase' : '💰 Sell'} {selectedCrop}
                </h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors text-lg">×</button>
              </div>

              <div className="p-6 space-y-5">
                {/* Info box */}
                <div className={`p-4 rounded-2xl border ${modalType === 'buy' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Commodity:</span>
                    <span className="font-bold text-gray-800">{selectedCrop} ({modalItem.variety})</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Market:</span>
                    <span className="font-bold text-gray-800">{selectedDistrict} Market</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Rate:</span>
                    <span className="font-bold text-gray-800">₹{modalItem.modal_price?.toLocaleString()}/quintal</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📦 Quantity</label>
                    <input type="number" min="0.1" step="0.1" value={modalQuantity}
                      onChange={(e) => setModalQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold text-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">⚖️ Unit</label>
                    <select value={modalUnit} onChange={(e) => setModalUnit(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold">
                      <option value="quintal">Quintal</option>
                      <option value="kg">Kg</option>
                      <option value="ton">Ton</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">💵 Price per {modalUnit}</label>
                  <input type="number" min="1" value={modalPrice}
                    onChange={(e) => setModalPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold text-lg" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">📝 Notes (optional)</label>
                  <textarea value={modalNotes} onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Any special requirements..." rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
                </div>

                {/* Total */}
                <div className={`p-4 rounded-2xl text-center ${modalType === 'buy' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'}`}>
                  <div className="text-sm text-gray-500 font-medium">Total Amount</div>
                  <div className={`text-3xl font-extrabold ${modalType === 'buy' ? 'text-emerald-600' : 'text-amber-600'}`}>₹{totalPrice.toLocaleString()}</div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
                    Cancel
                  </button>
                  <button onClick={submitTransaction} disabled={modalLoading || modalQuantity <= 0}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 ${modalType === 'buy'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'
                      } disabled:opacity-50`}>
                    {modalLoading ? 'â³ Processing...' : modalType === 'buy' ? '🛒 Confirm Purchase' : '💰 Confirm Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
