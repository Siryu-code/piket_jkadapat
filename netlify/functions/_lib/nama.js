// Merapikan nama menjadi satu format baku. Dipakai oleh login dan skrip akun,
// supaya nama di tabel dan nama yang diketik siswa selalu dibandingkan dengan aturan yang sama.
// Aturan:
//   - apostrof dihapus            (Ma'ruf   -> Maruf)
//   - tanda baca lain jadi spasi  (Al-Fatih -> Al Fatih)
//   - spasi berulang jadi satu, spasi di ujung dibuang
//   - tiap kata berawalan huruf kapital, sisanya huruf kecil
function normalisasiNama(teks) {
  return String(teks === null || teks === undefined ? "" : teks)
    .normalize("NFC")
    .replace(/['’‘`´ʼ]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase())
    .join(" ");
}

module.exports = { normalisasiNama };
