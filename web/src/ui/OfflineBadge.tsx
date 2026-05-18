import { useEffect, useState } from 'react';

export function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online
    ? <span className="netbadge online" title="Online">● online</span>
    : <span className="netbadge offline" title="Running locally — no network">● offline — running locally</span>;
}
