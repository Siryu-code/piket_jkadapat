// js/ui.js
// Helper tampilan yang dipakai bersama oleh semua halaman.
// Semua teks dari server/user dipasang dengan textContent (tanpa innerHTML).

import * as api from "./api.js";

// ==========================================================
// Ikon (SVG dibuat lewat JavaScript, tanpa innerHTML)
// ==========================================================
const NS_SVG = "http://www.w3.org/2000/svg";

// Setiap ikon adalah daftar path pada kotak 24 x 24
const IKON = {
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  kunci: [
    "m21 2-9.6 9.6",
    "m15.5 7.5 3 3L22 7l-3-3",
    "M13 15.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z",
  ],
  kamera: [
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
    "M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  ],
  kalender: [
    "M8 2v4",
    "M16 2v4",
    "M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  ],
  gambar: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
  ],
  panah: ["m12 19-7-7 7-7", "M19 12H5"],
  silang: ["M18 6 6 18", "m6 6 12 12"],
  kirim: [
    "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
    "m21.854 2.147-10.94 10.939",
  ],
  tukarKamera: [
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",
    "M9.5 12h5l-1.5-1.5",
    "M14.5 15h-5l1.5 1.5",
  ],
  keluar: [
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    "m16 17 5-5-5-5",
    "M21 12H9",
  ],
  mata: [
    "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  ],
  mataCoret: [
    "M9.88 9.88a3 3 0 1 0 4.24 4.24",
    "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",
    "M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",
    "m2 2 20 20",
  ],
};

export function buatIkon(nama, ukuran = 20) {
  const svg = document.createElementNS(NS_SVG, "svg");
  svg.setAttribute("width", ukuran);
  svg.setAttribute("height", ukuran);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const d of IKON[nama] || []) {
    const path = document.createElementNS(NS_SVG, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

// ==========================================================
// Tombol tampil/sembunyikan password
// nama: dipakai untuk aria-label, contoh 'password lama'
// ==========================================================
export function pasangTombolMata(tombol, input, nama = "password") {
  function atur(tampil) {
    input.type = tampil ? "text" : "password";
    tombol.setAttribute(
      "aria-label",
      `${tampil ? "Sembunyikan" : "Tampilkan"} ${nama}`,
    );
    tombol.replaceChildren(buatIkon(tampil ? "mataCoret" : "mata", 20));
  }
  atur(false);
  tombol.addEventListener("click", () => atur(input.type === "password"));
}

// ==========================================================
// Membuat elemen
// ==========================================================
// buatElemen('p', 'kelas-css', 'Teks') -> <p class="kelas-css">Teks</p>
export function buatElemen(tag, kelas, teks) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (teks !== undefined && teks !== null) el.textContent = teks;
  return el;
}

// ==========================================================
// Pindah halaman dan peran
// ==========================================================
// Promise-nya tidak pernah selesai: kode setelahnya berhenti dan
// tombol tetap terkunci sampai halaman benar-benar berganti.
export function pindahHalaman(alamat) {
  window.location.replace(alamat);
  return new Promise(() => {});
}

export function halamanUntukPeran(role) {
  if (role === "siswa") return "siswa.html";
  if (role === "wali") return "wali.html";
  return "login.html";
}

// Dipanggil di awal halaman selain login (aturan 8).
// peran: 'siswa' atau 'wali'. Kalau peran tidak cocok, pindah ke halaman yang benar.
// Mengembalikan hasil /api/me ({ ok, data } atau { ok, error }).
export async function pastikanPeran(peran) {
  const hasil = await api.me(); // 401 sudah ditangani di api.js
  if (hasil.ok && hasil.data.role !== peran) {
    return pindahHalaman(halamanUntukPeran(hasil.data.role));
  }
  return hasil;
}

// ==========================================================
// Pesan error di bawah form
// ==========================================================
export function tampilkanError(elemen, pesan) {
  elemen.textContent = pesan;
  elemen.hidden = false;
}

export function bersihkanError(elemen) {
  elemen.textContent = "";
  elemen.hidden = true;
}

// ==========================================================
// Kunci tombol selama proses (cegah klik ganda)
// ==========================================================
export async function jalankanDenganKunci(tombol, proses) {
  if (tombol.disabled) return undefined;
  tombol.disabled = true;
  tombol.setAttribute("aria-busy", "true");
  try {
    return await proses();
  } finally {
    tombol.disabled = false;
    tombol.removeAttribute("aria-busy");
  }
}

// ==========================================================
// Format teks
// ==========================================================
const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// '2026-11-06' -> '6 November 2026' (hanya memotong teks, tidak menghitung tanggal)
export function formatTanggal(iso) {
  const [tahun, bulan, hari] = String(iso).split("-");
  const namaBulan = NAMA_BULAN[Number(bulan) - 1];
  if (!tahun || !namaBulan || !hari) return String(iso);
  return `${Number(hari)} ${namaBulan} ${tahun}`;
}

// '15:42' -> '15.42'
export function formatJam(jam) {
  return String(jam).replace(":", ".");
}

// ==========================================================
// Header + menu hamburger (dipakai di siswa.html dan wali.html)
// Pakai: dokumen.querySelector('.app').prepend(buatHeader());
// ==========================================================
export function buatHeader() {
  const header = buatElemen("header", "header");
  const judul = buatElemen("span", "header-judul", "Piket Kelas");

  const wadah = buatElemen("div", "menu-wadah");

  // Tombol hamburger
  const tombolMenu = buatElemen("button", "tombol-ikon");
  tombolMenu.type = "button";
  tombolMenu.setAttribute("aria-label", "Buka menu");
  tombolMenu.setAttribute("aria-expanded", "false");
  tombolMenu.setAttribute("aria-controls", "menu-panel");
  tombolMenu.appendChild(buatIkon("menu", 24));

  // Panel menu
  const panel = buatElemen("div", "menu-panel");
  panel.id = "menu-panel";
  panel.hidden = true;

  const linkGanti = buatElemen("a", "menu-item");
  linkGanti.href = "ganti-password.html";
  linkGanti.append(buatIkon("kunci"), buatElemen("span", "", "Ganti Password"));

  const tombolKeluar = buatElemen("button", "menu-item");
  tombolKeluar.type = "button";
  tombolKeluar.append(buatIkon("keluar"), buatElemen("span", "", "Keluar"));

  panel.append(linkGanti, tombolKeluar);
  wadah.append(tombolMenu, panel);
  header.append(judul, wadah);

  function tutupMenu() {
    panel.hidden = true;
    tombolMenu.setAttribute("aria-expanded", "false");
  }

  // Buka atau tutup saat tombol hamburger diketuk
  tombolMenu.addEventListener("click", () => {
    const buka = panel.hidden;
    panel.hidden = !buka;
    tombolMenu.setAttribute("aria-expanded", String(buka));
  });

  // Tutup bila mengetuk di luar panel
  document.addEventListener("click", (e) => {
    if (!wadah.contains(e.target)) tutupMenu();
  });

  // Tutup bila menekan Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      tutupMenu();
      tombolMenu.focus();
    }
  });

  // Keluar: konfirmasi, panggil auth-logout, lalu ke login.html
  tombolKeluar.addEventListener("click", () => {
    tutupMenu();
    if (!window.confirm("Yakin ingin keluar?")) return;

    jalankanDenganKunci(tombolKeluar, async () => {
      const hasil = await api.logout();
      if (hasil.ok) return pindahHalaman("login.html");
      window.alert(hasil.error.message);
      return undefined;
    });
  });

  return header;
}
