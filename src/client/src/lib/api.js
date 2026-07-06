/**
 * API 客户端抽象层
 * 多后端架构：每个后端独立的 baseURL + 拦截器
 * 当前只启用 radarApi，未来可加 crmApi 等
 */
import { supabase } from './supabase.js';

function createApiClient({ baseURL, getToken }) {
  async function request(method, path, { body, params, headers: extraHeaders } = {}) {
    // 拼接 baseURL + path
    let url = `${baseURL}${path}`;

    // 追加 query params
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }

    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    const token = getToken ? await getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetchOpts = { method, headers };
    if (body && method !== 'GET') fetchOpts.body = JSON.stringify(body);

    const res = await fetch(url, fetchOpts);
    const json = await res.json();

    if (!res.ok) {
      // 401 = token expired or invalid -> clear session and reload
      if (res.status === 401) {
        try {
          const { supabase } = await import('./supabase.js');
          await supabase.auth.signOut();
        } catch (e) { void e; }
        window.location.href = '/login';
        return; // unreachable but satisfies flow
      }
      const err = new Error(json.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = json;
      throw err;
    }
    return json;
  }

  return {
    get: (path, opts) => request('GET', path, opts),
    post: (path, opts) => request('POST', path, opts),
    put: (path, opts) => request('PUT', path, opts),
    delete: (path, opts) => request('DELETE', path, opts),
  };
}

// ── 客户雷达 API ──────────────────────────────────────────
export const radarApi = createApiClient({
  baseURL: import.meta.env.VITE_RADAR_API || '/api',
  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  },
});

// ── 800客 CRM API（预留，暂不启用）────────────────────────
// export const crmApi = createApiClient({
//   baseURL: import.meta.env.VITE_CRM_API || '',
//   getToken: async () => localStorage.getItem('crm_token'),
// });
