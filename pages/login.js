import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ThemeToggle from '../components/ThemeToggle';
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
        <title>{mode === 'login' ? 'Login' : 'Register'} - Samawa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="app-shell flex items-center justify-center px-4 py-10">
        <div className="fixed right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-3 mb-8">
            <img
              src="/logo.png"
              alt="Samawa"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-display text-2xl" style={{ color: 'var(--accent)' }}>Samawa</span>
          </Link>

          <section className="rounded-2xl overflow-hidden panel">
            <div className="grid grid-cols-2 p-1 m-4 rounded-xl" style={{ background: 'var(--input-bg)' }}>
              {['login', 'register'].map((item) => (
                <button
                  key={item}
                  onClick={() => { setMode(item); setError(''); setMessage(''); }}
                  className="py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: mode === item ? 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #6b4518))' : 'transparent',
                    color: mode === item ? 'var(--accent-contrast)' : 'var(--muted-text)'
                  }}>
                  {item === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>NAMA</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm field"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted-text)' }}>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full rounded-xl px-4 py-3 text-sm field"
                  required
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
                  {error}
                </div>
              )}

              {message && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                  {message}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #6b4518))', color: 'var(--accent-contrast)' }}>
                {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
