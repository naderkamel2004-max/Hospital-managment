const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export async function apiRequest(path, options = {}) {
 const headers = {};
 if (options.body) headers['Content-Type'] = 'application/json';
 if (options.token) headers.Authorization = 'Bearer ' + options.token;
 let response;
 try {
  response = await fetch(API_BASE.replace(/\/$/, '') + path, {
   method: options.method || 'GET', headers, credentials: 'include',
   ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
 } catch (cause) {
  const error = new Error(cause.message || 'Network request failed'); error.status = 0; throw error;
 }
 const payload = await response.json().catch(() => ({}));
 if (!response.ok) { const error = new Error(payload.error || 'Request failed'); error.status = response.status; throw error; }
 return payload;
}
