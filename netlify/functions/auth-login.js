// POST /api/auth-login
// body: { username, password } -> data: { role, panggilan } + cookie sesi
// Catatan: field di request tetap bernama "username" (sesuai api.js),
// tetapi isinya sekarang NAMA LENGKAP siswa atau wali.
const bcrypt = require("bcryptjs");
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { cekMetodeDanCsrf, buatCookieSesi } = require("./_lib/auth");
const { bacaJson } = require("./_lib/body");
const { normalisasiNama } = require("./_lib/nama");

// Hash palsu: dipakai bila nama tidak ditemukan, supaya waktu respons
// mirip dengan nama yang ada (bcrypt sengaja lambat).
const HASH_TIRUAN = bcrypt.hashSync("hash-tiruan-bukan-password-asli", 10);

exports.handler = async (event) => {
  try {
    // 1. Metode dan CSRF
    const salah = cekMetodeDanCsrf(event, ["POST"]);
    if (salah) return salah;

    // 2. Validasi input
    const body = bacaJson(event);
    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.password !== "string"
    ) {
      return gagal("INPUT_INVALID");
    }
    if (
      body.username.trim().length < 1 ||
      body.username.length > 100 ||
      body.password.length < 1 ||
      body.password.length > 200
    ) {
      return gagal("INPUT_INVALID");
    }
    const nama = normalisasiNama(body.username); // "  budi  SANTOSO " -> "Budi Santoso"
    const password = body.password;

    // 3. Cari akun berdasarkan nama (limit 2 untuk mendeteksi nama kembar)
    const { data: baris, error } = await ambilDb()
      .from("users")
      .select("id, role, panggilan, password_hash")
      .eq("nama", nama)
      .limit(2);
    if (error) {
      console.error("auth-login: gagal membaca user:", error.message);
      return gagal("SERVER_ERROR");
    }
    if (baris.length > 1) {
      // Seharusnya mustahil setelah indeks unik dibuat. Ditolak aman.
      console.error("auth-login: ada nama kembar di tabel users");
    }
    const user = baris.length === 1 ? baris[0] : null;

    // 4. Bandingkan password (tetap dijalankan walau akun tidak ada)
    const hash = user ? user.password_hash : HASH_TIRUAN;
    const cocok = await bcrypt.compare(password, hash);
    if (!user || !cocok) return gagal("KREDENSIAL_SALAH");

    // 5. Berhasil: kirim cookie sesi
    return sukses(
      { role: user.role, panggilan: user.panggilan },
      { cookie: buatCookieSesi(user.id) },
    );
  } catch (err) {
    console.error("auth-login: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
