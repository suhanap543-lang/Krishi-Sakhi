import React, { useEffect, useMemo, useState } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Market from './pages/Market';
import Weather from './pages/Weather';
import Detect from './pages/Detect';
import Chat from './pages/Chat';
import Farms from './pages/Farms';
import Activities from './pages/Activities';
import Reminders from './pages/Reminders';
import FarmerProfile from './pages/FarmerProfile';
import Officers from './pages/Officers';
import Feedback from './pages/Feedback';
import Schemes from './pages/Schemes';
import SmartRecommendationsPage from './pages/SmartRecommendationsPage';
import SoilHealth from './pages/SoilHealth';
import FarmerVideoCall from './pages/FarmerVideoCall';
import MobileNav from './components/MobileNav';
import { LanguageProvider } from './context/LanguageContext';

function getRoute() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/login')) return '/login';
  if (h.startsWith('/signup')) return '/signup';
  if (h.startsWith('/dashboard')) return '/dashboard';
  if (h.startsWith('/chat')) return '/chat';
  if (h.startsWith('/market')) return '/market';
  if (h.startsWith('/weather')) return '/weather';
  if (h.startsWith('/detect')) return '/detect';
  if (h.startsWith('/profile')) return '/profile';
  if (h.startsWith('/farms')) return '/farms';
  if (h.startsWith('/activities')) return '/activities';
  if (h.startsWith('/reminders')) return '/reminders';
  if (h.startsWith('/farmers')) return '/farmers';
  if (h.startsWith('/officers')) return '/officers';
  if (h.startsWith('/officers')) return '/officers';
  if (h.startsWith('/feedback')) return '/feedback';
  if (h.startsWith('/smart-recommendations')) return '/smart-recommendations';
  if (h.startsWith('/soil-health')) return '/soil-health';
  if (h.startsWith('/schemes')) return '/schemes';
  if (h.startsWith('/video-call')) return '/video-call';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const isAuthed = useMemo(() => {
    try { return Boolean(JSON.parse(localStorage.getItem('ammachi_session') || 'null')); } catch { return false; }
  }, [route]);

  // Authentication removed: allow access to all routes without redirects

  let page = null;
  switch (route) {
    case '/login':
      page = <Login />; break;
    case '/signup':
      page = <SignUp />; break;
    case '/dashboard':
      page = <Dashboard />; break;
    case '/market':
      page = <Market />; break;
    case '/weather':
      page = <Weather />; break;
    case '/detect':
      page = <Detect />; break;
    case '/chat':
      page = <Chat />; break;
    case '/profile':
      page = <Profile />; break;
    case '/farms':
      page = <Farms />; break;
    case '/activities':
      page = <Activities />; break;
    case '/reminders':
      page = <Reminders />; break;
    case '/farmers':
      page = <FarmerProfile />; break;
    case '/officers':
      page = <Officers />; break;
    case '/feedback':
      page = <Feedback />; break;
    case '/smart-recommendations':
      page = <SmartRecommendationsPage />; break;
    case '/soil-health':
      page = <SoilHealth />; break;
    case '/schemes':
      page = <Schemes />; break;
    case '/video-call':
      page = <FarmerVideoCall />; break;
    default:
      page = <Landing />; break;
  }

  return (
    <LanguageProvider>
      {page}
      <MobileNav />
    </LanguageProvider>
  );
}
