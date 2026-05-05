import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getAuthSession, getMe, loginUser, registerUser } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const session = getAuthSession();
    if (!session?.token) return;

    getMe()
      .then((result) => {
        if (result.success) router.replace('/');
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = mode === 'login'
        ? await loginUser({ email, password })
        : await registerUser({ name, email, password });

      if (!result.success) {
        throw new Error(result.error || 'Request gagal');
      }

      if (result.pending) {
        setMessage(result.message || 'Registrasi berhasil. Tunggu approval admin.');
        setMode('login');
        setPassword('');
        return;
      }

      router.replace('/');
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Login' : 'Register'} - Drivegram</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#0A0A0F' }}>
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #C8A96E, #8B5E2E)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <span className="font-display text-2xl" style={{ color: '#C8A96E' }}>Drivegram</span>
          </Link>

          <section className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: '#1A1A24' }}>
            <div className="grid grid-cols-2 p-1 m-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['login', 'register'].map((item) => (
                <button
                  key={item}
                  onClick={() => { setMode(item); setError(''); setMessage(''); }}
                  className="py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: mode === item ? 'linear-gradient(135deg, #C8A96E, #9A7240)' : 'transparent',
                    color: mode === item ? '#0A0A0F' : '#8B8578'
                  }}>
                  {item === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: '#8B8578' }}>NAMA</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm border border-white/8"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#F5F0E8' }}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#8B8578' }}>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#F5F0E8' }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#8B8578' }}>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#F5F0E8' }}
                  required
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5' }}>
                  {error}
                </div>
              )}

              {message && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#86EFAC' }}>
                  {message}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #C8A96E, #9A7240)', color: '#0A0A0F' }}>
                {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
