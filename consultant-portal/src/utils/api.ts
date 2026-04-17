// Use relative URL so Vite proxy handles routing to the backend and avoids CORS issues
const API_BASE = '';

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE + path;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), options);
}
