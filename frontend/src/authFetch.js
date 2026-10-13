const USER_KEY = 'rdadmin_user';
const ACTIVITY_KEY_PREFIX = 'rdadmin_last_activity';

const isApiUrl = (url) => {
  if (typeof url !== 'string') return false;
  if (url.startsWith('/api/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    const base = import.meta.env.VITE_API_URL;
    return parsed.pathname.startsWith('/api/') && (parsed.origin === window.location.origin || (base && url.startsWith(base)));
  } catch {
    return false;
  }
};

const getToken = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null')?.token || null; } catch { return null; }
};

// Agrega el token de sesión a todas las llamadas a /api y cierra la sesión si el servidor responde 401.
export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (!isApiUrl(url)) return originalFetch(input, init);

    const token = getToken();
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = await originalFetch(input, { ...init, headers });
    const isLogin = url.includes('/api/users/login');
    if (response.status === 401 && !isLogin && token) {
      localStorage.removeItem(USER_KEY);
      Object.keys(localStorage).filter(k => k.startsWith(ACTIVITY_KEY_PREFIX)).forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
    return response;
  };
}
