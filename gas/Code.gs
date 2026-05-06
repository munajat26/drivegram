// ============================================================
// DRIVEGRAM - Google Apps Script Backend
// File: Code.gs
// ============================================================
// CARA SETUP:
// 1. Buka script.google.com, buat project baru
// 2. Copy-paste semua kode ini ke editor
// 3. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy URL deployment ke .env.local (NEXT_PUBLIC_GAS_URL)
// ============================================================

// ============================================================
// KONFIGURASI - SESUAIKAN DI SINI
// ============================================================
var CONFIG = {
  // Nama folder utama di Google Drive Anda
  ROOT_FOLDER_NAME: "Drivegram",
  
  // Nama spreadsheet untuk menyimpan metadata foto
  SHEET_NAME: "Drivegram DB",
  
  // Nama sheet di dalam spreadsheet
  PHOTOS_SHEET: "photos",
  USERS_SHEET: "users",
  SESSIONS_SHEET: "sessions",
  COMMENTS_SHEET: "comments",
  
  // Password sederhana untuk proteksi (opsional, kosongkan untuk tanpa password)
  // Jika diisi, frontend harus mengirim header X-Auth-Password
  AUTH_PASSWORD: ""
};

var PHOTO_HEADERS = [
  "id",
  "filename",
  "caption",
  "tags",
  "fileId",
  "thumbnailUrl",
  "directUrl",
  "size",
  "mimeType",
  "width",
  "height",
  "uploadedAt",
  "updatedAt",
  "albumId"
];

var USER_HEADERS = [
  "id",
  "name",
  "email",
  "passwordHash",
  "salt",
  "role",
  "status",
  "createdAt",
  "updatedAt",
  "approvedAt",
  "approvedBy",
  "profilePhotoUrl",
  "profilePhotoFileId"
];

var SESSION_HEADERS = [
  "token",
  "userId",
  "expiresAt",
  "createdAt",
  "lastSeenAt"
];

var COMMENT_HEADERS = [
  "id",
  "photoId",
  "userId",
  "userName",
  "text",
  "createdAt"
];

// ============================================================
// HANDLER UTAMA
// ============================================================
function doGet(e) {
  var action = e.parameter.action || "getPhotos";
  var callback = e.parameter.callback; // JSONP support
  
  var result;
  try {
    if (action === "getMe") {
      result = getMe(e);
    } else if (action === "listUsers") {
      result = listUsers(e);
    } else if (action === "getPhotos") {
      result = getPhotos(e);
    } else if (action === "getPhoto") {
      result = getPhoto(e);
    } else if (action === "getComments") {
      result = getComments(e);
    } else if (action === "deletePhoto") {
      result = deletePhoto(e);
    } else if (action === "getStats") {
      result = getStats(e);
    } else {
      result = { success: false, error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  
  var json = JSON.stringify(result);
  
  // JSONP untuk bypass CORS jika dibutuhkan
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result;
  
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No POST body received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "";
    
    if (action === "register") {
      result = registerUser(data);
    } else if (action === "login") {
      result = loginUser(data);
    } else if (action === "logout") {
      result = logoutUser(data);
    } else if (action === "changePassword") {
      result = changePassword(data);
    } else if (action === "updateProfile") {
      result = updateProfile(data);
    } else if (action === "setUserApproval") {
      result = setUserApproval(data);
    } else if (action === "setUserRole") {
      result = setUserRole(data);
    } else if (action === "uploadPhoto") {
      result = uploadPhoto(data);
    } else if (action === "deletePhoto") {
      result = deletePhoto(null, data);
    } else if (action === "updatePhoto") {
      result = updatePhoto(null, data);
    } else if (action === "addComment") {
      result = addComment(data);
    } else if (action === "deleteComment") {
      result = deleteComment(data);
    } else {
      result = { success: false, error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { success: false, error: "doPost error: " + err.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// INISIALISASI FOLDER & DATABASE
// ============================================================
function getOrCreateRootFolder() {
  var folders = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.ROOT_FOLDER_NAME);
}

function getOrCreateSpreadsheet() {
  var rootFolder = getOrCreateRootFolder();
  var files = rootFolder.getFilesByName(CONFIG.SHEET_NAME);
  
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.openById(files.next().getId());
  } else {
    ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
    // Pindahkan spreadsheet ke folder root
    var ssFile = DriveApp.getFileById(ss.getId());
    rootFolder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
    
    var sheet = ss.getActiveSheet();
    sheet.setName(CONFIG.PHOTOS_SHEET);
    setupPhotosSheet(sheet);
  }
  
  return ss;
}

function getPhotosSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.PHOTOS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PHOTOS_SHEET);
  }
  setupPhotosSheet(sheet);
  return sheet;
}

function getUsersSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.USERS_SHEET);
  }
  setupSheet(sheet, USER_HEADERS);
  return sheet;
}

function getSessionsSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SESSIONS_SHEET);
  }
  setupSheet(sheet, SESSION_HEADERS);
  return sheet;
}

function getCommentsSheet() {
  var ss = getOrCreateSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.COMMENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.COMMENTS_SHEET);
  }
  setupSheet(sheet, COMMENT_HEADERS);
  return sheet;
}

function setupSheet(sheet, headers) {
  var headerCount = headers.length;
  var lastRow = sheet.getLastRow();
  var firstRow = lastRow > 0 ? sheet.getRange(1, 1, 1, headerCount).getValues()[0] : [];
  var hasHeader = firstRow[0] === headers[0];

  if (!hasHeader) {
    var firstRowHasData = false;
    for (var i = 0; i < firstRow.length; i++) {
      if (firstRow[i] !== "" && firstRow[i] !== null) {
        firstRowHasData = true;
        break;
      }
    }

    if (firstRowHasData) {
      sheet.insertRowBefore(1);
    }

    sheet.getRange(1, 1, 1, headerCount).setValues([headers]);
  } else {
    var currentHeader = sheet.getRange(1, 1, 1, headerCount).getValues()[0];
    var needsHeaderUpdate = false;
    for (var j = 0; j < headers.length; j++) {
      if (currentHeader[j] !== headers[j]) {
        needsHeaderUpdate = true;
        break;
      }
    }
    if (needsHeaderUpdate) {
      sheet.getRange(1, 1, 1, headerCount).setValues([headers]);
    }
  }

  var headerRange = sheet.getRange(1, 1, 1, headerCount);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#0A0A0F");
  headerRange.setFontColor("#C8A96E");
  sheet.setFrozenRows(1);
}

function setupPhotosSheet(sheet) {
  setupSheet(sheet, PHOTO_HEADERS);
}

// ============================================================
// AUTH & USER APPROVAL
// ============================================================
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function digestToHex(bytes) {
  return bytes.map(function(byte) {
    var value = byte;
    if (value < 0) value += 256;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function hashPassword(password, salt) {
  return digestToHex(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + password
  ));
}

function userFromRow(row) {
  return {
    id: row[0],
    name: row[1] || "",
    email: row[2] || "",
    role: row[5] || "user",
    status: row[6] || "pending",
    createdAt: row[7] || "",
    updatedAt: row[8] || "",
    approvedAt: row[9] || "",
    approvedBy: row[10] || "",
    profilePhotoUrl: row[11] || "",
    profilePhotoFileId: row[12] || ""
  };
}

function findUserByEmail(email) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var normalized = normalizeEmail(email);

  for (var i = 1; i < data.length; i++) {
    if (normalizeEmail(data[i][2]) === normalized) {
      return { row: i + 1, raw: data[i], user: userFromRow(data[i]) };
    }
  }

  return null;
}

function findUserById(id) {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return { row: i + 1, raw: data[i], user: userFromRow(data[i]) };
    }
  }

  return null;
}

function countUsers() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) total++;
  }
  return total;
}

function createSession(userId) {
  var sheet = getSessionsSheet();
  var now = new Date();
  var expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  var token = Utilities.getUuid() + "-" + Utilities.getUuid();

  sheet.appendRow([
    token,
    userId,
    expiresAt.toISOString(),
    now.toISOString(),
    now.toISOString()
  ]);

  return {
    token: token,
    expiresAt: expiresAt.toISOString()
  };
}

function requireAuth(token) {
  if (!token) {
    return { success: false, error: "Sesi login diperlukan" };
  }

  var sheet = getSessionsSheet();
  var data = sheet.getDataRange().getValues();
  var now = new Date();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      var expiresAt = new Date(data[i][2]);
      if (expiresAt <= now) {
        sheet.deleteRow(i + 1);
        return { success: false, error: "Sesi login sudah kedaluwarsa" };
      }

      var userRecord = findUserById(data[i][1]);
      if (!userRecord || userRecord.user.status !== "approved") {
        return { success: false, error: "Akun belum disetujui admin" };
      }

      sheet.getRange(i + 1, 5).setValue(now.toISOString());
      return { success: true, user: userRecord.user };
    }
  }

  return { success: false, error: "Sesi login tidak valid" };
}

function requireAdmin(token) {
  var auth = requireAuth(token);
  if (!auth.success) return auth;
  if (auth.user.role !== "admin") {
    return { success: false, error: "Akses admin diperlukan" };
  }
  return auth;
}

function registerUser(data) {
  var name = String(data.name || "").trim();
  var email = normalizeEmail(data.email);
  var password = String(data.password || "");

  if (!name) return { success: false, error: "Nama wajib diisi" };
  if (!email || email.indexOf("@") === -1) return { success: false, error: "Email tidak valid" };
  if (password.length < 6) return { success: false, error: "Password minimal 6 karakter" };
  if (findUserByEmail(email)) return { success: false, error: "Email sudah terdaftar" };

  var firstUser = countUsers() === 0;
  var role = firstUser ? "admin" : "user";
  var status = firstUser ? "approved" : "pending";
  var now = new Date().toISOString();
  var salt = Utilities.getUuid();
  var userId = Utilities.getUuid();
  var sheet = getUsersSheet();

  sheet.appendRow([
    userId,
    name,
    email,
    hashPassword(password, salt),
    salt,
    role,
    status,
    now,
    now,
    firstUser ? now : "",
    firstUser ? "system" : "",
    "",
    ""
  ]);

  var user = {
    id: userId,
    name: name,
    email: email,
    role: role,
    status: status,
    createdAt: now,
    updatedAt: now,
    approvedAt: firstUser ? now : "",
    approvedBy: firstUser ? "system" : "",
    profilePhotoUrl: "",
    profilePhotoFileId: ""
  };

  if (firstUser) {
    var session = createSession(userId);
    return { success: true, user: user, token: session.token, expiresAt: session.expiresAt };
  }

  return { success: true, pending: true, user: user, message: "Registrasi berhasil. Tunggu approval admin." };
}

function loginUser(data) {
  var email = normalizeEmail(data.email);
  var password = String(data.password || "");
  var record = findUserByEmail(email);

  if (!record) return { success: false, error: "Email atau password salah" };
  if (record.raw[3] !== hashPassword(password, record.raw[4])) {
    return { success: false, error: "Email atau password salah" };
  }
  if (record.user.status !== "approved") {
    return { success: false, error: "Akun belum disetujui admin" };
  }

  var session = createSession(record.user.id);
  return { success: true, user: record.user, token: session.token, expiresAt: session.expiresAt };
}

function logoutUser(data) {
  var token = data.token;
  if (!token) return { success: true };

  var sheet = getSessionsSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === token) {
      sheet.deleteRow(i + 1);
    }
  }

  return { success: true };
}

function getMe(e) {
  var auth = requireAuth(e.parameter.token);
  if (!auth.success) return auth;
  return { success: true, user: auth.user };
}

function saveProfilePhoto(userId, filename, mimeType, base64Data) {
  if (!base64Data) return "";

  var decoded;
  try {
    decoded = Utilities.base64Decode(base64Data);
  } catch (err) {
    throw new Error("Gagal membaca foto profil: " + err.toString());
  }

  var maxSize = 5 * 1024 * 1024;
  if (decoded.length > maxSize) {
    throw new Error("Foto profil terlalu besar. Maksimal 5MB.");
  }

  var rootFolder = getOrCreateRootFolder();
  var profileFolder = getOrCreateSubFolder(rootFolder, "Profile Photos");
  var safeName = filename || ("profile_" + userId + ".jpg");
  var blob = Utilities.newBlob(decoded, mimeType || "image/jpeg", safeName);
  var driveFile = profileFolder.createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    url: buildDriveImageUrl(driveFile.getId(), 400),
    fileId: driveFile.getId()
  };
}

function changePassword(data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var currentPassword = String(data.currentPassword || "");
  var newPassword = String(data.newPassword || "");
  if (newPassword.length < 6) return { success: false, error: "Password baru minimal 6 karakter" };

  var record = findUserById(auth.user.id);
  if (!record) return { success: false, error: "User tidak ditemukan" };
  if (record.raw[3] !== hashPassword(currentPassword, record.raw[4])) {
    return { success: false, error: "Password lama tidak sesuai" };
  }

  var salt = Utilities.getUuid();
  var now = new Date().toISOString();
  var sheet = getUsersSheet();
  sheet.getRange(record.row, 4).setValue(hashPassword(newPassword, salt));
  sheet.getRange(record.row, 5).setValue(salt);
  sheet.getRange(record.row, 9).setValue(now);

  return { success: true, user: findUserById(auth.user.id).user };
}

function updateProfile(data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var record = findUserById(auth.user.id);
  if (!record) return { success: false, error: "User tidak ditemukan" };

  var sheet = getUsersSheet();
  var now = new Date().toISOString();
  var name = String(data.name || "").trim();
  if (name) {
    sheet.getRange(record.row, 2).setValue(name);
  }

  if (data.photoBase64) {
    try {
      var profilePhoto = saveProfilePhoto(auth.user.id, data.filename, data.mimeType, data.photoBase64);
      sheet.getRange(record.row, 12).setValue(profilePhoto.url);
      sheet.getRange(record.row, 13).setValue(profilePhoto.fileId);
    } catch (err) {
      return { success: false, error: err.message || err.toString() };
    }
  }

  sheet.getRange(record.row, 9).setValue(now);
  return { success: true, user: findUserById(auth.user.id).user };
}

function listUsers(e) {
  var auth = requireAdmin(e.parameter.token);
  if (!auth.success) return auth;

  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) users.push(userFromRow(data[i]));
  }

  users.sort(function(a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { success: true, users: users };
}

function setUserApproval(data) {
  var auth = requireAdmin(data.token);
  if (!auth.success) return auth;

  var id = data.id;
  var status = data.status === "rejected" ? "rejected" : "approved";
  var record = findUserById(id);
  if (!record) return { success: false, error: "User tidak ditemukan" };

  var now = new Date().toISOString();
  var sheet = getUsersSheet();
  sheet.getRange(record.row, 7).setValue(status);
  sheet.getRange(record.row, 9).setValue(now);
  sheet.getRange(record.row, 10).setValue(status === "approved" ? now : "");
  sheet.getRange(record.row, 11).setValue(status === "approved" ? auth.user.id : "");

  return { success: true, user: findUserById(id).user };
}

function setUserRole(data) {
  var auth = requireAdmin(data.token);
  if (!auth.success) return auth;

  var id = data.id;
  var role = data.role === "admin" ? "admin" : "user";
  var record = findUserById(id);
  if (!record) return { success: false, error: "User tidak ditemukan" };

  var sheet = getUsersSheet();
  sheet.getRange(record.row, 6).setValue(role);
  sheet.getRange(record.row, 9).setValue(new Date().toISOString());

  return { success: true, user: findUserById(id).user };
}

// ============================================================
// UPLOAD FOTO (base64 JSON — satu-satunya cara yang works di GAS)
// Frontend mengirim: { action, filename, mimeType, base64, caption, tags }
// ============================================================
function uploadPhoto(data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var rootFolder = getOrCreateRootFolder();
  var sheet = getPhotosSheet();
  
  var filename = data.filename || ("photo_" + Date.now() + ".jpg");
  var mimeType = data.mimeType || "image/jpeg";
  var base64Data = data.base64;
  var caption = data.caption || "";
  var tags = data.tags || "";
  var albumId = data.albumId || Utilities.getUuid();
  
  if (!base64Data) {
    return { success: false, error: "Tidak ada data foto (base64 kosong)" };
  }
  
  // Decode base64 → bytes
  var decoded;
  try {
    decoded = Utilities.base64Decode(base64Data);
  } catch (err) {
    return { success: false, error: "Gagal decode base64: " + err.toString() };
  }
  
  // Cek ukuran (max 20MB)
  var maxSize = 20 * 1024 * 1024;
  if (decoded.length > maxSize) {
    return { success: false, error: "File terlalu besar. Maksimal 20MB." };
  }
  
  var blob = Utilities.newBlob(decoded, mimeType, filename);
  
  // Subfolder per bulan
  var now = new Date();
  var yearMonthFolder = getOrCreateSubFolder(
    rootFolder,
    now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")
  );
  
  // Simpan ke Drive & set public link
  var driveFile = yearMonthFolder.createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var fileId = driveFile.getId();
  var thumbnailUrl = buildDriveImageUrl(fileId, 600);
  var directUrl = buildDriveImageUrl(fileId, 1600);
  var photoId = Utilities.getUuid();
  
  sheet.appendRow([
    photoId,
    driveFile.getName(),
    caption,
    tags,
    fileId,
    thumbnailUrl,
    directUrl,
    driveFile.getSize(),
    driveFile.getMimeType(),
    "",
    "",
    now.toISOString(),
    now.toISOString(),
    albumId
  ]);
  
  return {
    success: true,
    photo: {
      id: photoId,
      filename: driveFile.getName(),
      caption: caption,
      tags: normalizeTags(tags),
      fileId: fileId,
      thumbnailUrl: thumbnailUrl,
      directUrl: directUrl,
      driveUrl: buildDriveOpenUrl(fileId),
      size: driveFile.getSize(),
      mimeType: driveFile.getMimeType(),
      uploadedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      albumId: albumId
    }
  };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(function(t) { return String(t).trim(); }).filter(Boolean);
  }
  return tags ? String(tags).split(",").map(function(t) { return t.trim(); }).filter(Boolean) : [];
}

function buildDriveImageUrl(fileId, size) {
  return fileId ? "https://lh3.googleusercontent.com/d/" + fileId + "=w" + size : "";
}

function buildDriveOpenUrl(fileId) {
  return fileId ? "https://drive.google.com/file/d/" + fileId + "/view" : "";
}

function photoFromRow(row) {
  var fileId = row[4];
  return {
    id: row[0],
    filename: row[1] || "",
    caption: row[2] || "",
    tags: normalizeTags(row[3]),
    fileId: fileId,
    thumbnailUrl: buildDriveImageUrl(fileId, 600) || row[5],
    directUrl: buildDriveImageUrl(fileId, 1600) || row[6] || row[5],
    driveUrl: buildDriveOpenUrl(fileId),
    size: row[7] || 0,
    mimeType: row[8] || "",
    width: row[9] || "",
    height: row[10] || "",
    uploadedAt: row[11] || "",
    updatedAt: row[12] || "",
    albumId: row[13] || row[0]
  };
}

// ============================================================
// GET SEMUA FOTO
// ============================================================
function getPhotos(e) {
  var auth = requireAuth(e.parameter.token);
  if (!auth.success) return auth;

  var sheet = getPhotosSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, photos: [], total: 0 };
  }
  
  var page = parseInt(e.parameter.page) || 1;
  var limit = parseInt(e.parameter.limit) || 20;
  var tag = e.parameter.tag || "";
  var search = e.parameter.search || "";
  
  // Header row adalah index 0
  var photos = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // skip empty rows
    
    var photo = photoFromRow(row);
    
    // Filter by tag
    if (tag && photo.tags.indexOf(tag) === -1) continue;
    
    // Filter by search (caption atau filename)
    if (search) {
      var searchLower = search.toLowerCase();
      if (
        photo.caption.toLowerCase().indexOf(searchLower) === -1 &&
        photo.filename.toLowerCase().indexOf(searchLower) === -1 &&
        photo.tags.join(",").toLowerCase().indexOf(searchLower) === -1
      ) continue;
    }
    
    photos.push(photo);
  }
  
  // Sort terbaru dulu
  photos.sort(function(a, b) {
    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
  });
  
  // Pagination
  var total = photos.length;
  var start = (page - 1) * limit;
  var paginatedPhotos = photos.slice(start, start + limit);
  
  return {
    success: true,
    photos: paginatedPhotos,
    total: total,
    page: page,
    limit: limit,
    hasMore: start + limit < total
  };
}

// ============================================================
// GET SATU FOTO
// ============================================================
function getPhoto(e) {
  var auth = requireAuth(e.parameter.token);
  if (!auth.success) return auth;

  var id = e.parameter.id;
  if (!id) return { success: false, error: "ID diperlukan" };
  
  var sheet = getPhotosSheet();
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return {
        success: true,
        photo: photoFromRow(data[i])
      };
    }
  }
  
  return { success: false, error: "Foto tidak ditemukan" };
}

// ============================================================
// UPDATE FOTO (caption/tags)
// ============================================================
function updatePhoto(e, data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var id = data.id;
  if (!id) return { success: false, error: "ID diperlukan" };
  
  var sheet = getPhotosSheet();
  var sheetData = sheet.getDataRange().getValues();
  
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === id) {
      var row = i + 1; // 1-indexed
      
      if (data.caption !== undefined) {
        sheet.getRange(row, 3).setValue(data.caption);
      }
      if (data.tags !== undefined) {
        var tagsStr = Array.isArray(data.tags) ? data.tags.join(",") : data.tags;
        sheet.getRange(row, 4).setValue(tagsStr);
      }
      sheet.getRange(row, 13).setValue(new Date().toISOString());
      
      return { success: true, message: "Foto berhasil diupdate" };
    }
  }
  
  return { success: false, error: "Foto tidak ditemukan" };
}

// ============================================================
// DELETE FOTO
// ============================================================
function deletePhoto(e, data) {
  var token = data && data.token ? data.token : (e && e.parameter ? e.parameter.token : "");
  var auth = requireAuth(token);
  if (!auth.success) return auth;

  var id = (data && data.id) ? data.id : (e.parameter ? e.parameter.id : null);
  if (!id) return { success: false, error: "ID diperlukan" };
  
  var sheet = getPhotosSheet();
  var sheetData = sheet.getDataRange().getValues();
  
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === id) {
      var fileId = sheetData[i][4];
      
      // Hapus file dari Drive
      try {
        var driveFile = DriveApp.getFileById(fileId);
        driveFile.setTrashed(true);
      } catch (err) {
        // File mungkin sudah dihapus, lanjutkan
        Logger.log("Warning: Could not delete file " + fileId + ": " + err);
      }
      
      // Hapus baris dari spreadsheet
      sheet.deleteRow(i + 1);
      
      return { success: true, message: "Foto berhasil dihapus" };
    }
  }
  
  return { success: false, error: "Foto tidak ditemukan" };
}

// ============================================================
// KOMENTAR FOTO
// ============================================================
function commentFromRow(row) {
  return {
    id: row[0],
    photoId: row[1],
    userId: row[2],
    userName: row[3] || "User",
    text: row[4] || "",
    createdAt: row[5] || ""
  };
}

function getComments(e) {
  var auth = requireAuth(e.parameter.token);
  if (!auth.success) return auth;

  var photoId = e.parameter.photoId || "";
  if (!photoId) return { success: false, error: "ID foto diperlukan" };

  var sheet = getCommentsSheet();
  var data = sheet.getDataRange().getValues();
  var comments = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === photoId) comments.push(commentFromRow(data[i]));
  }

  comments.sort(function(a, b) {
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return { success: true, comments: comments };
}

function addComment(data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var photoId = data.photoId || "";
  var text = String(data.text || "").trim();
  if (!photoId) return { success: false, error: "ID foto diperlukan" };
  if (!text) return { success: false, error: "Komentar tidak boleh kosong" };
  if (text.length > 500) return { success: false, error: "Komentar maksimal 500 karakter" };

  var now = new Date().toISOString();
  var comment = [
    Utilities.getUuid(),
    photoId,
    auth.user.id,
    auth.user.name || auth.user.email || "User",
    text,
    now
  ];

  getCommentsSheet().appendRow(comment);
  return { success: true, comment: commentFromRow(comment) };
}

function deleteComment(data) {
  var auth = requireAuth(data.token);
  if (!auth.success) return auth;

  var commentId = data.id || "";
  if (!commentId) return { success: false, error: "ID komentar diperlukan" };

  var sheet = getCommentsSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === commentId) {
      if (rows[i][2] !== auth.user.id && auth.user.role !== "admin") {
        return { success: false, error: "Tidak bisa menghapus komentar ini" };
      }
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: "Komentar tidak ditemukan" };
}

// ============================================================
// STATISTIK
// ============================================================
function getStats(e) {
  var auth = requireAuth(e.parameter.token);
  if (!auth.success) return auth;

  var sheet = getPhotosSheet();
  var data = sheet.getDataRange().getValues();
  
  var totalPhotos = 0;
  var totalSize = 0;
  var allTags = {};
  var recentPhotos = [];
  
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    totalPhotos++;
    totalSize += parseInt(data[i][7]) || 0;
    
    var tags = normalizeTags(data[i][3]);
    tags.forEach(function(tag) {
      tag = tag.trim();
      if (tag) {
        allTags[tag] = (allTags[tag] || 0) + 1;
      }
    });
    
    if (i <= 5) {
      var fileId = data[i][4];
      recentPhotos.push({
        id: data[i][0],
        thumbnailUrl: data[i][5] || buildDriveImageUrl(fileId, 600),
        uploadedAt: data[i][11]
      });
    }
  }
  
  // Convert tags object to sorted array
  var tagsArray = Object.keys(allTags).map(function(tag) {
    return { tag: tag, count: allTags[tag] };
  }).sort(function(a, b) { return b.count - a.count; });
  
  return {
    success: true,
    stats: {
      totalPhotos: totalPhotos,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      tags: tagsArray,
      topTags: tagsArray.slice(0, 10)
    }
  };
}

// ============================================================
// HELPER
// ============================================================
function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

// Test function - jalankan dari editor GAS untuk cek setup
function testSetup() {
  var folder = getOrCreateRootFolder();
  Logger.log("Root folder ID: " + folder.getId());
  Logger.log("Root folder URL: " + folder.getUrl());
  
  var ss = getOrCreateSpreadsheet();
  Logger.log("Spreadsheet ID: " + ss.getId());
  Logger.log("Spreadsheet URL: " + ss.getUrl());
  
  Logger.log("Setup berhasil! ✓");
}
