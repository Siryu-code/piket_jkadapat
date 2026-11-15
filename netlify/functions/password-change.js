// POST /api/password-change
// body: { lama, baru } -> data: {}
const bcrypt = require("bcryptjs");
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");
const { bacaJson } = require("./_lib/body");

exports.handler = async (event) => {
  try {
    // 1. Metode, CSRF, dan harus sedang login (siswa atau wali)
    const akses = await periksaAkses(event, { metode: ["POST"] });
    if (akses.respons) return akses.respons;
    const user = akses.user;

    // 2. Validasi bentuk input
    const body = bacaJson(event);
    if (
      !body ||
      typeof body.lama !== "string" ||
      typeof body.baru !== "string" ||
      body.lama.length < 1 ||
      body.lama.length > 200 ||
      body.baru.length > 200
    ) {
      return gagal("INPUT_INVALID");
    }
    const { lama, baru } = body;

    // 3. Ambil hash password saat ini dari database
    const db = ambilDb();
    const { data: baris, error } = await db
      .from("users")
      .select("password_hash")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !baris) {
      console.error(
        "password-change: gagal membaca hash:",
        error ? error.message : "user tidak ada",
      );
      return gagal("SERVER_ERROR");
    }

    // 4. Password lama harus benar
    const lamaBenar = await bcrypt.compare(lama, baris.password_hash);
    if (!lamaBenar) return gagal("PASSWORD_LAMA_SALAH");

    // 5. Password baru: minimal 8 karakter, berbeda dari yang lama.
    //    Maksimal 72 byte karena bcrypt hanya membaca 72 byte pertama.
    if (
      baru.length < 8 ||
      Buffer.byteLength(baru, "utf8") > 72 ||
      baru === lama
    ) {
      return gagal("PASSWORD_BARU_INVALID");
    }

    // 6. Simpan hash baru
    const hashBaru = await bcrypt.hash(baru, 10);
    const { error: errUpdate } = await db
      .from("users")
      .update({ password_hash: hashBaru })
      .eq("id", user.id);
    if (errUpdate) {
      console.error("password-change: gagal menyimpan:", errUpdate.message);
      return gagal("SERVER_ERROR");
    }

    return sukses({});
  } catch (err) {
    console.error("password-change: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
