// pages/api/image.js
// Same-origin image proxy for Google Drive files. This keeps the gallery grid
// away from Google Drive hotlink quirks that can make <img> fail in browsers.

function clampSize(value) {
  const size = Number.parseInt(value, 10);
  if (!Number.isFinite(size)) return 360;
  return Math.max(100, Math.min(size, 2400));
}

function isDriveFileId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{10,}$/.test(value);
}

async function fetchImage(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 Drivegram Image Proxy',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
    return null;
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const fileId = String(req.query.id || '');
  if (!isDriveFileId(fileId)) {
    return res.status(400).json({ success: false, error: 'ID file tidak valid' });
  }

  const size = clampSize(req.query.size);
  const candidates = [
    `https://lh3.googleusercontent.com/d/${fileId}=w${size}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];

  try {
    for (const url of candidates) {
      const image = await fetchImage(url);
      if (image) {
        res.setHeader('Content-Type', image.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('Content-Length', image.body.length);
        return res.status(200).send(image.body);
      }
    }

    return res.status(502).json({ success: false, error: 'Gagal mengambil gambar dari Google Drive' });
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Proxy gambar error: ' + err.message });
  }
}
