// Pembuat password acak untuk skrip akun.
const crypto = require("crypto");

// Tanpa karakter yang mudah tertukar: 0, O, 1, l, I
const HURUF_BESAR = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // tanpa I dan O
const HURUF_KECIL = "abcdefghijkmnopqrstuvwxyz"; // tanpa l
const ANGKA = "23456789"; // tanpa 0 dan 1
const KARAKTER = HURUF_BESAR + HURUF_KECIL + ANGKA;

function passwordAcak(panjang = 10) {
  let hasil = "";
  for (let i = 0; i < panjang; i++) {
    hasil += KARAKTER[crypto.randomInt(KARAKTER.length)];
  }
  return hasil;
}

module.exports = { passwordAcak };
