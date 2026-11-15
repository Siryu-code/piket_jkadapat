// GET /api/wali-day?tanggal=YYYY-MM-DD (wali)
// Tanpa parameter tanggal = tanggal default dari server.
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");
const { waktuWib, lewatTutup, jamKirimWib } = require("./_lib/time");
const { hariJadwal, namaHari } = require("./_lib/schedule");
const {
  hariDariTanggal,
  tanggalDefaultWali,
  tanggalBolehDibuka,
} = require("./_lib/tanggal");

exports.handler = async (event) => {
  try {
    // 1. Metode, login, dan harus wali
    const akses = await periksaAkses(event, { metode: ["GET"], role: "wali" });
    if (akses.respons) return akses.respons;

    // 2. Tentukan tanggal (maksTanggal = hari ini WIB)
    const w = waktuWib();
    const maksTanggal = w.tanggal;
    const query = event.queryStringParameters || {};

    let tanggal;
    if (query.tanggal === undefined) {
      tanggal = tanggalDefaultWali(w);
    } else if (tanggalBolehDibuka(query.tanggal, maksTanggal)) {
      tanggal = query.tanggal;
    } else {
      return gagal("TANGGAL_INVALID"); // format salah, tidak ada di kalender, atau masa depan
    }

    const hari = hariDariTanggal(tanggal);
    const adaJadwal = hari <= 5; // Sabtu dan Minggu tidak ada piket
    const db = ambilDb();

    // 3. Catatan harian (selalu dikembalikan, '' bila kosong)
    const { data: catatanBaris, error: errCatatan } = await db
      .from("daily_notes")
      .select("catatan")
      .eq("tanggal", tanggal)
      .maybeSingle();
    if (errCatatan) {
      console.error("wali-day: gagal membaca catatan:", errCatatan.message);
      return gagal("SERVER_ERROR");
    }

    // 4. Daftar siswa (kosong pada Sabtu dan Minggu)
    let siswa = [];
    if (adaJadwal) {
      const { data: kiriman, error: errKiriman } = await db
        .from("piket_submissions")
        .select("id, user_id, created_at, pesan")
        .eq("tanggal", tanggal);
      if (errKiriman) {
        console.error("wali-day: gagal membaca kiriman:", errKiriman.message);
        return gagal("SERVER_ERROR");
      }

      const { data: daftar, error: errSiswa } = await db
        .from("users")
        .select("id, panggilan, absen")
        .eq("role", "siswa")
        .order("absen", { ascending: true });
      if (errSiswa) {
        console.error("wali-day: gagal membaca siswa:", errSiswa.message);
        return gagal("SERVER_ERROR");
      }

      const kirimanPerUser = new Map(kiriman.map((k) => [k.user_id, k]));

      // Aturan 13: BELUM_KIRIM hanya bila tanggalnya hari ini dan jam belum lewat 17:00
      const masihBisaKirim = tanggal === w.tanggal && !lewatTutup(w);

      // Siswa yang terjadwal pada hari itu, ditambah siswa lain yang punya kiriman
      siswa = daftar
        .filter((s) => hariJadwal(s.absen) === hari || kirimanPerUser.has(s.id))
        .map((s) => {
          const k = kirimanPerUser.get(s.id);
          if (k) {
            return {
              kirimanId: k.id,
              panggilan: s.panggilan,
              absen: s.absen,
              status: "SUDAH_KIRIM",
              jamKirim: jamKirimWib(k.created_at),
              pesan: k.pesan || null,
            };
          }
          return {
            kirimanId: null,
            panggilan: s.panggilan,
            absen: s.absen,
            status: masihBisaKirim ? "BELUM_KIRIM" : "TIDAK_KIRIM",
            jamKirim: null,
            pesan: null,
          };
        });
    }

    // 5. Respons (tanpa link foto)
    return sukses({
      tanggal,
      maksTanggal,
      namaHari: namaHari(hari),
      adaJadwal,
      ringkasan: {
        sudah: siswa.filter((s) => s.status === "SUDAH_KIRIM").length,
        total: siswa.length,
      },
      catatan: catatanBaris ? catatanBaris.catatan : "",
      siswa,
    });
  } catch (err) {
    console.error("wali-day: error tak terduga:", err.message);
    return gagal("SERVER_ERROR");
  }
};
