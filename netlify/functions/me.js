// GET /api/me -> data: { role, nama, panggilan, absen }
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");

exports.handler = async (event) => {
  try {
    const akses = await periksaAkses(event, { metode: ["GET"] });
    if (akses.respons) return akses.respons;

    const u = akses.user;
    // absen bernilai null untuk wali (memang begitu di database)
    return sukses({
      role: u.role,
      nama: u.nama,
      panggilan: u.panggilan,
      absen: u.absen,
    });
  } catch (err) {
    console.error("me: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
