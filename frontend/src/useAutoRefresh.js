import { useEffect, useRef } from 'react';

export default function useAutoRefresh(refresh, { enabled = true, intervalMs = 5000, immediate = false } = {}) {
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    const runRefresh = async () => {
      if (!active || document.visibilityState === 'hidden' || runningRef.current) return;
      runningRef.current = true;
      try {
        await refreshRef.current({ silent: true });
      } catch (error) {
        console.error('No se pudieron sincronizar los datos automáticamente:', error);
      } finally {
        runningRef.current = false;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') runRefresh();
    };
    const interval = window.setInterval(runRefresh, intervalMs);
    if (immediate) runRefresh();
    window.addEventListener('focus', runRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', runRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, immediate]);
}
