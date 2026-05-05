import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  clearAuthSession,
  getAuthSession,
  getMe,
  listUsers,
  setUserApproval,
  setUserRole,
} from '../lib/api';

const statusColor = {
  approved: { bg: 'rgba(34,197,94,0.1)', fg: '#86EFAC' },
  pending: { bg: 'rgba(250,204,21,0.1)', fg: '#FDE68A' },
  rejected: { bg: 'rgba(220,38,38,0.1)', fg: '#FCA5A5' },
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
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F', color: '#8B8578' }}>
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

      <main className="min-h-screen" style={{ background: '#0A0A0F' }}>
        <header className="border-b border-white/5" style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #C8A96E, #8B5E2E)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <span className="font-display text-lg" style={{ color: '#C8A96E' }}>Drivegram Admin</span>
            </Link>
            <span className="text-sm hidden sm:inline" style={{ color: '#8B8578' }}>{user?.email}</span>
          </div>
        </header>

        <section className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl mb-2" style={{ color: '#F5F0E8' }}>Approval User</h1>
              <p className="text-sm" style={{ color: '#8B8578' }}>
                {pendingCount} user menunggu approval dari total {users.length} user.
              </p>
            </div>
            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
              style={{ color: '#F5F0E8' }}>
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/8" style={{ background: '#1A1A24' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/5" style={{ color: '#8B8578' }}>
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
                    <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                      <td className="p-4">
                        <div className="font-medium" style={{ color: '#F5F0E8' }}>{item.name}</div>
                        <div className="text-xs mt-1" style={{ color: '#8B8578' }}>{item.email}</div>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.role}
                          disabled={busyId === item.id}
                          onChange={(e) => updateRole(item.id, e.target.value)}
                          className="rounded-lg px-3 py-2 border border-white/10 text-sm"
                          style={{ background: '#0F0F18', color: '#F5F0E8' }}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs" style={{ background: color.bg, color: color.fg }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap" style={{ color: '#8B8578' }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={busyId === item.id || item.status === 'approved'}
                            onClick={() => updateApproval(item.id, 'approved')}
                            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#86EFAC' }}>
                            Approve
                          </button>
                          <button
                            disabled={busyId === item.id || item.status === 'rejected'}
                            onClick={() => updateApproval(item.id, 'rejected')}
                            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
                            style={{ background: 'rgba(220,38,38,0.12)', color: '#FCA5A5' }}>
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
