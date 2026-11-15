// Pembuat respons sukses dan gagal, sesuai kontrak API.

// Kode error -> [status HTTP, pesan untuk ditampilkan]
const KODE_ERROR = {
  TIDAK_LOGIN: [401, "Silakan login lagi"],
  DILARANG: [403, "Kamu tidak punya akses"],
  KREDENSIAL_SALAH: [401, "Nama atau password salah. Periksa penulisan nama."],
  PASSWORD_LAMA_SALAH: [403, "Password lama salah"],
  PASSWORD_BARU_INVALID: [
    400,
    "Password baru minimal 8 karakter dan harus berbeda dari yang lama",
  ],
  BUKAN_HARI_PIKET: [403, "Hari ini bukan jadwal piketmu"],
  DI_LUAR_JAM: [403, "Pengiriman dibuka pukul 05.00 sampai 17.00 WIB"],
  SUDAH_KIRIM: [409, "Kamu sudah mengirim bukti piket hari ini"],
  DI_LUAR_AREA: [403, "Kamu terdeteksi di luar area kelas"],
  AKURASI_BURUK: [
    403,
    "Lokasi kurang akurat, coba lagi di dekat jendela atau nyalakan Precise Location",
  ],
  FOTO_INVALID: [400, "Foto tidak valid, ambil ulang"],
  TANGGAL_INVALID: [400, "Tanggal tidak valid"],
  INPUT_INVALID: [400, "Data yang dikirim tidak valid"],
  TIDAK_DITEMUKAN: [404, "Data tidak ditemukan"],
  METODE_SALAH: [405, "Metode tidak diizinkan"],
  SERVER_ERROR: [500, "Terjadi kesalahan di server, coba lagi"],
};

const HEADER_DASAR = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store", // jangan simpan respons di cache browser
};

// Respons sukses. opsi.cookie (opsional) = teks header Set-Cookie
function sukses(data = {}, opsi = {}) {
  const headers = { ...HEADER_DASAR };
  if (opsi.cookie) headers["Set-Cookie"] = opsi.cookie;
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, data }),
  };
}

// Respons gagal. Kode yang tidak dikenal dianggap SERVER_ERROR.
function gagal(kode) {
  const dikenal = Object.prototype.hasOwnProperty.call(KODE_ERROR, kode);
  const kodeFinal = dikenal ? kode : "SERVER_ERROR";
  const [statusCode, message] = KODE_ERROR[kodeFinal];
  return {
    statusCode,
    headers: { ...HEADER_DASAR },
    body: JSON.stringify({
      ok: false,
      error: { code: kodeFinal, message },
    }),
  };
}

module.exports = { sukses, gagal };
