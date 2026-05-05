// lib/api.js
// Semua request ke GAS diproksikan lewat /api/gas (Next.js server-side).

const AUTH_STORAGE_KEY = 'drivegram_auth';

export function getAuthSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveAuthSession(session) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthToken() {
  return getAuthSession()?.token || '';
}

async function parseProxyResponse(res) {
  const text = await res.text();
  if (!text?.trim()) {
    throw new Error(`Response kosong dari server (${res.status})`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Bukan JSON: ' + text.slice(0, 200));
  }

  if (!res.ok) {
    throw new Error(data.error || `Request gagal (${res.status})`);
  }

  return data;
}

function driveThumbnailUrl(fileId, size = 600) {
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w${size}` : '';
}

function proxiedImageUrl(fileId, size = 600) {
  const token = getAuthToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return fileId ? `/api/image?id=${encodeURIComponent(fileId)}&size=${size}${tokenParam}` : '';
}

function driveOpenUrl(fileId) {
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : '';
}

function normalizePhoto(photo) {
  if (!photo) return photo;
  return {
    ...photo,
    tags: Array.isArray(photo.tags)
      ? photo.tags
      : String(photo.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    thumbnailUrl: proxiedImageUrl(photo.fileId, 600) || driveThumbnailUrl(photo.fileId, 600) || photo.thumbnailUrl,
    directUrl: proxiedImageUrl(photo.fileId, 1600) || driveThumbnailUrl(photo.fileId, 1600) || photo.directUrl || photo.thumbnailUrl,
    driveUrl: photo.driveUrl || driveOpenUrl(photo.fileId),
  };
}

async function proxyGet(params = {}) {
  const url = new URL('/api/gas', window.location.origin);
  const token = getAuthToken();
  if (token && params.token === undefined) {
    url.searchParams.set('token', token);
  }

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { cache: 'no-store' });
  return parseProxyResponse(res);
}

async function proxyPost(data, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getAuthToken();
  const payload = token && data.token === undefined ? { ...data, token } : data;

  try {
    const res = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    return parseProxyResponse(res);
  } finally {
    clearTimeout(timer);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('Gagal membaca file sebagai base64'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function getMimeType(file) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

export async function registerUser({ name, email, password }) {
  const result = await proxyPost({ action: 'register', name, email, password });
  if (result.success && result.token) {
    saveAuthSession({ token: result.token, user: result.user, expiresAt: result.expiresAt });
  }
  return result;
}

export async function loginUser({ email, password }) {
  const result = await proxyPost({ action: 'login', email, password });
  if (result.success) {
    saveAuthSession({ token: result.token, user: result.user, expiresAt: result.expiresAt });
  }
  return result;
}

export async function logoutUser() {
  try {
    await proxyPost({ action: 'logout' });
  } finally {
    clearAuthSession();
  }
}

export async function getMe() {
  const result = await proxyGet({ action: 'getMe' });
  if (result.success) {
    const current = getAuthSession();
    if (current?.token) {
      saveAuthSession({ ...current, user: result.user });
    }
  }
  return result;
}

export async function listUsers() {
  return proxyGet({ action: 'listUsers' });
}

export async function setUserApproval(id, status) {
  return proxyPost({ action: 'setUserApproval', id, status });
}

export async function setUserRole(id, role) {
  return proxyPost({ action: 'setUserRole', id, role });
}

export async function getPhotos({ page = 1, limit = 20, tag = '', search = '' } = {}) {
  const result = await proxyGet({ action: 'getPhotos', page, limit, tag, search });
  if (result.success && Array.isArray(result.photos)) {
    result.photos = result.photos.map(normalizePhoto);
  }
  return result;
}

export async function getPhoto(id) {
  const result = await proxyGet({ action: 'getPhoto', id });
  if (result.success && result.photo) {
    result.photo = normalizePhoto(result.photo);
  }
  return result;
}

export async function uploadPhoto(file, caption = '', tags = '') {
  const base64 = await fileToBase64(file);
  const result = await proxyPost({
    action: 'uploadPhoto',
    filename: file.name,
    mimeType: getMimeType(file),
    base64,
    caption,
    tags,
  });
  if (result.success && result.photo) {
    result.photo = normalizePhoto(result.photo);
  }
  return result;
}

export async function deletePhoto(id) {
  return proxyPost({ action: 'deletePhoto', id });
}

export async function updatePhoto(id, { caption, tags }) {
  return proxyPost({ action: 'updatePhoto', id, caption, tags });
}

export async function getStats() {
  return proxyGet({ action: 'getStats' });
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  const mo = Math.floor(d / 30);
  if (s < 60) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  if (h < 24) return `${h} jam lalu`;
  if (d < 7) return `${d} hari lalu`;
  if (w < 4) return `${w} minggu lalu`;
  if (mo < 12) return `${mo} bulan lalu`;
  return `${Math.floor(mo / 12)} tahun lalu`;
}
