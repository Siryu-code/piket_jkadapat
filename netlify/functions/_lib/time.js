// Waktu dalam zona Asia/Jakarta (WIB).
// Server Netlify berjalan dalam UTC, jadi zona dihitung dengan Intl.
const ZONA = "Asia/Jakarta";

const formatWib = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23", // jam 0-23 (tengah malam = 00, bukan 24)
});

const NOMOR_HARI = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Waktu "sekarang". KHUSUS PENGEMBANGAN: hanya bila berjalan lewat netlify dev
// (NETLIFY_DEV === "true") dan DEV_FAKE_NOW terisi, waktu palsu dipakai.
// Di produksi NETLIFY_DEV tidak pernah ada, jadi cabang ini tidak pernah jalan.
function waktuSekarang() {
  if (process.env.NETLIFY_DEV === "true" && process.env.DEV_FAKE_NOW) {
    const palsu = new Date(process.env.DEV_FAKE_NOW);
    if (Number.isNaN(palsu.getTime())) {
      throw new Error("DEV_FAKE_NOW bukan format ISO yang valid");
    }
    return palsu;
  }
  return new Date();
}

// Mengembalikan waktu WIB dari sebuah Date (default: sekarang)
// { tanggal: 'YYYY-MM-DD', hari: 1..7 (1 = Senin), jam, menit, detik, detikDalamHari }
function waktuWib(sekarang = waktuSekarang()) {
  const bagian = {};
  for (const p of formatWib.formatToParts(sekarang)) {
    bagian[p.type] = p.value;
  }
  const jam = Number(bagian.hour) % 24;
  const menit = Number(bagian.minute);
  const detik = Number(bagian.second);
  return {
    tanggal: `${bagian.year}-${bagian.month}-${bagian.day}`,
    hari: NOMOR_HARI[bagian.weekday],
    jam,
    menit,
    detik,
    detikDalamHari: jam * 3600 + menit * 60 + detik,
  };
}

function duaDigit(angka) {
  return String(angka).padStart(2, "0");
}

// Mengubah created_at (teks ISO dari database) menjadi 'HH:MM' WIB
function jamKirimWib(waktuIso) {
  const tanggal = new Date(waktuIso);
  if (Number.isNaN(tanggal.getTime())) return null;
  const w = waktuWib(tanggal);
  return `${duaDigit(w.jam)}:${duaDigit(w.menit)}`;
}

// Jam buka dan tutup dari environment (default 5 dan 17)
function bacaJam(nama, bawaan) {
  const angka = parseInt(process.env[nama], 10);
  return Number.isInteger(angka) && angka >= 0 && angka <= 23 ? angka : bawaan;
}

// true bila waktu berada dalam sesi pengiriman (termasuk tepat jam buka
// dan tepat jam tutup: 05:00:00 sampai 17:00:00)
function dalamSesi(
  w,
  jamBuka = bacaJam("OPEN_HOUR", 5),
  jamTutup = bacaJam("CLOSE_HOUR", 17),
) {
  return (
    w.detikDalamHari >= jamBuka * 3600 && w.detikDalamHari <= jamTutup * 3600
  );
}

// true bila waktu sudah LEWAT jam tutup (sesudah 17:00:00).
// Tepat 17:00:00 belum dianggap lewat, sama seperti aturan sesi.
function lewatTutup(w, jamTutup = bacaJam("CLOSE_HOUR", 17)) {
  return w.detikDalamHari > jamTutup * 3600;
}

module.exports = { waktuWib, jamKirimWib, dalamSesi, lewatTutup };
