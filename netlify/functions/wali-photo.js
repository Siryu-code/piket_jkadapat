// GET /api/wali-photo?id=<kirimanId> (wali)
// data: { url, kedaluwarsaDetik }  (link sementara, bukan URL publik)
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");

const UMUR_LINK_DETIK = 300; // 5 menit
const POLA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.handler = async (event) => {
  try {
    // 1. Metode, login, dan harus wali
    const akses = await periksaAkses(event, { metode: ["GET"], role: "wali" });
    if (akses.respons) return akses.respons;

    // 2. id wajib ada dan berbentuk UUID. Bentuk salah = input tidak valid (400).
    const id = (event.queryStringParameters || {}).id;
    if (typeof id !== "string" || !POLA_UUID.test(id)) {
      return gagal("INPUT_INVALID");
    }

    // 3. Cari kiriman
    const db = ambilDb();
    const { data: kiriman, error } = await db
      .from("piket_submissions")
      .select("foto_path")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("wali-photo: gagal membaca kiriman:", error.message);
      return gagal("SERVER_ERROR");
    }
    if (!kiriman) return gagal("TIDAK_DITEMUKAN");

    // 4. Buat link sementara 300 detik
    const bucket = process.env.STORAGE_BUCKET || "piket-foto";
    const { data: link, error: errLink } = await db.storage
      .from(bucket)
      .createSignedUrl(kiriman.foto_path, UMUR_LINK_DETIK);
    if (errLink || !link || !link.signedUrl) {
      const pesan = errLink ? errLink.message || "" : "link kosong";
      console.error("wali-photo: gagal membuat link:", pesan);
      // Barisnya ada tapi file di bucket tidak ada
      if (/not found/i.test(pesan)) return gagal("TIDAK_DITEMUKAN");
      return gagal("SERVER_ERROR");
    }

    return sukses({ url: link.signedUrl, kedaluwarsaDetik: UMUR_LINK_DETIK });
  } catch (err) {
    console.error("wali-photo: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
