// GET /api/piket-status (siswa)
// data: { status, bolehKirim, namaHariJadwal, jamKirim }
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");
const { waktuWib, dalamSesi, jamKirimWib } = require("./_lib/time");
const { hariJadwal, namaHari } = require("./_lib/schedule");

exports.handler = async (event) => {
  try {
    // Metode, login, dan harus siswa
    const akses = await periksaAkses(event, { metode: ["GET"], role: "siswa" });
    if (akses.respons) return akses.respons;
    const user = akses.user;

    // Absen dari database (bukan dari request)
    if (!Number.isInteger(user.absen)) {
      console.error("piket-status: siswa tanpa nomor absen");
      return gagal("SERVER_ERROR");
    }

    const w = waktuWib();
    const hariSiswa = hariJadwal(user.absen);

    // Sudah ada kiriman hari ini?
    const { data: kiriman, error } = await ambilDb()
      .from("piket_submissions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("tanggal", w.tanggal)
      .maybeSingle();
    if (error) {
      console.error("piket-status: gagal membaca kiriman:", error.message);
      return gagal("SERVER_ERROR");
    }

    // Urutan prioritas (aturan 12)
    let status;
    if (kiriman) {
      status = "SUDAH_KIRIM";
    } else if (!dalamSesi(w)) {
      status = "DI_LUAR_SESI";
    } else if (w.hari !== hariSiswa) {
      status = "TIDAK_PIKET"; // termasuk Sabtu dan Minggu (hari 6 dan 7)
    } else {
      status = "BELUM_KIRIM";
    }

    return sukses({
      status,
      bolehKirim: status === "BELUM_KIRIM",
      namaHariJadwal: namaHari(hariSiswa),
      jamKirim: kiriman ? jamKirimWib(kiriman.created_at) : null,
    });
  } catch (err) {
    console.error("piket-status: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
