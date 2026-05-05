// pages/api/gas.js
// Proxy server-side ke Google Apps Script supaya browser tidak terkena CORS
// dan redirect ContentService tetap ditangani oleh server Next.js.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '35mb', // 20MB file menjadi sekitar 27MB setelah base64 + JSON
    },
  },
};

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

function jsonError(res, status, message, detail = '') {
  return res.status(status).json({
    success: false,
    error: detail ? `${message}: ${detail}` : message,
  });
}

function sendGasJson(res, text, context) {
  if (!text || text.trim() === '') {
    return jsonError(res, 502, `Response kosong dari GAS (${context})`);
  }

  try {
    JSON.parse(text);
  } catch (err) {
    return jsonError(
      res,
      502,
      `GAS mengirim response bukan JSON (${context})`,
      text.slice(0, 300)
    );
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(text);
}

function sendGasPostJson(res, text, action, context) {
  if (!text || text.trim() === '') {
    return jsonError(res, 502, `Response kosong dari GAS (${context})`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return jsonError(
      res,
      502,
      `GAS mengirim response bukan JSON (${context})`,
      text.slice(0, 300)
    );
  }

  const looksLikeDoGet = Array.isArray(data.photos) && !data.photo && !data.message;
  const uploadMissingPhoto = action === 'uploadPhoto' && data.success && (!data.photo || !data.photo.id);

  if (looksLikeDoGet || uploadMissingPhoto) {
    return jsonError(
      res,
      502,
      'POST tidak diproses oleh GAS. Copy ulang gas/Code.gs lalu deploy versi Web App terbaru'
    );
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(text);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!GAS_URL) {
    return jsonError(res, 500, 'GAS_URL tidak dikonfigurasi di server');
  }

  if (req.method === 'GET') {
    const params = new URLSearchParams(req.query).toString();
    const url = `${GAS_URL}${params ? '?' + params : ''}`;

    try {
      const gasRes = await fetch(url, { redirect: 'follow' });
      const text = await gasRes.text();

      if (!gasRes.ok) {
        return jsonError(res, 502, `Gagal GET ke GAS (${gasRes.status})`, text.slice(0, 300));
      }

      return sendGasJson(res, text, 'GET');
    } catch (err) {
      return jsonError(res, 502, 'Gagal GET ke GAS', err.message);
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    let action = '';
    try {
      action = JSON.parse(body).action || '';
    } catch (err) {
      return jsonError(res, 400, 'Body POST bukan JSON valid');
    }

    try {
      const firstRes = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        redirect: 'manual',
      });

      if ([301, 302, 303, 307, 308].includes(firstRes.status)) {
        const targetUrl = firstRes.headers.get('location');
        if (!targetUrl) {
          return jsonError(res, 502, 'GAS redirect tapi tidak ada Location header');
        }

        const secondRes = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
        });
        const text = await secondRes.text();

        if (!secondRes.ok) {
          return jsonError(res, 502, `Gagal POST ke GAS redirect (${secondRes.status})`, text.slice(0, 300));
        }

        return sendGasPostJson(res, text, action, 'POST redirect');
      }

      const text = await firstRes.text();

      if (!firstRes.ok) {
        return jsonError(res, 502, `Gagal POST ke GAS (${firstRes.status})`, text.slice(0, 300));
      }

      return sendGasPostJson(res, text, action, 'POST');
    } catch (err) {
      return jsonError(res, 502, 'Proxy error', err.message);
    }
  }

  return jsonError(res, 405, 'Method not allowed');
}
