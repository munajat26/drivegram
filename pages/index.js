// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import PhotoCard from '../components/PhotoCard';
import PhotoModal from '../components/PhotoModal';
import UploadModal from '../components/UploadModal';
import { clearAuthSession, deletePhoto, getAuthSession, getMe, getPhotos, getStats, logoutUser } from '../lib/api';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
const PHOTOS_PAGE_SIZE = 16;
const PHOTO_CACHE_PREFIX = 'drivegram_photos_cache:';

function getPhotoCacheKey(searchQuery, activeTag) {
  return `${PHOTO_CACHE_PREFIX}${searchQuery || ''}:${activeTag || ''}`;
}

function readPhotoCache(searchQuery, activeTag) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getPhotoCacheKey(searchQuery, activeTag));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writePhotoCache(searchQuery, activeTag, data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getPhotoCacheKey(searchQuery, activeTag), JSON.stringify({
      photos: data.photos || [],
      total: data.total || 0,
      hasMore: !!data.hasMore,
      savedAt: Date.now(),
    }));
  } catch (err) {
    // Cache lokal hanya untuk mempercepat render; aman diabaikan jika penuh.
  }
}

export default function Home() {
  const router = useRouter();
  const [photos, setPhotos] = useState([]);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [stats, setStats] = useState(null);

  const isConfigured = !!GAS_URL;

  const loadPhotos = useCallback(async (reset = false) => {
    if (!isConfigured || !currentUser) {
      setLoading(false);
      return;
    }

    let showedCache = false;
    
    try {
      if (reset) {
        const cached = readPhotoCache(searchQuery, activeTag);
        if (cached?.photos?.length) {
          setPhotos(cached.photos);
          setTotal(cached.total);
          setHasMore(cached.hasMore);
          setPage(2);
          setLoading(false);
          showedCache = true;
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const result = await getPhotos({ 
        page: currentPage, 
        limit: PHOTOS_PAGE_SIZE,
        search: searchQuery,
        tag: activeTag
      });

      if (result.success) {
        if (reset) {
          setPhotos(result.photos);
          setPage(2);
          writePhotoCache(searchQuery, activeTag, result);
        } else {
          setPhotos(prev => [...prev, ...result.photos]);
          setPage(p => p + 1);
        }
        setHasMore(result.hasMore);
        setTotal(result.total);
        setError('');
      } else {
        setError(result.error || 'Gagal memuat foto');
      }
    } catch (err) {
      if (!showedCache) {
        setError(err.message || 'Tidak dapat terhubung ke server. Pastikan GAS URL sudah dikonfigurasi.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isConfigured, currentUser, searchQuery, activeTag, page]);

  const loadStats = useCallback(async () => {
    if (!isConfigured || !currentUser) return;
    try {
      const result = await getStats();
      if (result.success) setStats(result.stats);
    } catch (err) {
      // Stats gagal tidak kritis
    }
  }, [isConfigured, currentUser]);

  useEffect(() => {
    if (!isConfigured) return;
    const session = getAuthSession();
    if (!session?.token) {
      router.replace('/login');
      return;
    }

    if (session.user) {
      setCurrentUser(session.user);
      setAuthChecking(false);
    }

    getMe()
      .then((result) => {
        if (!result.success) throw new Error(result.error || 'Sesi tidak valid');
        setCurrentUser(result.user);
      })
      .catch(() => {
        clearAuthSession();
        router.replace('/login');
      })
      .finally(() => setAuthChecking(false));
  }, [isConfigured, router]);

  useEffect(() => {
    if (!currentUser) return;
    loadPhotos(true);
    const statsTimer = window.setTimeout(() => loadStats(), 800);
    return () => window.clearTimeout(statsTimer);
  }, [currentUser, searchQuery, activeTag]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login');
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setActiveTag('');
  };

  const handleTagClick = (tag) => {
    setActiveTag(activeTag === tag ? '' : tag);
    setSearchQuery('');
  };

  const handleUploadSuccess = (newPhotos) => {
    setPhotos(prev => [...newPhotos, ...prev]);
    setTotal(prev => prev + newPhotos.length);
    loadStats();
  };

  const handleDelete = async (photoId, options = {}) => {
    const previousPhotos = photos;
    const previousTotal = total;

    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setTotal(prev => Math.max(0, prev - 1));

    if (options.skipApi) {
      loadStats();
      return;
    }

    try {
      const result = await deletePhoto(photoId);
      if (!result.success) throw new Error(result.error || 'Gagal menghapus foto');
      loadStats();
    } catch (err) {
      setPhotos(previousPhotos);
      setTotal(previousTotal);
      setError(err.message || 'Gagal menghapus foto');
    }
  };

  const handleUpdate = (updatedPhoto) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    setSelectedPhoto(updatedPhoto);
  };

  // Not configured screen
  if (!isConfigured) {
    return (
      <>
        <Head><title>Drivegram - Setup</title></Head>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0A0A0F' }}>
          <div className="max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                 style={{ background: 'linear-gradient(135deg, #C8A96E, #8B5E2E)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <h1 className="font-display text-3xl mb-3" style={{ color: '#C8A96E' }}>Drivegram</h1>
            <p className="mb-8" style={{ color: '#8B8578' }}>
              Instagram pribadi dengan Google Drive sebagai penyimpanan
            </p>

            <div className="rounded-2xl p-6 text-left space-y-4 border border-white/8"
                 style={{ background: '#1A1A24' }}>
              <h2 className="font-medium text-sm uppercase tracking-wider" style={{ color: '#C8A96E' }}>
                Cara Setup
              </h2>
              
              {[
                { n: 1, title: 'Buka Google Apps Script', desc: 'Pergi ke script.google.com dan buat project baru' },
                { n: 2, title: 'Copy kode backend', desc: 'Copy isi file gas/Code.gs ke editor GAS' },
                { n: 3, title: 'Deploy sebagai Web App', desc: 'Deploy > New Deployment > Web App > Execute as Me > Anyone' },
                { n: 4, title: 'Set environment variable', desc: 'Buat .env.local dan isi NEXT_PUBLIC_GAS_URL dengan URL deployment' },
                { n: 5, title: 'Restart dev server', desc: 'Jalankan ulang npm run dev' },
              ].map(step => (
                <div key={step.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                       style={{ background: 'rgba(200,169,110,0.15)', color: '#C8A96E' }}>
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F5F0E8' }}>{step.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8B8578' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl text-left font-mono text-xs border border-white/8"
                 style={{ background: '#0F0F18', color: '#C8A96E' }}>
              # .env.local<br/>
              NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
            </div>
          </div>
        </div>
      </>
    );
  }

  if (authChecking) {
    return (
      <>
        <Head><title>Drivegram</title></Head>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F', color: '#8B8578' }}>
          Memeriksa sesi...
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Drivegram — Galeri Pribadi</title>
        <meta name="description" content="Galeri foto pribadi berbasis Google Drive" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          onUploadClick={() => setShowUpload(true)}
          onSearch={handleSearch}
        />

        {/* Hero stats */}
        <div className="pt-24 pb-8 px-4 max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="font-display text-4xl mb-1 animate-fade-up" style={{ color: '#F5F0E8' }}>
                Galeri Saya
              </h1>
              <p className="animate-fade-up delay-100" style={{ color: '#8B8578' }}>
                {total > 0 ? `${total} foto tersimpan di Google Drive` : 'Belum ada foto'}
                {stats && ` · ${stats.totalSizeMB} MB digunakan`}
              </p>
            </div>
            {(searchQuery || activeTag) && (
              <button onClick={() => { setSearchQuery(''); setActiveTag(''); }}
                      className="px-4 py-2 rounded-full text-sm border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: '#8B8578' }}>
                ✕ Reset filter
              </button>
            )}
          </div>

          {/* Tags filter */}
          {stats?.topTags?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-up delay-200 scrollbar-hide">
              <button onClick={() => setActiveTag('')}
                      className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all shrink-0"
                      style={{
                        background: !activeTag ? 'linear-gradient(135deg, #C8A96E, #9A7240)' : 'rgba(255,255,255,0.06)',
                        color: !activeTag ? '#0A0A0F' : '#8B8578',
                        border: !activeTag ? 'none' : '1px solid rgba(255,255,255,0.08)'
                      }}>
                Semua
              </button>
              {stats.topTags.map(({ tag, count }) => (
                <button key={tag} onClick={() => handleTagClick(tag)}
                        className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all shrink-0"
                        style={{
                          background: activeTag === tag ? 'linear-gradient(135deg, #C8A96E, #9A7240)' : 'rgba(255,255,255,0.06)',
                          color: activeTag === tag ? '#0A0A0F' : '#8B8578',
                          border: activeTag === tag ? 'none' : '1px solid rgba(255,255,255,0.08)'
                        }}>
                  #{tag} <span className="opacity-60 ml-1">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Photo Grid */}
        <main className="px-4 max-w-6xl mx-auto pb-16">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="rounded-xl skeleton" style={{ aspectRatio: '1', animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'rgba(220,38,38,0.1)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="font-medium mb-2" style={{ color: '#FCA5A5' }}>Koneksi Gagal</p>
              <p className="text-sm mb-4" style={{ color: '#8B8578' }}>{error}</p>
              <button onClick={() => loadPhotos(true)}
                      className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: '#F5F0E8' }}>
                Coba lagi
              </button>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                   style={{ background: 'rgba(200,169,110,0.08)', border: '1px dashed rgba(200,169,110,0.2)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p className="font-display text-xl mb-2" style={{ color: '#F5F0E8' }}>
                {searchQuery || activeTag ? 'Tidak ada hasil' : 'Belum ada foto'}
              </p>
              <p className="text-sm mb-6" style={{ color: '#8B8578' }}>
                {searchQuery || activeTag 
                  ? 'Coba kata kunci atau filter lain'
                  : 'Upload foto pertamamu ke Google Drive'}
              </p>
              {!searchQuery && !activeTag && (
                <button onClick={() => setShowUpload(true)}
                        className="px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #C8A96E, #9A7240)', color: '#0A0A0F' }}>
                  Upload Foto Pertama
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="animate-fade-up"
                       style={{ animationDelay: `${Math.min(i, 10) * 0.04}s`, opacity: 0 }}>
                    <PhotoCard
                      photo={photo}
                      priority={i < 6}
                      onClick={setSelectedPhoto}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="text-center mt-10">
                  <button onClick={() => loadPhotos(false)} disabled={loadingMore}
                          className="px-8 py-3 rounded-full text-sm border border-white/10 hover:bg-white/5 transition-all hover:scale-105 disabled:opacity-50"
                          style={{ color: '#8B8578' }}>
                    {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* FAB Upload - Mobile */}
        <button onClick={() => setShowUpload(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 md:hidden"
                style={{ background: 'linear-gradient(135deg, #C8A96E, #8B5E2E)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        {/* Modals */}
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={handleUploadSuccess}
          />
        )}

        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </>
  );
}
