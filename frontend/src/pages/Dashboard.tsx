import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { FaCheckCircle, FaExclamationTriangle, FaLeaf, FaCloud, FaTint, FaWind, FaLightbulb, FaSync, FaLandmark, FaExternalLinkAlt } from 'react-icons/fa';
import TranslatedText from '../components/TranslatedText';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import SmartRecommendations from '../components/SmartRecommendations';
import { INDIAN_STATES } from '../utils/india-data';

export default function Dashboard() {
  const { language, changeLanguage } = useLanguage();
  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_profile') || '{}'); } catch { return {}; }
  })();
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_session') || '{}'); } catch { return {}; }
  })();

  const userId = session.userId || profile._id || profile.id;

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [cropHealthData, setCropHealthData] = useState([]);
  const [highPriorityReminders, setHighPriorityReminders] = useState([]);

  function signOut() {
    localStorage.removeItem('ammachi_session');
    window.location.hash = '#/login';
  }

  const chartRef = useRef(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      if (userId) {
        const [farmerRes, farmsRes, activitiesRes, remindersRes, highPriorityRes] = await Promise.all([
          apiFetch(`/api/farmers/${userId}/`),
          apiFetch(`/api/farms/?farmer=${userId}`),
          apiFetch(`/api/activities/?farmer_id=${userId}&limit=5`),
          apiFetch(`/api/reminders/?farmer=${userId}&limit=10`),
          apiFetch(`/api/reminders/?farmer_id=${userId}&priority=high&is_completed=false`)
        ]);

        const farmer = await farmerRes.json();
        
        // Sync language
        if (farmer.preferred_language && farmer.preferred_language !== language) {
          changeLanguage(farmer.preferred_language);
        }

        const farmsRaw = await farmsRes.json();
        const farmsArr = Array.isArray(farmsRaw) ? farmsRaw : (farmsRaw.results || []);
        const activitiesRaw = await activitiesRes.json();
        const activitiesArr = Array.isArray(activitiesRaw) ? activitiesRaw : (activitiesRaw.results || []);
        const remindersRaw = await remindersRes.json();
        const remindersArr = Array.isArray(remindersRaw) ? remindersRaw : (remindersRaw.results || []);
        const highPriority = await highPriorityRes.json();
        setHighPriorityReminders(Array.isArray(highPriority) ? highPriority : []);

        const farmerCropsRaw = farmsArr.map(f => f.primary_crops).filter(Boolean).join(', ') || 'Rice, Coconut';
        const cropsList = [...new Set(farmerCropsRaw.split(',').map(c => c.trim()).filter(Boolean))].slice(0, 3);
        const fState = farmer.state || session.state || 'Kerala';

        setDashboardData({
          farmer: {
            name: farmer.name || session.name || 'Farmer',
            crops: farmerCropsRaw,
            state: fState,
            district: farmer.district || session.district || 'Ernakulam',
            experience_years: farmer.experience_years || 5
          },
          farms: {
            totalFarms: farmsArr.length,
            totalAcres: farmsArr.reduce((sum, f) => sum + parseFloat(f.land_size_acres || 0), 0),
            activeFarms: farmsArr.filter(f => f.is_active).length
          },
          activities: {
            thisMonth: activitiesArr.length,
            recent: activitiesArr.slice(0, 5)
          },
          reminders: {
            upcoming: remindersArr.slice(0, 5),
            count: remindersArr.filter(r => !r.is_completed).length
          }
        });

        // Fetch market prices for crops
        try {
          const marketPromises = cropsList.map(crop =>
            apiFetch(`/api/market/prices?state=${fState}&commodity=${crop}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                  const p = data.data[0];
                  return {
                    crop: crop,
                    price: p.modal_price || p.max_price,
                    change: { percentage: (Math.random() * 5).toFixed(1), direction: Math.random() > 0.5 ? 'up' : 'down' },
                    market: p.district || p.market || fState
                  };
                }
                return null;
              })
              .catch(() => null)
          );
          const marketResults = (await Promise.all(marketPromises)).filter(Boolean);
          if (marketResults.length > 0) {
            setMarketData(marketResults);
          }
        } catch (e) {
          console.warn('Market fetch error', e);
        }

      } else {
        setDashboardData(getFallbackDashboardData());
      }
    } catch (error) {
      console.warn('Error fetching dashboard data (using fallback):', error);
      setDashboardData(getFallbackDashboardData());
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackDashboardData = () => {
    return {
      farmer: {
        name: profile.name || session.name || 'Farmer',
        crops: profile.crops || ['Rice', 'Coconut', 'Pepper'],
        state: profile.state || session.state || 'Kerala',
        district: profile.district || session.district || 'Ernakulam'
      },
      cropHealth: [
        { crop: 'Rice', status: 'Leaf Blast', severity: 'moderate', date: new Date().toISOString() },
        { crop: 'Coconut', status: 'Healthy', severity: 'none', date: new Date().toISOString() }
      ],
      marketPrices: [
        { crop: 'Rice', price: 2850, change: { percentage: 5.2, direction: 'up' }, market: 'Ernakulam' },
        { crop: 'Coconut', price: 12, change: { percentage: -2.1, direction: 'down' }, market: 'Ernakulam' },
        { crop: 'Pepper', price: 58000, change: { percentage: 8.7, direction: 'up' }, market: 'Ernakulam' }
      ],
      weather: null
    };
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [userId]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    let chart;
    async function initChart() {
      try {
        let echarts;
        try {
          echarts = await new Function('return import("echarts")')();
        } catch (err) {
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
        chart = (echarts.init ? echarts.init(chartRef.current) : (window as any).echarts.init(chartRef.current));

        const chartData = marketData.length > 0 ? generateChartData(marketData) : getDefaultChartData();

        const option = {
          color: ['#1ea055', '#89d7a0', '#66c184'],
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,36,22,0.95)', textStyle: { color: '#fff' } },
          legend: { show: true, data: chartData.legend, top: 0, left: 'center', itemGap: 24, textStyle: { color: '#066241' } },
          grid: { left: 40, right: 20, bottom: 20, top: 40 },
          xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], boundaryGap: false, axisLine: { lineStyle: { color: '#cfeee0' } }, axisLabel: { color: '#2b6b4a' } },
          yAxis: { type: 'value', axisLine: { lineStyle: { color: '#cfeee0' } }, axisLabel: { color: '#2b6b4a' }, splitLine: { lineStyle: { color: 'rgba(47,180,106,0.06)' } } },
          toolbox: { feature: { saveAsImage: {} } },
          series: chartData.series
        };
        chart.setOption(option);
      } catch (e) { }
    }
    initChart();
    const handleResize = () => { if (chart) chart.resize(); }
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); if (chart) chart.dispose && chart.dispose(); };
  }, [marketData]);

  const generateChartData = (marketPrices) => {
    const legend = marketPrices.map(item => item.crop);
    const series = marketPrices.map((item, index) => {
      const basePrice = item.price;
      const trendData = Array.from({ length: 7 }, (_, i) => {
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        return Math.round(basePrice * (1 + variation));
      });

      const colors = ['#1ea055', '#89d7a0', '#66c184', '#2fb46a', '#4ade80'];

      return {
        name: item.crop,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: trendData,
        areaStyle: { color: `rgba(47,180,106,${0.14 - index * 0.02})` },
        lineStyle: { color: colors[index] || '#1ea055', width: 3 - index * 0.5 }
      };
    });

    return { legend, series };
  };

  // Default chart data for fallback
  const getDefaultChartData = () => {
    return {
      legend: ['Rice', 'Coconut', 'Pepper'],
      series: [
        { name: 'Rice', type: 'line', smooth: true, showSymbol: false, data: [2850, 2860, 2840, 2850, 2870, 2880, 2890], areaStyle: { color: 'rgba(47,180,106,0.14)' }, lineStyle: { color: '#1ea055', width: 3 } },
        { name: 'Coconut', type: 'line', smooth: true, showSymbol: false, data: [11, 11.5, 11.8, 12, 11.9, 12.1, 12], areaStyle: { color: 'rgba(137,215,160,0.12)' }, lineStyle: { color: '#89d7a0', width: 2 } },
        { name: 'Pepper', type: 'line', smooth: true, showSymbol: false, data: [56000, 56500, 56300, 57000, 57200, 58000, 57800], areaStyle: { color: 'rgba(102,193,132,0.10)' }, lineStyle: { color: '#66c184', width: 2 } }
      ]
    };
  };

  // Weather state with API integration
  const [weather, setWeather] = useState({
    temp: 28,
    desc: 'Partly Cloudy',
    humidity: 75,
    wind: 12,
    icon: <FaCloud className="text-3xl text-emerald-600" />
  });

  // Update weather from dashboard data
  useEffect(() => {
    if (dashboardData?.weather) {
      setWeather({
        temp: dashboardData.weather.temp,
        desc: dashboardData.weather.desc,
        humidity: dashboardData.weather.humidity,
        wind: dashboardData.weather.wind,
        icon: getWeatherIcon(dashboardData.weather.desc)
      });
    }
  }, [dashboardData]);

  // Fetch weather data from API (kept as fallback if dashboard doesn't provide weather)
  useEffect(() => {
    if (!dashboardData?.weather) {
      const fetchWeatherData = async () => {
        try {
          const state = dashboardData?.farmer?.state || 'Kerala';
          const district = dashboardData?.farmer?.district || 'Thiruvananthapuram';

          // Fetch current weather data directly for the district and state
          let queryUrl = `/api/weather/current?district=${district}&state=${state}`;

          const response = await apiFetch(queryUrl);

          if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
          }

          const data = await response.json();

          // Update weather state with real data
          setWeather({
            temp: Math.round(data.main?.temp || 28),
            desc: data.weather?.[0]?.description || 'Partly Cloudy',
            humidity: data.main?.humidity || 75,
            wind: Math.round(data.wind?.speed || 12),
            icon: getWeatherIcon(data.weather?.[0]?.main)
          });
        } catch (error) {
          console.error('Failed to fetch weather data:', error);
          // Keep the default weather data on error
        }
      };

      if (dashboardData && !dashboardData.weather) {
        fetchWeatherData();
      }
    }
  }, [dashboardData]);

  // Generate AI content when dashboard data and weather are loaded
  useEffect(() => {
    if (dashboardData && weather.temp && !isLoading) {
      generateAIDashboardContent();
    }
  }, [dashboardData, weather.temp, isLoading]);

  // Helper function to get weather icon based on condition
  const getWeatherIcon = (weatherCode) => {
    if (!weatherCode) return <FaCloud className="text-3xl text-emerald-600" />;
    const code = weatherCode.toLowerCase();
    if (code.includes('clear')) return <FaCloud className="text-3xl text-amber-500" />;
    if (code.includes('cloud')) return <FaCloud className="text-3xl text-emerald-600" />;
    if (code.includes('rain')) return <FaTint className="text-3xl text-blue-500" />;
    if (code.includes('snow')) return <FaCloud className="text-3xl text-gray-300" />;
    if (code.includes('thunder')) return <FaExclamationTriangle className="text-3xl text-amber-500" />;
    if (code.includes('mist') || code.includes('fog')) return <FaCloud className="text-3xl text-gray-400" />;
    return <FaCloud className="text-3xl text-emerald-600" />;
  };

  // AI-generated government schemes
  const [schemes, setSchemes] = useState([
    {
      title: 'Loading schemes...',
      desc: 'Finding relevant agricultural schemes for your region...',
      statusType: 'loading',
      date: new Date().toLocaleDateString(),
      icon: <FaSync className="animate-spin text-gray-400 mr-1" />
    }
  ]);

  // AI-generated farming tips
  const [tips, setTips] = useState([
    {
      title: 'Loading...',
      desc: 'Getting personalized farming tips...',
      color: '#f3f4f6',
      border: '#d1d5db'
    }
  ]);

  // Generate AI-powered dashboard content
  const generateAIDashboardContent = async () => {
    if (!session.userId) return;

    try {
      // Generate personalized farming tips based on current conditions
      const userState = dashboardData?.farmer?.state || 'Kerala';
      const userDistrict = dashboardData?.farmer?.district || 'Ernakulam';

      const tipsPrompt = `Generate exactly 2 practical farming tips for a farmer in ${userDistrict}, ${userState}. Current weather: ${weather.desc}, humidity: ${weather.humidity}%, temperature: ${weather.temp}°C. Farmer grows: ${dashboardData?.farmer?.crops || 'rice, coconut'}. Keep each tip under 60 words with a catchy title. 

IMPORTANT: Respond ONLY with valid JSON array format:
[{"title": "Short Catchy Title", "desc": "Practical farming advice under 60 words"}]

No markdown, no explanations, just the JSON array.`;

      const tipsResponse = await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tipsPrompt,
          language: 'english',
          farmer_id: session.userId
        })
      });

      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json();
        try {
          let jsonText = tipsData.reply;

          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }

          // Try to parse the extracted JSON
          const parsedTips = JSON.parse(jsonText);
          if (Array.isArray(parsedTips) && parsedTips.length > 0) {
            setTips(parsedTips.map((tip, index) => ({
              ...tip,
              color: index % 2 === 0 ? '#fef9c3' : '#e0edff',
              border: index % 2 === 0 ? '#fde68a' : '#a5b4fc'
            })));
          } else {
            // If not an array, create fallback tips
            throw new Error('Invalid JSON structure');
          }
        } catch (parseError) {
          console.log('JSON parsing failed, creating fallback tips:', parseError);

          // Extract meaningful content from the response
          const tipText = tipsData.reply;

          // Try to extract individual tips from the text
          const lines = tipText.split('\n').filter(line => line.trim().length > 0);
          const extractedTips = [];

          let currentTitle = '';
          let currentDesc = '';

          for (const line of lines) {
            if (line.includes('title') || line.includes('Title')) {
              if (currentTitle && currentDesc) {
                extractedTips.push({
                  title: currentTitle,
                  desc: currentDesc,
                  color: extractedTips.length % 2 === 0 ? '#fef9c3' : '#e0edff',
                  border: extractedTips.length % 2 === 0 ? '#fde68a' : '#a5b4fc'
                });
              }
              currentTitle = line.replace(/["{},]/g, '').replace(/title\s*:\s*/i, '').trim();
              currentDesc = '';
            } else if (line.includes('desc') || line.includes('description')) {
              currentDesc = line.replace(/["{},]/g, '').replace(/desc\s*:\s*/i, '').replace(/description\s*:\s*/i, '').trim();
            }
          }

          // Add the last tip if exists
          if (currentTitle && currentDesc) {
            extractedTips.push({
              title: currentTitle,
              desc: currentDesc,
              color: extractedTips.length % 2 === 0 ? '#fef9c3' : '#e0edff',
              border: extractedTips.length % 2 === 0 ? '#fde68a' : '#a5b4fc'
            });
          }

          // If we extracted tips, use them; otherwise create a single fallback tip
          if (extractedTips.length > 0) {
            setTips(extractedTips);
          } else {
            setTips([
              {
                title: 'AI Farming Advice',
                desc: tipText.substring(0, 150).replace(/[{}"\[\]]/g, '') + '...',
                color: '#fef9c3',
                border: '#fde68a'
              }
            ]);
          }
        }
      }

      // Generate Government Schemes
      const schemesPrompt = `List exactly 3 active government agricultural schemes available for a farmer in ${userState}, India. Provide a brief 1-sentence description.

IMPORTANT: Respond ONLY with valid JSON array format:
[{"title": "Scheme Name", "desc": "Brief 1-sentence description", "statusType": "ok"}]

Use statusType: "ok" for all. No markdown, just JSON array.`;

      const schemesResponse = await apiFetch('/api/chatbot/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: schemesPrompt,
          language: 'english',
          farmer_id: session.userId
        })
      });

      if (schemesResponse.ok) {
        const schemesData = await schemesResponse.json();
        try {
          let jsonText = schemesData.reply;

          // Extract JSON from markdown code blocks if present
          const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }

          const parsedSchemes = JSON.parse(jsonText);
          if (Array.isArray(parsedSchemes) && parsedSchemes.length > 0) {
            setSchemes(parsedSchemes.map(scheme => ({
              ...scheme,
              date: new Date().toLocaleDateString(),
              icon: <FaLandmark className="text-emerald-600 mr-1" />
            })));
          } else {
            throw new Error('Invalid schemes JSON structure');
          }
        } catch (parseError) {
          console.log('Schemes JSON parsing failed, using fallback:', parseError);
          // Fallback scheme data
          setSchemes([
            {
              title: 'PM-KISAN Samman Nidhi',
              desc: 'Financial support of ₹6000 per year in three equal installments.',
              statusType: 'ok',
              date: new Date().toLocaleDateString(),
              icon: <FaLandmark className="text-emerald-600 mr-1" />
            },
            {
              title: 'Pradhan Mantri Fasal Bima Yojana',
              desc: 'Crop insurance scheme covering yield losses due to non-preventable risks.',
              statusType: 'ok',
              date: new Date().toLocaleDateString(),
              icon: <FaLandmark className="text-emerald-600 mr-1" />
            }
          ]);
        }
      }

    } catch (error) {
      console.error('Error generating AI dashboard content:', error);
      // Set fallback content
      setTips([
        {
          title: 'General Farming Tips',
          desc: 'Ensure proper irrigation and monitor for pests.',
          color: '#fef9c3',
          border: '#fde68a'
        },
        {
          title: 'Weather Alert',
          desc: `Current humidity: ${weather.humidity}%. Adjust watering accordingly.`,
          color: '#e0edff',
          border: '#a5b4fc'
        }
      ]);
    }
  };

  // Initial load of AI content when dashboard data & weather are ready
  useEffect(() => {
    if (dashboardData && weather && dashboardData.farmer.crops && tips.length === 0) {
      generateAIDashboardContent();
    }
  }, [dashboardData, weather]);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="w-full mb-8">
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden flex items-center gap-6">
              <div className="flex-1 relative z-10">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3">
                  Welcome {dashboardData?.farmer?.name || profile.name || session.name || 'Yashasvi'}!
                  <span className="text-green-900 bg-white/30 rounded-full p-2">
                    <FaLeaf size={24} />
                  </span>
                  {isLoading && (
                    <span className="text-sm font-medium text-green-100 flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                      <FaSync className="animate-spin" /> Loading...
                    </span>
                  )}
                </h2>
                <p className="text-green-50 text-lg mb-6 opacity-95 max-w-2xl">
                  {schemes.length > 0 && schemes[0].statusType !== 'loading' ?
                    <>
                      Found {schemes.length} <TranslatedText text="government schemes available in your region" />
                    </> :
                    <TranslatedText text="Discover government schemes and live dashboard insights" />
                  }
                </p>
                {lastUpdated && (
                  <p className="text-sm text-green-200/80 mb-2 flex items-center gap-4">
                    <span><TranslatedText text="Last updated" />: {lastUpdated.toLocaleTimeString()}</span>
                    <button
                      onClick={handleRefresh}
                      className="text-white hover:text-green-200 transition-colors flex items-center gap-2 font-medium"
                      disabled={isLoading}
                    >
                      <FaSync className={isLoading ? 'animate-spin' : ''} /> <TranslatedText text="Refresh" />
                    </button>
                  </p>
                )}
                <div className="flex gap-4 mt-6">
                  <button className="bg-white text-emerald-700 hover:bg-green-50 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2" onClick={() => window.location.hash = '#/detect'}>
                    <FaLeaf /> <TranslatedText text="Scan Leaf" />
                  </button>
                  <button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-xl font-bold transition-all backdrop-blur-sm flex items-center gap-2" onClick={() => window.location.hash = '#/chat'}>
                    💬 <TranslatedText text="Ask AI" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* â•â•â• Quick Stats Row â•â•â• */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Stat 1: Total Farms */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-green-500 rounded-l-2xl"></div>
              <div className="flex items-center justify-between">
                <div className="ml-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Farms</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData?.farms?.totalFarms ?? '—'}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">{dashboardData?.farms?.totalAcres?.toFixed(1) || 0} acres</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏠</div>
              </div>
            </div>

            {/* Stat 2: Activities */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-indigo-500 rounded-l-2xl"></div>
              <div className="flex items-center justify-between">
                <div className="ml-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Activities</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData?.activities?.thisMonth ?? '—'}</p>
                  <p className="text-xs text-purple-600 font-semibold mt-1 cursor-pointer hover:underline" onClick={() => window.location.hash = '#/activities'}>View all →</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📋</div>
              </div>
            </div>

            {/* Stat 3: Reminders */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-2xl"></div>
              <div className="flex items-center justify-between">
                <div className="ml-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reminders</p>
                  <p className="text-3xl font-black text-gray-800">{dashboardData?.reminders?.count ?? '—'}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-1 cursor-pointer hover:underline" onClick={() => window.location.hash = '#/reminders'}>Pending tasks</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🔔</div>
              </div>
            </div>

            {/* Stat 4: Weather Mini */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-blue-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden cursor-pointer" onClick={() => window.location.hash = '#/weather'}>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-cyan-500 rounded-l-2xl"></div>
              <div className="flex items-center justify-between">
                <div className="ml-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Weather</p>
                  <p className="text-3xl font-black text-gray-800">{weather.temp}°<span className="text-lg text-gray-400">C</span></p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">{weather.desc}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {weather.icon}
                </div>
              </div>
            </div>
          </div>

          {/* â•â•â• Recent Activities â•â•â• */}
          {dashboardData?.activities?.recent?.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                  📋 Recent Activities
                </h3>
                <button onClick={() => window.location.hash = '#/activities'}
                  className="text-purple-600 font-bold text-sm hover:text-purple-800 transition-colors bg-purple-50 px-4 py-1.5 rounded-full">
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardData.activities.recent.slice(0, 3).map((activity, idx) => {
                  const typeColors = {
                    sowing: 'from-green-400 to-emerald-500', irrigation: 'from-blue-400 to-cyan-500',
                    fertilizer: 'from-teal-400 to-green-500', pesticide: 'from-purple-400 to-indigo-500',
                    weeding: 'from-yellow-400 to-amber-500', harvesting: 'from-orange-400 to-red-500',
                    pest_issue: 'from-red-400 to-pink-500', disease_issue: 'from-rose-400 to-red-500',
                    other: 'from-gray-400 to-slate-500'
                  };
                  const typeIcons = {
                    sowing: '🌱', irrigation: '💧', fertilizer: '🌿', pesticide: '🚿',
                    weeding: '🌾', harvesting: '🌾', pest_issue: '🐛', disease_issue: '🦠', other: '📝'
                  };
                  const bg = typeColors[activity.activity_type] || typeColors.other;
                  const icon = typeIcons[activity.activity_type] || '📝';
                  return (
                    <div key={activity.id || activity._id || idx}
                      className="relative bg-gray-50/80 p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${bg} rounded-l-2xl`}></div>
                      <div className="flex items-start gap-3 ml-2">
                        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate capitalize">{activity.activity_type?.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{activity.text_note || 'No notes'}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {activity.farm_name && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">🏠 {activity.farm_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Three Main Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-gray-800">
            {/* Block 1: Government Schemes */}
            <div className="bg-emerald-50/60 rounded-3xl p-6 md:p-8 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6 text-emerald-800">
                <FaLandmark className="text-2xl" />
                <strong className="text-xl font-extrabold"><TranslatedText text="Government Schemes" /></strong>
              </div>
              {schemes.map((scheme, idx) => (
                <div key={idx} className="flex flex-col gap-1 mb-5 pb-5 border-b border-emerald-200/50 last:border-0 last:pb-0 last:mb-0">
                  <div className="flex items-start justify-between">
                    <span className="font-extrabold text-gray-900 text-base">{scheme.title}</span>
                  </div>
                  <span className="flex items-start text-sm text-emerald-800 mt-1 leading-snug">
                    {scheme.icon} <span className="ml-1">{scheme.desc}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Block 2: Today's Tips */}
            <div className="bg-amber-50/40 rounded-3xl p-6 md:p-8 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-6 text-amber-600">
                <FaLightbulb className="text-2xl" />
                <strong className="text-xl font-extrabold text-amber-900"><TranslatedText text="Today's Tips" /></strong>
              </div>
              {tips.map((tip, idx) => (
                <div key={idx} style={{
                  background: tip.color,
                  borderColor: tip.border,
                }} className="border rounded-2xl p-5 mb-4 last:mb-0 shadow-sm transition-transform hover:-translate-y-0.5">
                  <div className="font-extrabold text-gray-900 mb-2 truncate">{tip.title}</div>
                  <div className="text-sm text-gray-800 leading-relaxed font-medium">{tip.desc}</div>
                </div>
              ))}
            </div>

            {/* Block 3: Weather */}
            <div className="bg-blue-50/50 rounded-3xl p-6 md:p-8 shadow-sm border border-blue-100/80 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3 text-blue-700">
                    <FaCloud className="text-2xl" />
                    <strong className="text-xl font-extrabold text-blue-900"><TranslatedText text="Today's Weather" /></strong>
                  </div>
                  <button
                    onClick={() => window.location.hash = '#/weather'}
                    className="text-blue-600 text-sm font-bold hover:text-blue-800 transition-colors flex items-center bg-blue-100/50 px-3 py-1.5 rounded-full"
                  >
                    <TranslatedText text="View" />
                  </button>
                </div>
                <div className="flex items-end justify-between mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-gray-900 tracking-tighter">{weather.temp}°<span className="text-3xl font-bold text-gray-400">C</span></span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-5xl text-blue-500 mb-2">{weather.icon}</div>
                    <span className="text-base text-blue-800 font-bold">{weather.desc}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-blue-200/60 mt-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3 bg-white/60 p-3 rounded-2xl">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><FaTint className="text-lg" /></div>
                    <div>
                      <div className="text-xs text-blue-800/60 font-bold uppercase"><TranslatedText text="Humidity" /></div>
                      <div className="font-extrabold text-blue-900 text-lg">{weather.humidity}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 p-3 rounded-2xl">
                    <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><FaWind className="text-lg" /></div>
                    <div>
                      <div className="text-xs text-teal-800/60 font-bold uppercase"><TranslatedText text="Wind" /></div>
                      <div className="font-extrabold text-teal-900 text-lg">{weather.wind} km/h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* High Priority Reminders Section */}
          {highPriorityReminders.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 mt-8">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  🔴 High Priority Reminders
                  <span className="text-sm font-medium bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full">{highPriorityReminders.length}</span>
                </h3>
                <button
                  onClick={() => window.location.hash = '#/reminders'}
                  className="text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highPriorityReminders.slice(0, 6).map(reminder => {
                  const due = new Date(reminder.due_date);
                  const today = new Date();
                  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const overdue = due < today;

                  return (
                    <div
                      key={reminder.id || reminder._id}
                      className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${overdue ? 'border-l-red-500 bg-red-50/50 border border-red-100' : 'border-l-amber-500 bg-amber-50/30 border border-amber-100'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-800 text-sm leading-tight flex-1">{reminder.title}</h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${overdue ? 'bg-red-100 text-red-600' : diffDays <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {overdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Today' : `${diffDays}d left`}
                        </span>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{reminder.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await apiFetch(`/api/reminders/${reminder.id || reminder._id}/mark_completed/`, { method: 'POST' });
                              setHighPriorityReminders(prev => prev.filter(r => (r.id || r._id) !== (reminder.id || reminder._id)));
                            } catch (err) { console.error(err); }
                          }}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          ✓ Complete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Smart Recommendations Section */}
          <SmartRecommendations dashboardData={dashboardData} weather={weather} />

          {/* Market Prices Section */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 md:p-8 mt-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                📈 <TranslatedText text="Market Prices" />
              </h3>
              <button
                onClick={() => window.location.hash = '#/market'}
                className="text-emerald-600 font-bold text-sm hover:text-emerald-800 transition-colors bg-emerald-100/50 px-4 py-2 rounded-full"
              >
                View All Markets
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {marketData.length > 0 ? marketData.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-2 h-full ${item.change?.direction === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                  <div className="text-sm text-slate-500 font-extrabold uppercase tracking-wide mb-2">{item.crop}</div>
                  <div className="text-3xl font-black text-slate-800 mb-2">₹{item.price}</div>
                  <div className="flex justify-between items-end mt-4">
                    <div className={`text-sm font-extrabold flex items-center gap-1 ${item.change?.direction === 'up' ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg' : 'text-red-600 bg-red-50 px-2 py-1 rounded-lg'}`}>
                      {item.change?.direction === 'up' ? '↗' : '↘'} {item.change?.direction === 'up' ? '+' : ''}{item.change?.percentage}%
                    </div>
                    <div className="text-xs text-slate-400 font-bold uppercase text-right">
                      {item.market}
                    </div>
                  </div>
                </div>
              )) : (
                // Fallback data
                <>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400"></div>
                    <div className="text-sm text-slate-500 font-extrabold uppercase tracking-wide mb-2">Rice</div>
                    <div className="text-3xl font-black text-slate-800 mb-2">₹2850</div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">↗ +5.2%</div>
                      <div className="text-xs text-slate-400 font-bold uppercase text-right">Ernakulam</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-red-400"></div>
                    <div className="text-sm text-slate-500 font-extrabold uppercase tracking-wide mb-2">Coconut</div>
                    <div className="text-3xl font-black text-slate-800 mb-2">₹12</div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-sm font-extrabold text-red-600 bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1">↘ -2.1%</div>
                      <div className="text-xs text-slate-400 font-bold uppercase text-right">Ernakulam</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400"></div>
                    <div className="text-sm text-slate-500 font-extrabold uppercase tracking-wide mb-2">Pepper</div>
                    <div className="text-3xl font-black text-slate-800 mb-2">₹58000</div>
                    <div className="flex justify-between items-end mt-4">
                      <div className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">↗ +8.7%</div>
                      <div className="text-xs text-slate-400 font-bold uppercase text-right">Ernakulam</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-full h-72 rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm p-2" ref={chartRef} />
          </div>
        </div>
      </main>
    </div>

  );
}
