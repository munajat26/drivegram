import { useEffect, useMemo, useState } from 'react';
import { addComment, formatRelativeTime, getComments, getProxiedImageUrl } from '../lib/api';

function activeIndexAfterMove(current, length, direction) {
  if (length <= 1) return 0;
  return (current + direction + length) % length;
}

function postTitle(post) {
  const first = post.photos[0];
  return first?.caption || first?.filename || 'Foto Samawa';
}

export default function PhotoPost({ post, priority = false, onPhotoClick, onDelete }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  const photos = post.photos || [];
  const activePhoto = photos[activeIndex] || photos[0];
  const hasMultiple = photos.length > 1;

  const imageSrc = useMemo(() => {
    return getProxiedImageUrl(activePhoto?.fileId, 720) || activePhoto?.thumbnailUrl || '';
  }, [activePhoto]);

  const downloadUrl = useMemo(() => {
    return getProxiedImageUrl(activePhoto?.fileId, 1800, {
      download: true,
      filename: activePhoto?.filename || 'samawa-photo.jpg',
    }) || activePhoto?.directUrl || '';
  }, [activePhoto]);

  useEffect(() => {
    setActiveIndex(0);
  }, [post.id]);

  useEffect(() => {
    if (!commentsOpen || !activePhoto?.id) return;

    let cancelled = false;
    setCommentsLoading(true);
    setCommentError('');
    getComments(activePhoto.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.error || 'Gagal memuat komentar');
        setComments(result.comments || []);
      })
      .catch((err) => {
        if (!cancelled) setCommentError(err.message || 'Gagal memuat komentar');
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commentsOpen, activePhoto?.id]);

  const move = (direction) => {
    setActiveIndex(current => activeIndexAfterMove(current, photos.length, direction));
    setCommentsOpen(false);
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !activePhoto?.id) return;

    setCommentError('');
    try {
      const result = await addComment(activePhoto.id, text);
      if (!result.success) throw new Error(result.error || 'Gagal mengirim komentar');
      setComments(prev => [...prev, result.comment]);
      setCommentText('');
      setCommentsOpen(true);
    } catch (err) {
      setCommentError(err.message || 'Gagal mengirim komentar');
    }
  };

  if (!activePhoto) return null;

  return (
    <article className="panel overflow-hidden rounded-2xl animate-fade-up">
      <header className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{postTitle(post)}</p>
          <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
            {formatRelativeTime(activePhoto.uploadedAt)}
            {hasMultiple && ` - ${activeIndex + 1}/${photos.length}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download
            title="Download foto"
            className="w-9 h-9 rounded-full surface-button flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
          <button
            type="button"
            onClick={() => onDelete?.(activePhoto.id)}
            title="Hapus foto"
            className="w-9 h-9 rounded-full surface-button flex items-center justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="relative bg-black">
        <button
          type="button"
          onClick={() => onPhotoClick?.(activePhoto)}
          className="block w-full"
          aria-label="Buka foto"
        >
          <img
            src={imageSrc}
            srcSet={[
              `${getProxiedImageUrl(activePhoto.fileId, 480)} 480w`,
              `${getProxiedImageUrl(activePhoto.fileId, 720)} 720w`,
              `${getProxiedImageUrl(activePhoto.fileId, 1080)} 1080w`,
            ].join(', ')}
            sizes="(max-width: 640px) 100vw, 640px"
            alt={activePhoto.caption || activePhoto.filename || 'Foto'}
            loading={priority ? 'eager' : 'lazy'}
            className="w-full object-contain"
            style={{ maxHeight: 'min(78vh, 760px)', aspectRatio: '4 / 5', background: '#050505' }}
          />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.52)', color: 'white' }}
              aria-label="Foto sebelumnya"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.52)', color: 'white' }}
              aria-label="Foto berikutnya"
            >
              &gt;
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((photo, index) => (
                <span
                  key={photo.id}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: index === activeIndex ? 'white' : 'rgba(255,255,255,0.42)' }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4 space-y-3">
        {activePhoto.caption && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{activePhoto.caption}</p>
        )}

        {activePhoto.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activePhoto.tags.map(tag => (
              <span key={tag} className="text-xs" style={{ color: 'var(--accent)' }}>#{tag}</span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setCommentsOpen(value => !value)}
          className="text-sm"
          style={{ color: 'var(--muted-text)' }}
        >
          {commentsOpen ? 'Sembunyikan komentar' : 'Lihat dan tulis komentar'}
        </button>

        {commentsOpen && (
          <div className="space-y-3 pt-1">
            {commentsLoading ? (
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>Memuat komentar...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-2">
                {comments.map(comment => (
                  <div key={comment.id} className="text-sm">
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{comment.userName}</span>
                    <span style={{ color: 'var(--muted-text)' }}> {comment.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted-text)' }}>Belum ada komentar.</p>
            )}

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Tulis komentar..."
                maxLength={500}
                className="flex-1 rounded-full px-4 py-2 text-sm field"
              />
              <button type="submit" className="px-4 py-2 rounded-full text-sm primary-button">
                Kirim
              </button>
            </form>

            {commentError && (
              <p className="text-xs" style={{ color: 'var(--danger-text)' }}>{commentError}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
