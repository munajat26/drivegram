// components/PhotoModal.js
import { useState, useEffect } from 'react';
import { formatRelativeTime, formatFileSize, updatePhoto, deletePhoto } from '../lib/api';

export default function PhotoModal({ photo, onClose, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption || '');
  const [tags, setTags] = useState(photo.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imageSrc, setImageSrc] = useState(photo.directUrl || photo.thumbnailUrl);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    setCaption(photo.caption || '');
    setTags(photo.tags?.join(', ') || '');
    setImgLoaded(false);
    setImgError(false);
    setImageSrc(photo.directUrl || photo.thumbnailUrl);
  }, [photo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updatePhoto(photo.id, { caption, tags });
      if (result.success) {
        onUpdate?.({ ...photo, caption, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
        setEditing(false);
      }
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Hapus foto ini? File juga akan dihapus dari Google Drive.')) return;
    try {
      const result = await deletePhoto(photo.id);
      if (result.success) {
        onDelete?.(photo.id, { skipApi: true });
        onClose();
      }
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row rounded-2xl overflow-hidden animate-fade-in"
           style={{ background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-soft)' }}>

        {/* Close Button */}
        <button onClick={onClose}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center min-h-[300px] md:min-h-0 relative"
             style={{ background: 'var(--bg)' }}>
          {!imgLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          <img
            src={imageSrc}
            alt={photo.caption || photo.filename}
            className="max-w-full max-h-[60vh] md:max-h-[92vh] object-contain"
            style={{ opacity: imgLoaded && !imgError ? 1 : 0, transition: 'opacity 0.3s' }}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              if (imageSrc !== photo.thumbnailUrl && photo.thumbnailUrl) {
                setImageSrc(photo.thumbnailUrl);
                setImgLoaded(false);
              } else {
                setImgError(true);
              }
            }}
          />
          {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--muted-text)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-sm">Gagal memuat gambar</span>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="w-full md:w-72 flex flex-col overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          
          {/* Meta */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs mb-1 font-mono" style={{ color: 'var(--muted-text)' }}>
              {formatRelativeTime(photo.uploadedAt)}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
              {photo.filename}
            </p>
            {photo.size && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-text)' }}>
                {formatFileSize(photo.size)}
              </p>
            )}
          </div>

          {/* Caption & Tags */}
          <div className="flex-1 p-5">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-text)' }}>CAPTION</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-text)' }}>TAGS</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2"
                    className="w-full rounded-lg px-3 py-2 text-sm field"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                          className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #6b4518))', color: 'var(--accent-contrast)' }}>
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button onClick={() => setEditing(false)}
                          className="flex-1 py-2 rounded-lg text-sm surface-button transition-colors">
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {caption ? (
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>{caption}</p>
                ) : (
                  <p className="text-sm mb-4 italic" style={{ color: 'var(--muted-text)' }}>Belum ada caption</p>
                )}
                
                {photo.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {photo.tags.map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-xs"
                            style={{ background: 'rgba(200,169,110,0.12)', color: 'var(--accent)', border: '1px solid rgba(200,169,110,0.2)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="p-5 pt-0 flex gap-2">
              <button onClick={() => setEditing(true)}
                      className="flex-1 py-2 rounded-lg text-sm surface-button transition-colors flex items-center justify-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <a href={photo.driveUrl || photo.directUrl} target="_blank" rel="noopener noreferrer"
                 className="flex-1 py-2 rounded-lg text-sm surface-button transition-colors flex items-center justify-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Drive
              </a>
              <button onClick={handleDelete}
                      className="py-2 px-3 rounded-lg text-sm border border-red-500/20 hover:bg-red-500/10 transition-colors"
                      style={{ color: 'var(--danger-text)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
