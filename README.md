# 📸 Samawa

**Instagram pribadi dengan Google Drive sebagai penyimpanan**

Upload, simpan, dan tampilkan foto dari Google Drive pribadimu dengan tampilan modern seperti Instagram.

---

## ✨ Fitur

- 📤 Upload foto langsung ke Google Drive
- 🖼️ Grid masonry seperti Instagram
- 🔍 Search foto by caption, filename, atau tag
- 🏷️ Filter by tag
- ✏️ Edit caption dan tag
- 🗑️ Hapus foto (juga menghapus dari Drive)
- 📊 Statistik penggunaan
- 📱 Responsive (mobile-friendly)
- 🔒 Penyimpanan 100% di Google Drive pribadi kamu

---

## 🚀 Setup (5-10 menit)

### Step 1: Setup Google Apps Script (Backend)

1. Buka [script.google.com](https://script.google.com)
2. Klik **New Project**
3. Hapus kode default, copy-paste seluruh isi file `gas/Code.gs`
4. Klik **Save** (Ctrl+S)
5. Jalankan fungsi `testSetup` untuk verifikasi (Run > testSetup)
   - Google akan meminta izin akses ke Drive & Sheets — klik Allow
   - Cek Log untuk melihat folder & spreadsheet yang dibuat

6. **Deploy sebagai Web App:**
   - Klik **Deploy** → **New Deployment**
   - Pilih type: **Web App**
   - Description: `Samawa v1`
   - Execute as: **Me** _(pakai akun Google kamu)_
   - Who has access: **Anyone** _(diperlukan agar Next.js bisa akses)_
   - Klik **Deploy**
   - **Copy URL yang muncul!** Format: `https://script.google.com/macros/s/XXXX/exec`

### Step 2: Setup Next.js (Frontend)

1. **Clone/download project ini**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Buat file `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```

4. **Isi `.env.local`:**
   ```env
   NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
   _(Ganti dengan URL dari Step 1)_

5. **Jalankan:**
   ```bash
   npm run dev
   ```

6. Buka [http://localhost:3000](http://localhost:3000)

---

## 📁 Struktur Google Drive

Setelah pertama kali digunakan, akan otomatis terbuat:

```
Google Drive/
└── Drivegram/            ← Folder storage default
    ├── 2024-01/            ← Subfolder per bulan
    │   ├── foto1.jpg
    │   └── foto2.png
    ├── 2024-02/
    └── Drivegram DB.xlsx ← Database metadata
```

---

## 🔧 Konfigurasi GAS (Opsional)

Di file `gas/Code.gs`, kamu bisa mengubah:

```javascript
var CONFIG = {
  ROOT_FOLDER_NAME: "Drivegram",  // Nama folder storage default
  SHEET_NAME: "Drivegram DB",     // Nama spreadsheet
  AUTH_PASSWORD: ""               // Password (kosongkan = tanpa password)
};
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Google Apps Script |
| Storage | Google Drive |
| Database | Google Sheets (metadata) |
| Fonts | Playfair Display, DM Sans |

---

## ⚠️ Catatan Penting

- **Batas upload:** 20MB per file (bisa diubah di GAS)
- **Format didukung:** JPG, PNG, GIF, WebP, HEIC
- **Privacy:** Foto disimpan di Google Drive pribadimu, hanya bisa diakses oleh siapa yang punya link
- **Rate limit:** Google Apps Script punya limit 6 menit per eksekusi, 20.000 panggilan/hari (lebih dari cukup untuk personal)
- **CORS:** GAS mendukung cross-origin requests secara native

---

## 🐛 Troubleshooting

**"Tidak dapat terhubung ke server"**
- Pastikan `NEXT_PUBLIC_GAS_URL` sudah diset di `.env.local`
- Pastikan GAS sudah di-deploy dan URL benar
- Coba buka URL GAS langsung di browser, harus menampilkan JSON

**Foto tidak muncul**
- Pastikan file sudah di-share "Anyone with link" di Drive
- GAS otomatis set permission ini, tapi cek manual jika bermasalah

**Upload gagal**
- Cek ukuran file (maks 20MB)
- Pastikan tidak ada error di GAS (cek Executions di script.google.com)

**Perlu update GAS setelah deploy?**
- Edit kode di GAS editor
- Deploy > Manage Deployments > Edit (ikon pensil) > Version: New Version > Deploy

---

## 📄 Lisensi

MIT — Bebas digunakan untuk keperluan pribadi maupun komersial.
