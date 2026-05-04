const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const SUPABASE_PROJECT = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] ?? '';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT}-auth-token`);
    if (!raw) return null;
    return JSON.parse(raw)?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
