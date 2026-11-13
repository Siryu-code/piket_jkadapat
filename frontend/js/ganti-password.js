// js/ganti-password.js
// Logika halaman ganti-password.html

import { me, passwordChange } from "./api.js";
import {
  buatIkon,
  pasangTombolMata,
  tampilkanError,
  bersihkanError,
  jalankanDenganKunci,
  halamanUntukPeran,
  pindahHalaman,
} from "./ui.js";

const JEDA_KEMBALI_MS = 1500;
const MIN_PANJANG_BARU = 8;

const tombolKembali = document.getElementById("tombol-kembali");
const form = document.getElementById("form-password");
const inputLama = document.getElementById("password-lama");
const inputBaru = document.getElementById("password-baru");
const inputKonfirmasi = document.getElementById("password-konfirmasi");
const tombolSimpan = document.getElementById("tombol-simpan");
const pesanError = document.getElementById("pesan-error");
const pesanSukses = document.getElementById("pesan-sukses");

// Halaman asal. 'index.html' hanya cadangan sampai peran diketahui
// (index.html lalu mengarahkan sesuai peran).
let asal = "index.html";

// ---------- Pasang ikon dan tombol mata ----------
tombolKembali.append(buatIkon("panah", 24));
pasangTombolMata(
  document.getElementById("mata-lama"),
  inputLama,
  "password lama",
);
pasangTombolMata(
  document.getElementById("mata-baru"),
  inputBaru,
  "password baru",
);
pasangTombolMata(
  document.getElementById("mata-konfirmasi"),
  inputKonfirmasi,
  "konfirmasi password",
);

// ---------- Tentukan halaman asal dari /api/me ----------
async function tentukanAsal() {
  const hasil = await me(); // 401 otomatis dialihkan ke login.html oleh api.js
  if (!hasil.ok) {
    tampilkanError(pesanError, hasil.error.message);
    return;
  }
  asal = halamanUntukPeran(hasil.data.role);
  tombolKembali.href = asal;
}

// ---------- Validasi di browser ----------
// Mengembalikan teks error, atau null kalau semuanya benar
function validasi(lama, baru, konfirmasi) {
  if (!lama || !baru || !konfirmasi) return "Semua kolom wajib diisi.";
  if (baru.length < MIN_PANJANG_BARU)
    return "Password baru minimal 8 karakter.";
  if (baru === lama) return "Password baru harus berbeda dari password lama.";
  if (baru !== konfirmasi)
    return "Konfirmasi password tidak sama dengan password baru.";
  return null;
}

function tunggu(ms) {
  return new Promise((selesai) => setTimeout(selesai, ms));
}

// ---------- Simpan ----------
async function simpan() {
  bersihkanError(pesanError);
  pesanSukses.hidden = true;

  // Password tidak di-trim: spasi bisa jadi bagian dari password
  const lama = inputLama.value;
  const baru = inputBaru.value;
  const konfirmasi = inputKonfirmasi.value;

  const pesanValidasi = validasi(lama, baru, konfirmasi);
  if (pesanValidasi) {
    tampilkanError(pesanError, pesanValidasi);
    return undefined;
  }

  const hasil = await passwordChange(lama, baru);
  if (!hasil.ok) {
    tampilkanError(pesanError, hasil.error.message);
    return undefined;
  }

  // Sukses: kosongkan isian, beri kabar, lalu kembali setelah 1,5 detik.
  // Tombol tetap terkunci sampai halaman berpindah.
  inputLama.value = "";
  inputBaru.value = "";
  inputKonfirmasi.value = "";
  pesanSukses.textContent = "Password berhasil diubah";
  pesanSukses.hidden = false;

  await tunggu(JEDA_KEMBALI_MS);
  return pindahHalaman(asal);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  jalankanDenganKunci(tombolSimpan, simpan);
});

tentukanAsal();
