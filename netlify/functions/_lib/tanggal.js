// Pembantu tanggal berbentuk teks 'YYYY-MM-DD' (dipakai endpoint wali).
// Semua hitungan memakai UTC murni supaya tidak terpengaruh zona waktu server.
const POLA = /^\d{4}-\d{2}-\d{2}$/;

function pecah(teks) {
  return teks.split("-").map(Number); // [tahun, bulan, hari]
}

// true bila formatnya YYYY-MM-DD dan tanggalnya benar-benar ada di kalender
// (2026-02-30 ditolak)
function tanggalValid(teks) {
  if (typeof teks !== "string" || !POLA.test(teks)) return false;
  const [t, b, h] = pecah(teks);
  const d = new Date(Date.UTC(t, b - 1, h));
  return (
    d.getUTCFullYear() === t &&
    d.getUTCMonth() === b - 1 &&
    d.getUTCDate() === h
  );
}

// Nomor hari dari sebuah tanggal: 1 = Senin ... 7 = Minggu
function hariDariTanggal(teks) {
  const [t, b, h] = pecah(teks);
  const hari = new Date(Date.UTC(t, b - 1, h)).getUTCDay(); // 0 = Minggu
  return hari === 0 ? 7 : hari;
}

// Menggeser tanggal sejumlah hari (boleh negatif)
function geserHari(teks, jumlah) {
  const [t, b, h] = pecah(teks);
  return new Date(Date.UTC(t, b - 1, h + jumlah)).toISOString().slice(0, 10);
}

// Tanggal bawaan untuk wali: hari ini, atau Jumat terakhir bila Sabtu atau Minggu.
// w = hasil waktuWib()
function tanggalDefaultWali(w) {
  if (w.hari === 6) return geserHari(w.tanggal, -1);
  if (w.hari === 7) return geserHari(w.tanggal, -2);
  return w.tanggal;
}

// Tanggal yang boleh dibuka atau diberi catatan: valid dan tidak lebih dari hari ini
// (perbandingan teks YYYY-MM-DD sama dengan perbandingan urutan tanggal)
function tanggalBolehDibuka(teks, maksTanggal) {
  return tanggalValid(teks) && teks <= maksTanggal;
}

module.exports = {
  tanggalValid,
  hariDariTanggal,
  geserHari,
  tanggalDefaultWali,
  tanggalBolehDibuka,
};
