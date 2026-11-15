// POST /api/piket-submit (siswa)
// body: { foto, pesan, latitude, longitude, akurasi } -> data: { jamKirim }
const { ambilDb } = require("./_lib/db");
const { sukses, gagal } = require("./_lib/respond");
const { periksaAkses } = require("./_lib/auth");
const { bacaJson } = require("./_lib/body");
const { waktuWib, dalamSesi, jamKirimWib } = require("./_lib/time");
const { hariJadwal } = require("./_lib/schedule");
const { jarakMeter } = require("./_lib/geo");

const MAKS_BODY_BYTE = 2.5 * 1024 * 1024; // body request maksimal 2,5 MB
const MAKS_FOTO_BYTE = 1.5 * 1024 * 1024; // hasil dekode foto maksimal 1,5 MB
const MAKS_PESAN = 200;
const POLA_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Angka bilangan nyata dalam rentang tertentu (bukan teks, bukan NaN)
function angkaDi(nilai, min, maks) {
  return (
    typeof nilai === "number" &&
    Number.isFinite(nilai) &&
    nilai >= min &&
    nilai <= maks
  );
}

// Angka positif dari environment, atau nilai bawaan
function angkaEnv(nama, bawaan) {
  const angka = Number(process.env[nama]);
  return process.env[nama] && Number.isFinite(angka) && angka > 0
    ? angka
    : bawaan;
}

// Titik pusat kelas dari environment
function koordinatKelas() {
  const lat = parseFloat(process.env.CLASS_LAT);
  const lng = parseFloat(process.env.CLASS_LNG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("CLASS_LAT atau CLASS_LNG belum diisi di environment");
  }
  return { lat, lng };
}

// Mengubah teks base64 menjadi Buffer JPEG, atau null bila tidak valid.
// Syarat: base64 murni (tanpa awalan data:), maksimal 1,5 MB, tiga byte awal FF D8 FF.
function bacaFotoJpeg(foto) {
  if (typeof foto !== "string" || foto.length === 0) return null;
  if (foto.length > Math.ceil((MAKS_FOTO_BYTE * 4) / 3) + 8) return null; // terlalu besar
  if (!POLA_BASE64.test(foto)) return null;

  const isi = Buffer.from(foto, "base64");
  if (isi.length < 3 || isi.length > MAKS_FOTO_BYTE) return null;
  if (isi[0] !== 0xff || isi[1] !== 0xd8 || isi[2] !== 0xff) return null;
  return isi;
}

// Apakah error unggah berarti "file sudah ada"?
function fileSudahAda(err) {
  return (
    String(err.statusCode) === "409" ||
    err.status === 409 ||
    /already exists/i.test(err.message || "")
  );
}

// Hapus file di storage (upaya terbaik, kegagalan hanya dicatat)
async function hapusFile(db, bucket, path) {
  try {
    const { error } = await db.storage.from(bucket).remove([path]);
    if (error)
      console.error("piket-submit: gagal menghapus file:", error.message);
  } catch (err) {
    console.error("piket-submit: gagal menghapus file:", err.message);
  }
}

exports.handler = async (event) => {
  // Bila file sudah terunggah tapi proses gagal, file ini harus dihapus lagi
  let fileBaru = null;

  try {
    // 1. Metode, CSRF, login, dan harus siswa
    const akses = await periksaAkses(event, {
      metode: ["POST"],
      role: "siswa",
    });
    if (akses.respons) return akses.respons;
    const user = akses.user; // absen dan role dari database, bukan dari body

    // 2. Hari jadwal (Sabtu dan Minggu otomatis tidak cocok)
    const w = waktuWib();
    if (w.hari !== hariJadwal(user.absen)) return gagal("BUKAN_HARI_PIKET");

    // 3. Jam sesi
    if (!dalamSesi(w)) return gagal("DI_LUAR_JAM");

    // 4. Sudah ada kiriman hari ini?
    const db = ambilDb();
    const { count, error: errCek } = await db
      .from("piket_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tanggal", w.tanggal);
    if (errCek) {
      console.error("piket-submit: gagal memeriksa kiriman:", errCek.message);
      return gagal("SERVER_ERROR");
    }
    if (count > 0) return gagal("SUDAH_KIRIM");

    // 5. Validasi body
    //    Body terlalu besar hanya mungkin karena fotonya, jadi dianggap FOTO_INVALID
    if (Buffer.byteLength(event.body || "", "utf8") > MAKS_BODY_BYTE) {
      return gagal("FOTO_INVALID");
    }
    const body = bacaJson(event, MAKS_BODY_BYTE);
    if (!body) return gagal("INPUT_INVALID");

    // Hanya field ini yang dibaca. Field lain (absen, role, user_id, tanggal, dst.) diabaikan.
    const { foto, latitude, longitude, akurasi } = body;
    let pesan = body.pesan;

    if (pesan === undefined || pesan === null) {
      pesan = null;
    } else if (typeof pesan === "string") {
      pesan = pesan.trim();
      if (pesan.length > MAKS_PESAN) return gagal("INPUT_INVALID");
      if (pesan === "") pesan = null;
    } else {
      return gagal("INPUT_INVALID");
    }

    if (
      !angkaDi(latitude, -90, 90) ||
      !angkaDi(longitude, -180, 180) ||
      !angkaDi(akurasi, 0, 1000000)
    ) {
      return gagal("INPUT_INVALID");
    }

    const jpeg = bacaFotoJpeg(foto);
    if (!jpeg) return gagal("FOTO_INVALID");

    // 6. Akurasi dulu, lalu jarak ke titik kelas
    const kelas = koordinatKelas();
    if (akurasi > angkaEnv("MAX_ACCURACY_M", 150))
      return gagal("AKURASI_BURUK");
    const jarak = jarakMeter(kelas.lat, kelas.lng, latitude, longitude);
    if (jarak > angkaEnv("CLASS_RADIUS_M", 150)) return gagal("DI_LUAR_AREA");

    // 7. Unggah foto (upsert false: bila file sudah ada berarti sudah pernah kirim)
    const bucket = process.env.STORAGE_BUCKET || "piket-foto";
    const path = `${w.tanggal}/${user.id}.jpg`;
    const { error: errUnggah } = await db.storage
      .from(bucket)
      .upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
    if (errUnggah) {
      if (fileSudahAda(errUnggah)) return gagal("SUDAH_KIRIM"); // file milik kiriman lain, jangan dihapus
      console.error("piket-submit: gagal mengunggah:", errUnggah.message);
      return gagal("SERVER_ERROR");
    }
    fileBaru = { db, bucket, path };

    // 8. Simpan barisnya
    const { data: baris, error: errSimpan } = await db
      .from("piket_submissions")
      .insert({
        user_id: user.id,
        tanggal: w.tanggal,
        foto_path: path,
        pesan,
        latitude,
        longitude,
        akurasi_m: akurasi,
        jarak_m: jarak,
      })
      .select("created_at")
      .single();

    if (errSimpan) {
      await hapusFile(db, bucket, path);
      fileBaru = null;
      if (errSimpan.code === "23505") return gagal("SUDAH_KIRIM"); // aturan unik terlanggar
      console.error(
        "piket-submit: gagal menyimpan:",
        errSimpan.code,
        errSimpan.message,
      );
      return gagal("SERVER_ERROR");
    }

    fileBaru = null; // semua berhasil, file jangan dihapus
    return sukses({ jamKirim: jamKirimWib(baris.created_at) });
  } catch (err) {
    console.error("piket-submit: error tak terduga:", err.message);
    if (fileBaru) await hapusFile(fileBaru.db, fileBaru.bucket, fileBaru.path);
    return gagal("SERVER_ERROR");
  }
};
