const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const COURSE_MATERIALS_BUCKET = 'course-materials';
export const AVATARS_BUCKET = 'avatars';

export function getPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

// Encode each path segment individually, preserving '/' as folder separators
function encodePath(storagePath: string): string {
  return storagePath.split('/').map(encodeURIComponent).join('/');
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: await file.arrayBuffer(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${text}`);
  }
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    throw new Error(`Failed to get signed URL: ${res.status}`);
  }
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}
