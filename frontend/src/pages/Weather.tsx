import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';
import { INDIAN_STATES } from '../utils/india-data';

export default function Weather() {
  const [current, setCurrent] = useState(null);
  const [daily, setDaily] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('daily');
  const [expandedDay, setExpandedDay] = useState(null);
  const [selectedState, setSelectedState] = useState('Kerala');
  const [selectedDistrict, setSelectedDistrict] = useState('Thiruvananthapuram');

  // Load user location preference
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('ammachi_session') || '{}');
      if (session.state) setSelectedState(session.state);
      if (session.district) setSelectedDistrict(session.district);
    } catch (e) { }
  }, []);

  const states = Object.keys(INDIAN_STATES).sort();
  const districts = INDIAN_STATES[selectedState]?.sort() || [];

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const d = encodeURIComponent(selectedDistrict);
        const s = encodeURIComponent(selectedState);

        const promises = [
          apiFetch(`/api/weather/current?district=${d}&state=${s}`),
          apiFetch(`/api/weather/daily?district=${d}&state=${s}`),
          apiFetch(`/api/weather/hourly?district=${d}&state=${s}`)
        ];

        const results = await Promise.allSettled(promises);
        if (!mounted) return;

        const failedRequests = results.filter(r => r.status === 'rejected');
        if (failedRequests.length > 0) {
          console.warn(`${failedRequests.length} API requests failed:`, failedRequests);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(load, 1000);
            return;
          } else {
            throw new Error(`Failed to fetch weather data after ${maxRetries} attempts`);
          }
        }

        const responses = results.map(r => (r as any).value);
        const failedResponses = responses.filter(res => !res.ok);

        if (failedResponses.length > 0) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(load, 1000);
            return;
          } else {
            throw new Error(`API returned error status codes`);
          }
        }

        const [curRes, dailyRes, hourlyRes] = responses;

        const parseJsonSafely = async (response, fallbackValue = {}) => {
          try {
            return await response.json();
          } catch (e) {
            console.error('Failed to parse JSON response', e);
            return fallbackValue;
          }
        };

        const [curJson, dailyJson, hourlyJson] = await Promise.all([
          parseJsonSafely(curRes),
          parseJsonSafely(dailyRes),
          parseJsonSafely(hourlyRes)
        ]);

        setCurrent(curJson);
        setDaily(dailyJson.list ? dailyJson.list.slice(0, 7) : []);
        setHourly(hourlyJson.list ? hourlyJson.list.slice(0, 24) : []);

        retryCount = 0;
      } catch (e) {
        console.error('Weather fetch failed', e);
        setError(e.message || 'Failed to fetch weather data. Please try again later.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (selectedState && selectedDistrict) {
      load();
    }
    return () => { mounted = false; };
  }, [selectedState, selectedDistrict]);


  const formatTemp = (t) => (t ? `${Math.round(t)}°C` : '—');
  const popPercent = (d) => {
    if (!d) return '';
    if (typeof d.pop === 'number') return `${Math.round(d.pop * 100)}%`;
    if (d.rain) return `${Math.round(d.rain)}%`;
    return '';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getWeatherIcon = (weatherCode) => {
    if (!weatherCode) return '☁️';
    const code = weatherCode.toLowerCase();
    if (code.includes('clear')) return '☀';
    if (code.includes('cloud')) return '☁️';
    if (code.includes('rain')) return '🌧';
    if (code.includes('snow')) return '❄️';
    if (code.includes('thunder')) return '⚡';
    if (code.includes('mist') || code.includes('fog')) return '🌫';
    return '☁️';
  };

  const getFarmingTip = (dayData) => {
    if (!dayData) return '';
    const temp = dayData.temp || dayData.main?.temp;
    const humidity = dayData.humidity || dayData.main?.humidity;
    const pop = dayData.pop || 0;
    const windSpeed = dayData.wind?.speed || 0;

    if (pop > 0.7) return '🌧 Heavy rain expected - Avoid field work';
    if (pop > 0.4) return '🌦 Light rain - Good for watering, avoid harvesting';
    if (temp > 35) return '☀ Hot day - Water early morning or evening';
    if (temp < 15) return '❄️ Cool day - Good for planting and transplanting';
    if (humidity > 80) return '💧 High humidity - Watch for fungal diseases';
    if (windSpeed > 5) return '💨 Windy conditions - Secure crops and equipment';
    return '🌱 Good weather for farming activities';
  };

  const toggleDayExpansion = (dayIndex) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };


  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">

        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Weather Forecast</h1>
            <p className="text-gray-500 mt-1">7-day weather prediction with farming advisories</p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict(INDIAN_STATES[e.target.value]?.[0] || '');
              }}
              className="bg-blue-50 border-blue-100 text-blue-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-bold"
            >
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-blue-50 border-blue-100 text-blue-800 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-bold"
            >
              {districts.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        </header>


        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-gray-500"><TranslatedText text="Loading weather data for" /> {selectedDistrict}...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="text-2xl">⚠</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-1"><TranslatedText text="Error" /></h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="text-sm text-red-700 bg-red-100/50 p-4 rounded-xl">
                <p className="font-semibold mb-2"><TranslatedText text="Please ensure" />:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><TranslatedText text="Backend server is running at" /> http://localhost:8000</li>
                  <li>OPENWEATHER_API_KEY <TranslatedText text="is properly set in the backend .env file" /></li>
                  <li><TranslatedText text="Your internet connection is working" /></li>
                </ul>
                <button
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  onClick={() => window.location.reload()}
                >
                  <TranslatedText text="Retry" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Current Weather Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-blue-500/20 lg:col-span-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h2 className="text-xl font-medium opacity-90"><TranslatedText text="Current Weather" /></h2>
                    <p className="text-3xl font-bold mt-1">{selectedDistrict}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-80"><TranslatedText text="Updated" /></p>
                    <p className="font-medium">{current ? new Date(current.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="text-center md:text-left">
                    <div className="text-6xl md:text-7xl mb-2 filter drop-shadow-lg animate-pulse" style={{ animationDuration: '3s' }}>
                      {current ? getWeatherIcon(current.weather?.[0]?.main) : '☁️'}
                    </div>
                    <div className="text-5xl md:text-6xl font-bold tracking-tight">
                      {current ? formatTemp(current.main?.temp) : '—'}
                    </div>
                    <div className="text-lg opacity-90 mt-1 capitalize font-medium">
                      {current ? `${current.weather?.[0]?.description || ''}` : '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:text-right">
                    <div>
                      <p className="text-sm opacity-70"><TranslatedText text="Humidity" /></p>
                      <p className="text-xl font-bold">{current ? `${current.main?.humidity}%` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-70"><TranslatedText text="Wind" /></p>
                      <p className="text-xl font-bold">{current ? `${current.wind?.speed} m/s` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-70"><TranslatedText text="Pressure" /></p>
                      <p className="text-xl font-bold">{current ? `${current.main?.pressure} hP` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-70"><TranslatedText text="Rain Chance" /></p>
                      <p className="text-xl font-bold">{daily && daily[0] ? popPercent(daily[0]) : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>


              {/* Advisories Card */}
              <aside className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg text-lg">💡</span>
                  <TranslatedText text="Farming Advisories" />
                </h3>

                <div className="space-y-4 flex-1">
                  {current && current.main?.humidity > 70 ? (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-sm text-blue-800 leading-relaxed">
                        <strong><TranslatedText text="Watering Advisory" />:</strong> <TranslatedText text="Reduce watering today due to high humidity" /> ({current.main?.humidity}%).
                        {daily && daily[0]?.pop > 0.3 ? ' ' + <TranslatedText text="Rain expected tomorrow" /> : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        <strong><TranslatedText text="Watering Advisory" />:</strong> {current ? <><TranslatedText text="Current humidity is" /> {current.main?.humidity}%. </> : ''}<TranslatedText text="Regular watering recommended" />.
                      </p>
                    </div>
                  )}

                  {current && current.main?.humidity > 75 && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-sm text-red-800 leading-relaxed">
                        <strong><TranslatedText text="Pest Alert" />:</strong> <TranslatedText text="High humidity may increase fungal diseases. Monitor crops closely" />.
                      </p>
                    </div>
                  )}

                  {daily && daily.slice(0, 3).every(d => !d.pop || d.pop < 0.4) && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-sm text-amber-800 leading-relaxed">
                        <strong><TranslatedText text="Harvesting Window" />:</strong> <TranslatedText text="Good weather conditions for harvesting in the next few days" />.
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>


            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button
                  className={`flex-1 py-4 text-sm font-bold text-center transition-all ${activeTab === 'daily' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('daily')}
                >
                  <TranslatedText text="7-Day Forecast" />
                </button>
                <button
                  className={`flex-1 py-4 text-sm font-bold text-center transition-all ${activeTab === 'hourly' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                  onClick={() => setActiveTab('hourly')}
                >
                  <TranslatedText text="Hourly Forecast" />
                </button>
              </div>


              <div className="p-6">
                {activeTab === 'daily' && (
                  <div className="space-y-4">
                    {(daily.length ? daily : Array.from({ length: 7 })).map((d, i) => {
                      const timestamp = d?.dt || Math.floor(Date.now() / 1000);
                      const isExpanded = expandedDay === i;
                      const temp = d?.temp || d?.main?.temp;
                      const tempMax = d?.temp_max || d?.main?.temp_max;
                      const tempMin = d?.temp_min || d?.main?.temp_min;
                      const isHot = temp > 30;

                      return (
                        <div
                          key={i}
                          className={`bg-gray-50 rounded-2xl p-4 transition-all duration-300 border border-transparent ${isExpanded ? 'bg-white shadow-md border-emerald-100' : 'hover:bg-gray-100'}`}
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleDayExpansion(i)}
                          >
                            <div className="flex items-center gap-4 w-1/3">
                              <div className="w-10 h-10 flex items-center justify-center text-2xl bg-white rounded-full shadow-sm">
                                {getWeatherIcon(d?.weather?.[0]?.main)}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800">{i === 0 ? 'Today' : new Date(timestamp * 1000).toLocaleDateString(undefined, { weekday: 'short' })}</h4>
                                <p className="text-xs text-gray-500 capitalize">{d?.weather?.[0]?.main || 'Cloudy'}</p>
                              </div>
                            </div>

                            <div className="flex-1 px-4 hidden md:block">
                              {(tempMax || tempMin) && (
                                <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden w-full max-w-[200px] mx-auto">
                                  <div
                                    className={`absolute top-0 bottom-0 rounded-full ${isHot ? 'bg-gradient-to-r from-amber-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-emerald-400'}`}
                                    style={{
                                      left: '0%',
                                      width: tempMax && tempMin ? `${Math.min(100, Math.max(0, ((temp - tempMin) / (tempMax - tempMin)) * 100))}%` : '50%'
                                    }}
                                  ></div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-6 w-1/3 justify-end">
                              {popPercent(d) && (
                                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                                  🌧 {popPercent(d)}
                                </div>
                              )}
                              <div className="text-right">
                                <span className="text-lg font-bold text-gray-800">{temp ? `${Math.round(temp)}°` : '—'}</span>
                                <span className="text-sm text-gray-400 ml-1">C</span>
                              </div>
                              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-gray-400`}>▼</div>
                            </div>
                          </div>


                          {isExpanded && (
                            <div className="mt-6 pt-4 border-t border-gray-100 animate-fade-in">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                  <h5 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                    🌾 Farming Tip
                                  </h5>
                                  <p className="text-sm text-emerald-700 font-medium">
                                    {getFarmingTip(d)}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Max Temp</p>
                                    <p className="font-bold text-gray-800">↑ {tempMax ? `${Math.round(tempMax)}°C` : '—'}</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Min Temp</p>
                                    <p className="font-bold text-gray-800">↓ {tempMin ? `${Math.round(tempMin)}°C` : '—'}</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Description</p>
                                    <p className="font-bold text-gray-800 capitalize">{d?.weather?.[0]?.description}</p>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">UV Index</p>
                                    <p className={`font-bold ${temp > 30 ? 'text-red-500' : temp > 25 ? 'text-amber-500' : 'text-green-500'}`}>
                                      {temp > 30 ? 'High' : temp > 25 ? 'Moderate' : 'Low'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}


                {activeTab === 'hourly' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const now = new Date();
                      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                      const timestamp = Math.floor(startOfDay.getTime() / 1000) + i * 3600;
                      const hourlyData = hourly[i] || null;

                      return (
                        <div key={i} className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                          <div className="text-sm font-bold text-gray-600 mb-2">{formatTime(timestamp)}</div>
                          <div className="text-3xl mb-2">{getWeatherIcon(hourlyData?.weather?.[0]?.main)}</div>
                          <div className="text-lg font-bold text-gray-800 mb-1">{hourlyData?.main?.temp ? `${Math.round(hourlyData.main.temp)}°` : '—'}</div>

                          <div className="text-xs text-center text-gray-500 mb-2 capitalize">{hourlyData?.weather?.[0]?.main || 'Cloudy'}</div>

                          {popPercent(hourlyData) && (
                            <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              ☔ {popPercent(hourlyData)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
