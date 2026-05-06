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
  return fileId ? `/api/image?id=${encodeURIComponent(fileId)}&size=${size}` : '';
}

export function getProxiedImageUrl(fileId, size = 600, options = {}) {
  if (!fileId) return '';
  const params = new URLSearchParams({
    id: fileId,
    size: String(size),
  });
  if (options.download) params.set('download', '1');
  if (options.filename) params.set('filename', options.filename);
  return `/api/image?${params.toString()}`;
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
    thumbnailUrl: proxiedImageUrl(photo.fileId, 360) || driveThumbnailUrl(photo.fileId, 360) || photo.thumbnailUrl,
    directUrl: proxiedImageUrl(photo.fileId, 1600) || driveThumbnailUrl(photo.fileId, 1600) || photo.directUrl || photo.thumbnailUrl,
    driveUrl: photo.driveUrl || driveOpenUrl(photo.fileId),
  };
}

function normalizeUser(user) {
  if (!user) return user;
  return {
    ...user,
    profilePhotoUrl: proxiedImageUrl(user.profilePhotoFileId, 240) || user.profilePhotoUrl || '',
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
  if (result.user) result.user = normalizeUser(result.user);
  if (result.success && result.token) {
    saveAuthSession({ token: result.token, user: result.user, expiresAt: result.expiresAt });
  }
  return result;
}

export async function loginUser({ email, password }) {
  const result = await proxyPost({ action: 'login', email, password });
  if (result.user) result.user = normalizeUser(result.user);
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

export async function changePassword({ currentPassword, newPassword }) {
  return proxyPost({ action: 'changePassword', currentPassword, newPassword });
}

export async function updateProfile({ name, photoBase64, mimeType, filename }) {
  const result = await proxyPost({ action: 'updateProfile', name, photoBase64, mimeType, filename });
  if (result.user) result.user = normalizeUser(result.user);
  if (result.success && result.user) {
    const current = getAuthSession();
    if (current?.token) {
      saveAuthSession({ ...current, user: result.user });
    }
  }
  return result;
}

export async function getMe() {
  const result = await proxyGet({ action: 'getMe' });
  if (result.user) result.user = normalizeUser(result.user);
  if (result.success) {
    const current = getAuthSession();
    if (current?.token) {
      saveAuthSession({ ...current, user: result.user });
    }
  }
  return result;
}

export async function listUsers() {
  const result = await proxyGet({ action: 'listUsers' });
  if (result.success && Array.isArray(result.users)) {
    result.users = result.users.map(normalizeUser);
  }
  return result;
}

export async function setUserApproval(id, status) {
  const result = await proxyPost({ action: 'setUserApproval', id, status });
  if (result.user) result.user = normalizeUser(result.user);
  return result;
}

export async function setUserRole(id, role) {
  const result = await proxyPost({ action: 'setUserRole', id, role });
  if (result.user) result.user = normalizeUser(result.user);
  return result;
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

export async function uploadPhoto(file, caption = '', tags = '', albumId = '') {
  const base64 = await fileToBase64(file);
  const result = await proxyPost({
    action: 'uploadPhoto',
    filename: file.name,
    mimeType: getMimeType(file),
    base64,
    caption,
    tags,
    albumId,
  });
  if (result.success && result.photo) {
    result.photo = normalizePhoto(result.photo);
  }
  return result;
}

export async function getComments(photoId) {
  return proxyGet({ action: 'getComments', photoId });
}

export async function addComment(photoId, text) {
  return proxyPost({ action: 'addComment', photoId, text });
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
