// POST /api/auth-login
// body: { username, password } -> data: { role, panggilan } + cookie sesi
const bcrypt = require("bcryptjs");
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { cekMetodeDanCsrf, buatCookieSesi } = require("./_lib/auth");
const { bacaJson } = require("./_lib/body");

// Hash palsu: dipakai bila username tidak ada, supaya waktu respons
// mirip dengan username yang ada (bcrypt sengaja lambat).
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
    const username = body.username.trim().toLowerCase();
    const password = body.password;
    if (
      username.length < 1 ||
      username.length > 50 ||
      password.length < 1 ||
      password.length > 200
    ) {
      return gagal("INPUT_INVALID");
    }

    // 3. Cari user berdasarkan username
    const { data: user, error } = await ambilDb()
      .from("users")
      .select("id, role, panggilan, password_hash")
      .eq("username", username)
      .maybeSingle();
    if (error) {
      console.error("auth-login: gagal membaca user:", error.message);
      return gagal("SERVER_ERROR");
    }

    // 4. Bandingkan password (tetap dijalankan walau user tidak ada)
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
