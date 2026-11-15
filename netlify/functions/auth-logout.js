// POST /api/auth-logout -> data: {} + cookie dihapus
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses, buatCookieHapus } = require("./_lib/auth");

exports.handler = async (event) => {
  try {
    // Metode, CSRF, dan harus sedang login (siswa atau wali)
    const akses = await periksaAkses(event, { metode: ["POST"] });
    if (akses.respons) return akses.respons;

    return sukses({}, { cookie: buatCookieHapus() });
  } catch (err) {
    console.error("auth-logout: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
