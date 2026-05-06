import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { changePassword, updateProfile } from '../lib/api';

function initials(user) {
  const source = user?.name || user?.email || 'S';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'S';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1];
      if (!base64) reject(new Error('Gagal membaca file'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export default function ProfileMenu({ user, onLogout, onUserUpdate }) {
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const wrapperRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File profil harus berupa gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Foto profil maksimal 5MB.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const photoBase64 = await fileToBase64(file);
      const result = await updateProfile({
        photoBase64,
        mimeType: file.type || 'image/jpeg',
        filename: file.name,
      });
      if (!result.success) throw new Error(result.error || 'Gagal mengubah foto profil');
      onUserUpdate?.(result.user);
      setMessage('Foto profil diperbarui.');
    } catch (err) {
      setError(err.message || 'Gagal mengubah foto profil');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await changePassword({ currentPassword, newPassword });
      if (!result.success) throw new Error(result.error || 'Gagal reset password');
      setCurrentPassword('');
      setNewPassword('');
      setPasswordOpen(false);
      setMessage('Password berhasil diubah.');
    } catch (err) {
      setError(err.message || 'Gagal reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        title={user?.email || 'Profil'}
        className="w-10 h-10 rounded-full overflow-hidden surface-button flex items-center justify-center font-semibold transition-transform active:scale-95"
      >
        {user?.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} alt={user.name || user.email || 'Profil'} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{initials(user)}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[min(88vw,20rem)] rounded-2xl overflow-hidden panel animate-fade-in"
          style={{ zIndex: 80 }}
        >
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-semibold"
                 style={{ background: 'var(--input-bg)', color: 'var(--text)' }}>
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : initials(user)}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name || 'Samawa User'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted-text)' }}>{user?.email}</p>
            </div>
          </div>

          <div className="p-2">
            {user?.role === 'admin' && (
              <Link href="/admin" className="w-full flex items-center rounded-xl px-3 py-2.5 text-sm surface-button">
                Admin panel
              </Link>
            )}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="mt-1 w-full flex items-center rounded-xl px-3 py-2.5 text-sm surface-button disabled:opacity-60"
            >
              Ubah foto profil
            </button>

            <button
              type="button"
              onClick={() => setPasswordOpen(value => !value)}
              className="mt-1 w-full flex items-center rounded-xl px-3 py-2.5 text-sm surface-button"
            >
              Reset password
            </button>

            {passwordOpen && (
              <form onSubmit={handlePasswordSubmit} className="mt-2 p-3 rounded-xl space-y-2 panel-soft">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Password lama"
                  className="w-full rounded-lg px-3 py-2 text-sm field"
                  required
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Password baru"
                  className="w-full rounded-lg px-3 py-2 text-sm field"
                  minLength={6}
                  required
                />
                <button type="submit" disabled={busy} className="w-full rounded-lg py-2 text-sm primary-button disabled:opacity-60">
                  {busy ? 'Menyimpan...' : 'Simpan password'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="mt-1 w-full flex items-center rounded-xl px-3 py-2.5 text-sm surface-button"
            >
              Log out
            </button>
          </div>

          {(message || error) && (
            <div className="px-4 pb-4 text-xs" style={{ color: error ? 'var(--danger-text)' : 'var(--success-text)' }}>
              {error || message}
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      )}
    </div>
  );
}
