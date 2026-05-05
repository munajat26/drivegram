// components/PhotoCard.js
import { useEffect, useState } from 'react';
import { formatRelativeTime, getAuthToken } from '../lib/api';

function cardImageUrl(photo) {
  if (photo.fileId) {
    const token = getAuthToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `/api/image?id=${encodeURIComponent(photo.fileId)}&size=600${tokenParam}`;
  }
  return photo.thumbnailUrl || photo.directUrl;
}

export default function PhotoCard({ photo, onClick, onDelete }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState(cardImageUrl(photo));

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    setImgSrc(cardImageUrl(photo));
  }, [photo]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirm('Hapus foto ini?')) {
      onDelete?.(photo.id);
    }
  };

  return (
    <div
      className="photo-card group relative rounded-xl overflow-hidden cursor-pointer"
      style={{ background: '#1A1A24' }}
      onClick={() => onClick?.(photo)}>

      {/* Skeleton */}
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 skeleton" style={{ aspectRatio: '1' }} />
      )}

      {/* Image */}
      {!imgError ? (
        <img
          src={imgSrc}
          alt={photo.caption || photo.filename}
          loading="lazy"
          className="relative z-10 w-full object-cover transition-opacity duration-300"
          style={{ opacity: 1, aspectRatio: '1' }}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            if (imgSrc !== photo.directUrl && photo.directUrl) {
              setImgSrc(photo.directUrl);
              setImgLoaded(false);
            } else {
              setImgError(true);
            }
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2"
             style={{ aspectRatio: '1', background: '#252535' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B8578" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span className="text-xs" style={{ color: '#8B8578' }}>Gagal memuat</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end"
           style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }}>
        
        <div className="p-3">
          {photo.caption && (
            <p className="text-xs font-medium text-white line-clamp-2 mb-1">{photo.caption}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {formatRelativeTime(photo.uploadedAt)}
            </span>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tags */}
      {photo.tags?.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.tags.slice(0, 2).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'rgba(200,169,110,0.85)', color: '#0A0A0F' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
