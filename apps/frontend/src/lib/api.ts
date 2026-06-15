import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function getToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();

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

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // No Content-Type — browser sets multipart/form-data with boundary automatically
    },
    body: formData,
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
  upload: <T>(path: string, formData: FormData) => uploadRequest<T>(path, formData),
};
