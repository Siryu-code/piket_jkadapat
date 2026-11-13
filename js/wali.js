// js/wali.js
// Logika halaman wali.html: ringkasan harian, catatan, daftar siswa, popup foto.
// Semua teks dari server dipasang dengan textContent. Foto TIDAK dimuat saat daftar dibuka.

import { waliDay, waliPhoto, waliNote } from "./api.js";
import {
  buatElemen,
  buatHeader,
  buatIkon,
  formatJam,
  formatTanggal,
  jalankanDenganKunci,
  pastikanPeran,
  tampilkanError,
  bersihkanError,
} from "./ui.js";

// ---------- Elemen ----------
const app = document.querySelector(".app");
const tombolTanggal = document.getElementById("tombol-tanggal");
const teksTanggal = document.getElementById("teks-tanggal");
const ikonTanggal = document.getElementById("ikon-tanggal");
const inputTanggal = document.getElementById("input-tanggal");
const pillRingkasan = document.getElementById("pill-ringkasan");
const pesanError = document.getElementById("pesan-error");

const inputCatatan = document.getElementById("input-catatan");
const tombolSimpan = document.getElementById("tombol-simpan");
const pesanCatatan = document.getElementById("pesan-catatan");

const teksKosong = document.getElementById("teks-kosong");
const daftarSiswa = document.getElementById("daftar-siswa");

const lapisanFoto = document.getElementById("lapisan-foto");
const pengisiFoto = document.getElementById("pengisi-foto");
const gambarPopup = document.getElementById("gambar-popup");
const gagalFoto = document.getElementById("gagal-foto");
const tombolTutupPopup = document.getElementById("tombol-tutup-popup");

// Tampilan tag status: [teks, kelas CSS]
const TAG_STATUS = {
  SUDAH_KIRIM: ["Sudah kirim", "pill-solid"],
  BELUM_KIRIM: ["Belum kirim", "pill-pucat"],
  TIDAK_KIRIM: ["Tidak kirim", "pill-pucat"],
};

// ---------- Keadaan ----------
let tanggalSaatIni = null; // tanggal yang sedang tampil (dari server)
let catatanTersimpan = ""; // catatan terakhir yang tersimpan di server

// ==========================================================
// CATATAN
// ==========================================================
// Textarea tumbuh sesuai isi (minimal 2 baris lewat atribut rows)
function sesuaikanTinggi() {
  inputCatatan.style.height = "auto";
  inputCatatan.style.height = `${inputCatatan.scrollHeight}px`;
}

// Tombol Simpan aktif hanya jika teks berbeda dari yang tersimpan
function perbaruiTombolSimpan() {
  tombolSimpan.disabled =
    tanggalSaatIni === null || inputCatatan.value === catatanTersimpan;
}

inputCatatan.addEventListener("input", () => {
  sesuaikanTinggi();
  perbaruiTombolSimpan();
});

tombolSimpan.addEventListener("click", async () => {
  await jalankanDenganKunci(tombolSimpan, async () => {
    bersihkanError(pesanCatatan);

    const tanggal = tanggalSaatIni;
    const teks = inputCatatan.value;
    const hasil = await waliNote(tanggal, teks);

    if (!hasil.ok) {
      tampilkanError(pesanCatatan, hasil.error.message);
      return;
    }
    // Perbarui nilai tersimpan (kecuali tanggal sudah diganti saat menunggu)
    if (tanggal === tanggalSaatIni) catatanTersimpan = teks;
  });
  // Dipanggil setelah kunci dilepas supaya tombol kembali redup bila sudah tersimpan
  perbaruiTombolSimpan();
});

// ==========================================================
// DAFTAR SISWA
// ==========================================================
function buatKartu(siswa) {
  const kartu = buatElemen("li", "kartu kartu-siswa");

  // Baris atas: nama + absen di kiri, tag + jam di kanan
  const nama = buatElemen("p", "kartu-nama");
  nama.append(
    buatElemen("span", "", siswa.panggilan),
    buatElemen("span", "kartu-absen", `Absen ${siswa.absen}`),
  );

  const [teksTag, kelasTag] =
    TAG_STATUS[siswa.status] || TAG_STATUS.BELUM_KIRIM;
  const status = buatElemen("div", "kartu-status");
  status.appendChild(buatElemen("span", `pill ${kelasTag}`, teksTag));
  if (siswa.status === "SUDAH_KIRIM" && siswa.jamKirim) {
    status.appendChild(
      buatElemen("span", "kartu-jam", formatJam(siswa.jamKirim)),
    );
  }

  const atas = buatElemen("div", "kartu-atas");
  atas.append(nama, status);
  kartu.appendChild(atas);

  // Pesan ditampilkan penuh, hanya jika ada
  if (siswa.pesan)
    kartu.appendChild(buatElemen("p", "kartu-pesan", siswa.pesan));

  // Tombol Lihat foto: aktif hanya untuk SUDAH_KIRIM. Kartu sendiri tidak bisa diklik.
  const tombolFoto = buatElemen(
    "button",
    "tombol tombol-outline tombol-kecil",
    "Lihat foto",
  );
  tombolFoto.type = "button";
  const bisaLihat = siswa.status === "SUDAH_KIRIM" && Boolean(siswa.kirimanId);
  tombolFoto.disabled = !bisaLihat;
  if (bisaLihat) {
    tombolFoto.addEventListener("click", () =>
      bukaPopup(siswa.kirimanId, tombolFoto),
    );
  }

  const bawah = buatElemen("div", "kartu-bawah");
  bawah.appendChild(tombolFoto);
  kartu.appendChild(bawah);

  return kartu;
}

// ==========================================================
// TAMPILAN HARI
// ==========================================================
function gambarHari(data) {
  tanggalSaatIni = data.tanggal;
  bersihkanError(pesanError);

  // Baris tanggal dan ringkasan
  const teks = `${data.namaHari}, ${formatTanggal(data.tanggal)}`;
  teksTanggal.textContent = teks;
  tombolTanggal.setAttribute(
    "aria-label",
    `Pilih tanggal. Tanggal saat ini ${teks}`,
  );
  inputTanggal.value = data.tanggal;
  inputTanggal.max = data.maksTanggal;

  // Ringkasan hanya berarti bila ada jadwal
  pillRingkasan.hidden = !data.adaJadwal;
  pillRingkasan.textContent = `${data.ringkasan.sudah}/${data.ringkasan.total} sudah kirim`;

  // Catatan tanggal ini
  catatanTersimpan = data.catatan || "";
  inputCatatan.value = catatanTersimpan;
  sesuaikanTinggi();
  bersihkanError(pesanCatatan);
  perbaruiTombolSimpan();

  // Daftar siswa, atau kalimat bila tidak ada jadwal
  daftarSiswa.replaceChildren();
  teksKosong.hidden = data.adaJadwal;
  if (data.adaJadwal) {
    for (const siswa of data.siswa) daftarSiswa.appendChild(buatKartu(siswa));
  }
}

// Muat data satu hari. Tanpa tanggal = tanggal default dari server.
async function muatHari(tanggal) {
  const hasil = await waliDay(tanggal);
  if (!hasil.ok) {
    tampilkanError(pesanError, hasil.error.message);
    if (tanggalSaatIni) inputTanggal.value = tanggalSaatIni; // kembalikan pilihan tanggal
    return;
  }
  gambarHari(hasil.data);
}

// ---------- Pemilih tanggal ----------
tombolTanggal.addEventListener("click", () => {
  if (typeof inputTanggal.showPicker === "function") {
    try {
      inputTanggal.showPicker();
      return;
    } catch {
      // lanjut ke cadangan
    }
  }
  // Cadangan untuk browser tanpa showPicker
  inputTanggal.focus();
  inputTanggal.click();
});

inputTanggal.addEventListener("change", () => {
  const dipilih = inputTanggal.value;
  if (!dipilih) {
    inputTanggal.value = tanggalSaatIni || "";
    return;
  }
  if (dipilih === tanggalSaatIni) return;
  jalankanDenganKunci(tombolTanggal, () => muatHari(dipilih));
});

// ==========================================================
// POPUP FOTO
// ==========================================================
let nomorPopup = 0; // dinaikkan setiap buka/tutup, untuk mengabaikan respons yang terlambat
let pemicuPopup = null; // tombol Lihat foto yang membuka popup

function tampilkanGagalFoto() {
  pengisiFoto.hidden = true;
  gambarPopup.hidden = true;
  gagalFoto.hidden = false;
}

function bukaPopup(kirimanId, pemicu) {
  nomorPopup += 1;
  const nomor = nomorPopup;
  pemicuPopup = pemicu;

  // Awal: hanya kotak dengan placeholder
  gambarPopup.removeAttribute("src");
  gambarPopup.hidden = true;
  gagalFoto.hidden = true;
  pengisiFoto.hidden = false;

  lapisanFoto.hidden = false;
  document.documentElement.classList.add("tanpa-gulir");
  tombolTutupPopup.focus();

  // Foto baru diminta ke server saat tombol ditekan
  return jalankanDenganKunci(pemicu, async () => {
    const hasil = await waliPhoto(kirimanId);
    if (nomor !== nomorPopup) return; // popup sudah ditutup
    if (!hasil.ok) {
      tampilkanGagalFoto();
      return;
    }
    gambarPopup.src = hasil.data.url;
  });
}

function tutupPopup() {
  nomorPopup += 1; // batalkan respons yang masih ditunggu
  lapisanFoto.hidden = true;
  document.documentElement.classList.remove("tanpa-gulir");
  gambarPopup.removeAttribute("src");
  if (pemicuPopup) pemicuPopup.focus();
  pemicuPopup = null;
}

// Gambar selesai dimuat -> tampilkan; gagal -> teks gagal
gambarPopup.addEventListener("load", () => {
  if (!gambarPopup.getAttribute("src")) return;
  pengisiFoto.hidden = true;
  gambarPopup.hidden = false;
});
gambarPopup.addEventListener("error", () => {
  if (!gambarPopup.getAttribute("src")) return;
  tampilkanGagalFoto();
});

tombolTutupPopup.addEventListener("click", tutupPopup);

// Ketuk area gelap = tutup (ketukan di dalam kotak foto diabaikan)
lapisanFoto.addEventListener("click", (e) => {
  if (e.target === lapisanFoto) tutupPopup();
});

document.addEventListener("keydown", (e) => {
  if (lapisanFoto.hidden) return;
  if (e.key === "Escape") {
    tutupPopup();
  } else if (e.key === "Tab") {
    // Fokus tetap di dalam popup (hanya ada satu tombol)
    e.preventDefault();
    tombolTutupPopup.focus();
  }
});

// ==========================================================
// MULAI
// ==========================================================
async function mulai() {
  app.prepend(buatHeader());
  ikonTanggal.append(buatIkon("kalender", 20));
  pengisiFoto.append(buatIkon("gambar", 40));
  tombolTutupPopup.append(buatIkon("silang", 20));

  // 1) Siapa yang login? (peran tidak cocok -> otomatis pindah halaman)
  const hasilMe = await pastikanPeran("wali");
  if (!hasilMe.ok) {
    tampilkanError(pesanError, hasilMe.error.message);
    return;
  }

  // 2) Data hari default dari server (tanpa parameter tanggal)
  await muatHari();
}

mulai();
