// PUT /api/wali-note (wali)
// body: { tanggal, catatan } -> data: {}
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");
const { bacaJson } = require("./_lib/body");
const { waktuWib } = require("./_lib/time");
const { tanggalBolehDibuka } = require("./_lib/tanggal");

const MAKS_CATATAN = 1000;

exports.handler = async (event) => {
  try {
    // 1. Metode, CSRF, login, dan harus wali
    const akses = await periksaAkses(event, { metode: ["PUT"], role: "wali" });
    if (akses.respons) return akses.respons;
    const user = akses.user;

    // 2. Validasi input
    const body = bacaJson(event);
    if (
      !body ||
      typeof body.tanggal !== "string" ||
      typeof body.catatan !== "string"
    ) {
      return gagal("INPUT_INVALID");
    }
    if (!tanggalBolehDibuka(body.tanggal, waktuWib().tanggal)) {
      return gagal("TANGGAL_INVALID");
    }
    const catatan = body.catatan.trim();
    if (catatan.length > MAKS_CATATAN) return gagal("INPUT_INVALID");

    // 3. Simpan: satu catatan per tanggal (upsert pada kolom tanggal)
    const { error } = await ambilDb().from("daily_notes").upsert(
      {
        tanggal: body.tanggal,
        catatan,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tanggal" },
    );
    if (error) {
      console.error("wali-note: gagal menyimpan:", error.message);
      return gagal("SERVER_ERROR");
    }

    return sukses({});
  } catch (err) {
    console.error("wali-note: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
