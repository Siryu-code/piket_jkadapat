// Jadwal piket: siswa dengan nomor absen tertentu piket di hari tertentu.

const NAMA_HARI = [
  "", // indeks 0 tidak dipakai
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

// Absen 1..34 -> hari 1..5 (Senin sampai Jumat), berulang tiap 5 absen
function hariJadwal(absen) {
  return ((absen - 1) % 5) + 1;
}

// Nomor hari (1..7) -> nama hari
function namaHari(hari) {
  return NAMA_HARI[hari] || "";
}

module.exports = { hariJadwal, namaHari };
