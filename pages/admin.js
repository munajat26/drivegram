import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ThemeToggle from '../components/ThemeToggle';
import {
  clearAuthSession,
  getAuthSession,
  getMe,
  listUsers,
  setUserApproval,
  setUserRole,
} from '../lib/api';

const statusColor = {
  approved: { bg: 'var(--success-bg)', fg: 'var(--success-text)' },
  pending: { bg: 'rgba(250,204,21,0.1)', fg: '#FDE68A' },
  rejected: { bg: 'var(--danger-bg)', fg: 'var(--danger-text)' },
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const pendingCount = useMemo(() => users.filter((item) => item.status === 'pending').length, [users]);

  const loadUsers = useCallback(async () => {
    setError('');
    const result = await listUsers();
    if (!result.success) throw new Error(result.error || 'Gagal memuat user');
    setUsers(result.users || []);
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session?.token) {
      router.replace('/login');
      return;
    }

    getMe()
      .then(async (result) => {
        if (!result.success) throw new Error(result.error || 'Sesi tidak valid');
        if (result.user.role !== 'admin') {
          router.replace('/');
          return;
        }
        setUser(result.user);
        await loadUsers();
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat admin panel');
        clearAuthSession();
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [loadUsers, router]);

  const updateApproval = async (id, status) => {
    setBusyId(id);
    setError('');
    try {
      const result = await setUserApproval(id, status);
      if (!result.success) throw new Error(result.error || 'Gagal update approval');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Gagal update approval');
    } finally {
      setBusyId('');
    }
  };

  const updateRole = async (id, role) => {
    setBusyId(id);
    setError('');
    try {
      const result = await setUserRole(id, role);
      if (!result.success) throw new Error(result.error || 'Gagal update role');
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Gagal update role');
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return (
      <>
        <Head><title>Admin - Drivegram</title></Head>
        <div className="app-shell flex items-center justify-center" style={{ color: 'var(--muted-text)' }}>
          Memuat admin panel...
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Drivegram</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="app-shell">
        <header className="border-b glass-nav">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Drivegram"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="font-display text-lg" style={{ color: 'var(--accent)' }}>Drivegram Admin</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm hidden sm:inline" style={{ color: 'var(--muted-text)' }}>{user?.email}</span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--text)' }}>Approval User</h1>
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
                {pendingCount} user menunggu approval dari total {users.length} user.
              </p>
            </div>
            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-lg text-sm surface-button transition-colors">
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: 'var(--muted-text)', borderBottom: '1px solid var(--border)' }}>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Dibuat</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const color = statusColor[item.status] || statusColor.pending;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-4">
                        <div className="font-medium" style={{ color: 'var(--text)' }}>{item.name}</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>{item.email}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.role}
                          disabled={busyId === item.id}
                          onChange={(e) => updateRole(item.id, e.target.value)}
                          className="rounded-lg px-3 py-2 text-sm field">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: color.bg, color: color.fg }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap" style={{ color: 'var(--muted-text)' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busyId === item.id || item.status === 'approved'}
                            onClick={() => updateApproval(item.id, 'approved')}
                            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                            style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success-text)' }}>
                            Approve
                          </button>
                          <button
                            disabled={busyId === item.id || item.status === 'rejected'}
                            onClick={() => updateApproval(item.id, 'rejected')}
                            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                            style={{ background: 'rgba(220,38,38,0.12)', color: 'var(--danger-text)' }}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
