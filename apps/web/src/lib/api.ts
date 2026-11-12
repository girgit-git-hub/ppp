const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const API_URL = API;

async function json(response: Response) {
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {error: text}; }
  if (!response.ok) throw new Error(body.error || `API request failed (HTTP ${response.status})`);
  return body;
}
async function request(path: string, init?: RequestInit) {
  try { return await json(await fetch(`${API}${path}`, init)); }
  catch (error) {
    if (error instanceof TypeError) throw new Error(`Cannot reach the API at ${API}. Check that the backend is running, CORS is configured, and VITE_API_URL is correct.`);
    throw error;
  }
}
export const getTasks = () => request('/api/tasks');
export const verifyTask = (id: string) => request(`/api/tasks/${encodeURIComponent(id)}/verify`, {method:'POST'});
export const payoutTask = (id: string) => request(`/api/tasks/${encodeURIComponent(id)}/payout`, {method:'POST'});
export const agentQuery = (query: string) => request('/api/agent/query', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})});
export async function uploadEvidence(id: string, file: File) {
  const data = new FormData(); data.append('file', file);
  return request(`/api/tasks/${encodeURIComponent(id)}/evidence`, {method:'POST',body:data});
}

// Local demo routes are deliberately unavailable when NODE_ENV=production.
export type DemoTaskInput = {
  title: string;
  description: string;
  amount: number;
  requiredProduct?: string;
  latitude?: number;
  longitude?: number;
};
export const createDemoTask = (task: DemoTaskInput) => request('/api/demo/tasks', {
  method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(task),
});
export const bootstrapDemoTasks = () => request('/api/demo/bootstrap', {method:'POST'});
