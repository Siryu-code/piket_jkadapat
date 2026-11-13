// js/login.js
// Logika halaman login.html

import { login } from "./api.js";
import {
  buatIkon,
  tampilkanError,
  bersihkanError,
  jalankanDenganKunci,
  halamanUntukPeran,
  pindahHalaman,
} from "./ui.js";

const form = document.getElementById("form-login");
const inputUsername = document.getElementById("username");
const inputPassword = document.getElementById("password");
const tombolMata = document.getElementById("tombol-mata");
const tombolMasuk = document.getElementById("tombol-masuk");
const pesanError = document.getElementById("pesan-error");

// ---------- Tombol tampil/sembunyikan password ----------
function aturTampilPassword(tampil) {
  inputPassword.type = tampil ? "text" : "password";
  tombolMata.setAttribute(
    "aria-label",
    tampil ? "Sembunyikan password" : "Tampilkan password",
  );
  tombolMata.replaceChildren(buatIkon(tampil ? "mataCoret" : "mata", 20));
}

aturTampilPassword(false);

tombolMata.addEventListener("click", () => {
  aturTampilPassword(inputPassword.type === "password");
});

// ---------- Kirim form ----------
form.addEventListener("submit", (e) => {
  e.preventDefault(); // jangan muat ulang halaman

  jalankanDenganKunci(tombolMasuk, async () => {
    bersihkanError(pesanError);

    const hasil = await login(inputUsername.value.trim(), inputPassword.value);

    if (!hasil.ok) {
      tampilkanError(pesanError, hasil.error.message);
      return undefined;
    }

    // Sukses: arahkan sesuai peran
    return pindahHalaman(halamanUntukPeran(hasil.data.role));
  });
});
