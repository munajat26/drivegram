// components/UploadModal.js
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPhoto } from '../lib/api';

export default function UploadModal({ onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const imageFiles = acceptedFiles.filter(f =>
      f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name)
    );
    const withPreview = imageFiles.map(f => Object.assign(f, {
      preview: URL.createObjectURL(f)
    }));
    setFiles(prev => [...prev, ...withPreview].slice(0, 10)); // max 10
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'] },
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejected) => {
      const reason = rejected[0]?.errors[0]?.code;
      if (reason === 'file-too-large') setError('File terlalu besar. Maksimal 20MB.');
      else setError('Format file tidak didukung.');
    }
  });

  const removeFile = (index) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Pilih minimal satu foto');
      return;
    }

    setUploading(true);
    setError('');
    const results = [];

    for (let i = 0; i < files.length; i++) {
      try {
        setProgress(Math.round((i / files.length) * 100));
        const result = await uploadPhoto(files[i], caption, tags);
        if (result.success) {
          results.push(result.photo);
        } else {
          throw new Error(result.error || 'Upload gagal');
        }
      } catch (err) {
        const message = err.name === 'AbortError' ? 'Upload timeout. Coba file lebih kecil atau ulangi lagi.' : err.message;
        setError(`Gagal upload "${files[i].name}": ${message}`);
        setUploading(false);
        return;
      }
    }

    setProgress(100);
    setUploading(false);
    onSuccess?.(results);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
         style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
         onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}>
      
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fade-up"
           style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.06)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-lg" style={{ color: '#F5F0E8' }}>Upload Foto</h2>
          {!uploading && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted hover:text-paper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Dropzone */}
          {files.length === 0 ? (
            <div {...getRootProps()} 
                 className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
                 style={{ 
                   borderColor: isDragActive ? '#C8A96E' : 'rgba(255,255,255,0.12)',
                   background: isDragActive ? 'rgba(200,169,110,0.05)' : 'transparent'
                 }}>
              <input {...getInputProps()} />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'rgba(200,169,110,0.1)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p className="font-medium mb-1" style={{ color: '#F5F0E8' }}>
                {isDragActive ? 'Lepaskan foto di sini' : 'Drag & drop atau klik untuk pilih'}
              </p>
              <p className="text-sm" style={{ color: '#8B8578' }}>
                JPG, PNG, GIF, WebP — Maks. 20MB per file
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              {/* Add more button */}
              <div {...getRootProps()} className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors"
                   style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                <input {...getInputProps()} />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B8578" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#8B8578' }}>
              CAPTION
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tulis caption yang menarik..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none border border-white/8 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#F5F0E8' }}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#8B8578' }}>
              TAGS <span style={{ color: '#8B8578', fontWeight: 400 }}>(pisahkan dengan koma)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="liburan, keluarga, kuliner"
              className="w-full rounded-xl px-4 py-3 text-sm border border-white/8"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#F5F0E8' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.1)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: '#8B8578' }}>
                <span>Mengupload...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                     style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #C8A96E, #9A7240)' }} />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            style={{ background: 'linear-gradient(135deg, #C8A96E, #9A7240)', color: '#0A0A0F' }}>
            {uploading ? `Mengupload ke Google Drive... (${progress}%)` : `Upload ${files.length > 0 ? files.length + ' ' : ''}Foto`}
          </button>
        </div>
      </div>
    </div>
  );
}
