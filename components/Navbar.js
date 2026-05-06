// components/Navbar.js
import { useState } from 'react';
import Link from 'next/link';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onUploadClick, onSearch, user, onLogout, onUserUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b glass-nav">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/logo.png"
            alt="Samawa"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-display text-lg tracking-wide text-brand">
            Samawa
          </span>
        </Link>

        {/* Search Bar - Desktop */}
        <form onSubmit={handleSearch} 
              className="hidden md:flex flex-1 max-w-sm items-center gap-2 rounded-full px-4 py-2 border border-white/10"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari foto, caption, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 text-sm focus:outline-none"
            style={{ color: 'var(--text)' }}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); onSearch?.(''); }}
                    className="transition-colors text-subtle hover:text-main">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Search */}
          <button className="md:hidden p-2 rounded-lg transition-colors text-subtle hover:text-main"
                  style={{ background: 'transparent' }}
                  onClick={() => setSearchOpen(!searchOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          <ThemeToggle />

          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #6b4518))', color: 'var(--accent-contrast)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/>
            </svg>
            <span className="hidden sm:inline">Upload</span>
          </button>
          <ProfileMenu user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {searchOpen && (
        <div className="md:hidden px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleSearch} 
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari foto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-transparent flex-1 text-sm focus:outline-none"
              style={{ color: 'var(--text)' }}
            />
          </form>
        </div>
      )}
    </nav>
  );
}
