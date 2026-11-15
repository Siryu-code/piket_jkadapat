// Memuat file .env (di root repo) ke process.env untuk skrip lokal.
// Nilai yang sudah ada di environment tidak ditimpa.
const fs = require("fs");
const path = require("path");

function muatEnv() {
  const lokasi = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(lokasi)) {
    throw new Error("File .env tidak ditemukan di root repo");
  }
  for (const baris of fs.readFileSync(lokasi, "utf8").split(/\r?\n/)) {
    const teks = baris.trim();
    if (!teks || teks.startsWith("#")) continue;
    const i = teks.indexOf("=");
    if (i === -1) continue;
    const nama = teks.slice(0, i).trim();
    let nilai = teks.slice(i + 1).trim();
    // buang tanda kutip di awal dan akhir bila ada
    if (/^(".*"|'.*')$/.test(nilai)) nilai = nilai.slice(1, -1);
    if (process.env[nama] === undefined) process.env[nama] = nilai;
  }
}

module.exports = { muatEnv };
