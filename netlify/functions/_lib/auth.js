// Sesi login (cookie berisi JWT) dan pemeriksaan akses.
const jwt = require("jsonwebtoken");
const { ambilDb } = require("./db");
const { gagal } = require("./respond");

const NAMA_COOKIE = "sesi";
const UMUR_DETIK = 30 * 24 * 60 * 60; // 30 hari
const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ambilSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diisi atau kurang dari 32 karakter");
  }
  return secret;
}

// Atribut cookie. 'Secure' dimatikan hanya saat berjalan lewat netlify dev (lokal).
function atributCookie(umurDetik) {
  const lokal = process.env.NETLIFY_DEV === "true";
  let atribut = `HttpOnly; SameSite=Strict; Path=/; Max-Age=${umurDetik}`;
  if (!lokal) atribut += "; Secure";
  return atribut;
}

// Teks Set-Cookie untuk login (berisi JWT)
function buatCookieSesi(userId) {
  const token = jwt.sign({}, ambilSecret(), {
    algorithm: "HS256",
    subject: userId,
    expiresIn: UMUR_DETIK,
  });
  return `${NAMA_COOKIE}=${token}; ${atributCookie(UMUR_DETIK)}`;
}

// Teks Set-Cookie untuk logout (cookie yang sama, langsung kedaluwarsa)
function buatCookieHapus() {
  return `${NAMA_COOKIE}=; ${atributCookie(0)}`;
}

// Membaca satu cookie dari header request
function bacaCookie(event, nama) {
  const mentah = (event.headers && event.headers.cookie) || "";
  for (const potong of mentah.split(";")) {
    const i = potong.indexOf("=");
    if (i === -1) continue;
    if (potong.slice(0, i).trim() === nama) return potong.slice(i + 1).trim();
  }
  return null;
}

// Memeriksa metode HTTP dan perlindungan CSRF.
// Mengembalikan respons error bila gagal, atau null bila lolos.
function cekMetodeDanCsrf(event, metodeDiizinkan) {
  if (!metodeDiizinkan.includes(event.httpMethod)) {
    return gagal("METODE_SALAH");
  }

  // CSRF hanya relevan untuk request yang mengubah data
  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    const headers = event.headers || {};

    // Harus JSON (form dari situs lain tidak bisa mengirim tipe ini diam-diam)
    const tipe = String(headers["content-type"] || "").toLowerCase();
    if (!tipe.startsWith("application/json")) return gagal("DILARANG");

    // Bila ada Origin, host-nya harus sama dengan host request
    if (headers.origin !== undefined) {
      try {
        if (new URL(headers.origin).host !== headers.host) {
          return gagal("DILARANG");
        }
      } catch {
        return gagal("DILARANG");
      }
    }
  }
  return null;
}

// Membaca cookie sesi, memverifikasi JWT, lalu mengambil user dari database
// (supaya role dan absen selalu terbaru). Mengembalikan user atau null.
async function ambilUser(event) {
  const token = bacaCookie(event, NAMA_COOKIE);
  if (!token) return null;

  let userId;
  try {
    const isi = jwt.verify(token, ambilSecret(), { algorithms: ["HS256"] });
    userId = isi.sub;
  } catch (err) {
    // Token rusak atau kedaluwarsa: anggap belum login.
    // Tapi kalau masalahnya konfigurasi server, lempar supaya terlihat di log.
    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError"
    ) {
      return null;
    }
    throw err;
  }
  if (typeof userId !== "string" || !POLA_UUID.test(userId)) return null;

  const { data, error } = await ambilDb()
    .from("users")
    .select("id, username, nama, panggilan, absen, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Gagal membaca user: " + error.message);
  return data || null;
}

// Pemeriksaan awal yang dipakai hampir semua endpoint:
// metode -> CSRF -> login -> role.
// Hasil: { respons } bila harus berhenti, atau { user } bila lolos.
async function periksaAkses(event, { metode, role }) {
  const salah = cekMetodeDanCsrf(event, metode);
  if (salah) return { respons: salah };

  const user = await ambilUser(event);
  if (!user) return { respons: gagal("TIDAK_LOGIN") };
  if (role && user.role !== role) return { respons: gagal("DILARANG") };
  return { user };
}

module.exports = {
  buatCookieSesi,
  buatCookieHapus,
  cekMetodeDanCsrf,
  ambilUser,
  periksaAkses,
};
