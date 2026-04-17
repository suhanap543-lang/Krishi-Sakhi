import React, { useEffect, useState } from 'react';
import ConsultantLogin from './pages/ConsultantLogin';
import ConsultantDashboard from './pages/ConsultantDashboard';
import VideoCall from './pages/VideoCall';

function getRoute() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/dashboard')) return '/dashboard';
  if (h.startsWith('/video-call')) return '/video-call';
  return '/';
}

function getQueryParams() {
  const h = window.location.hash;
  const qIndex = h.indexOf('?');
  if (qIndex === -1) return {};
  const params = new URLSearchParams(h.substring(qIndex));
  return Object.fromEntries(params.entries());
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Check if consultant is logged in
  const isLoggedIn = (() => {
    try {
      return Boolean(JSON.parse(localStorage.getItem('consultant_session') || 'null'));
    } catch {
      return false;
    }
  })();

  let page = null;
  switch (route) {
    case '/dashboard':
      if (!isLoggedIn) {
        window.location.hash = '#/';
        page = <ConsultantLogin />;
      } else {
        page = <ConsultantDashboard />;
      }
      break;
    case '/video-call': {
      const params = getQueryParams();
      page = <VideoCall roomId={params.room} consultationId={params.cid} />;
      break;
    }
    default:
      page = <ConsultantLogin />;
      break;
  }

  return <>{page}</>;
}
