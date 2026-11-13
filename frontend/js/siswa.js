// js/siswa.js
// Logika halaman siswa.html: home, kamera, foto, dan kirim.

import { piketStatus, piketSubmit } from "./api.js";
import {
  bukaKamera,
  tukarKamera,
  hentikanKamera,
  ambilFoto,
} from "./camera.js";
import {
  buatHeader,
  buatIkon,
  pastikanPeran,
  tampilkanError,
  bersihkanError,
  jalankanDenganKunci,
} from "./ui.js";

// ---------- Elemen ----------
const VIEW = {
  home: document.getElementById("view-home"),
  kamera: document.getElementById("view-kamera"),
  foto: document.getElementById("view-foto"),
};

// Home
const judulStatus = document.getElementById("judul-status");
const captionSesi = document.getElementById("caption-sesi");
const pesanError = document.getElementById("pesan-error");
const barisLokasi = document.getElementById("info-lokasi");
const titikLokasi = document.getElementById("titik-lokasi");
const teksLokasi = document.getElementById("teks-lokasi");
const tombolFoto = document.getElementById("tombol-foto");

// Kamera
const videoKamera = document.getElementById("video-kamera");
const pesanKamera = document.getElementById("pesan-kamera");
const teksPesanKamera = document.getElementById("teks-pesan-kamera");
const tombolKembaliKamera = document.getElementById("tombol-kembali-kamera");
const tombolTutupKamera = document.getElementById("tombol-tutup-kamera");
const kontrolKamera = document.getElementById("kontrol-kamera");
const tombolPotret = document.getElementById("tombol-potret");
const tombolTukar = document.getElementById("tombol-tukar");

// Foto
const gambarFoto = document.getElementById("gambar-foto");
const tombolBuangFoto = document.getElementById("tombol-buang-foto");
const formKirim = document.getElementById("form-kirim");
const pesanKirim = document.getElementById("pesan-kirim");
const inputPesan = document.getElementById("input-pesan");
const tombolKirim = document.getElementById("tombol-kirim");

// ---------- Teks ----------
const KALIMAT_STATUS = {
  SUDAH_KIRIM: "Halo, {panggilan}. Kamu sudah mengirim foto hari ini.",
  DI_LUAR_SESI: "Halo, {panggilan}. Kamu berada di luar sesi potret sekarang.",
  TIDAK_PIKET: "Halo, {panggilan}. Kamu tidak piket hari ini.",
  BELUM_KIRIM: "Halo, {panggilan}. Kamu belum mengirim foto hari ini.",
};

// Pesan untuk kode error geolocation (1 = ditolak, 2 = tidak tersedia, 3 = timeout)
const PESAN_LOKASI = {
  1: "Izin lokasi ditolak. Aktifkan izin lokasi lewat pengaturan browser (di iPhone: Pengaturan, Safari, Lokasi), lalu coba lagi.",
  2: "Lokasi nonaktif, harap aktifkan",
  3: "Lokasi belum didapat, coba lagi",
};

const PESAN_KAMERA = {
  izin: "Izin kamera ditolak. Aktifkan izin kamera lewat pengaturan browser (di iPhone: Pengaturan, Safari, Kamera), lalu coba lagi.",
  lain: "Kamera tidak dapat dibuka. Pastikan kamera tidak dipakai aplikasi lain, lalu coba lagi.",
};

// Kode error piket-submit yang mengembalikan siswa ke home
const KODE_KEMBALI_HOME = ["SUDAH_KIRIM", "BUKAN_HARI_PIKET", "DI_LUAR_JAM"];

// ---------- Keadaan ----------
let panggilan = "";
let bolehKirim = false;
let keadaanLokasi = null; // null (sembunyi) | 'aktif' | 'error'
let pesanLokasiError = "";
let fotoSaatIni = null; // { dataUrl, base64 }, hanya di memori
let sedangKirim = false;

// ---------- Pindah view tanpa memuat ulang halaman ----------
// nama: 'home' | 'kamera' | 'foto'
function tampilkanView(nama) {
  for (const [kunci, elemen] of Object.entries(VIEW)) {
    elemen.hidden = kunci !== nama;
  }
}

// ==========================================================
// HOME
// ==========================================================
function gambarInfoLokasi() {
  // Baris ini hanya tampil saat tombol Ambil Foto aktif
  barisLokasi.hidden = !(bolehKirim && keadaanLokasi);
  if (barisLokasi.hidden) return;

  const aktif = keadaanLokasi === "aktif";
  titikLokasi.hidden = !aktif;
  barisLokasi.classList.toggle("info-lokasi-error", !aktif);
  teksLokasi.textContent = aktif ? "Lokasi telah aktif" : pesanLokasiError;
}

function aturLokasiError(kode) {
  keadaanLokasi = "error";
  pesanLokasiError = PESAN_LOKASI[kode] || PESAN_LOKASI[2];
  gambarInfoLokasi();
}

// Bila Permissions API mendukung dan izin lokasi sudah ditolak, tampilkan peringatan
async function cekIzinLokasi() {
  if (!navigator.permissions || !navigator.permissions.query) return;
  try {
    const izin = await navigator.permissions.query({ name: "geolocation" });
    if (izin.state === "denied") aturLokasiError(2);
  } catch {
    // browser tidak mendukung: abaikan
  }
}

function tampilkanStatus(data) {
  const kalimat = KALIMAT_STATUS[data.status] || KALIMAT_STATUS.BELUM_KIRIM;
  judulStatus.textContent = kalimat.replace("{panggilan}", panggilan);
  judulStatus.hidden = false;
  captionSesi.hidden = false;
  pesanError.hidden = true;

  bolehKirim = data.bolehKirim === true;
  tombolFoto.disabled = !bolehKirim;
  gambarInfoLokasi();
}

// Bila /api/me atau /api/piket-status gagal: tampilkan pesan dari server
function tampilkanKesalahan(pesan) {
  judulStatus.hidden = true;
  captionSesi.hidden = true;
  pesanError.textContent = pesan;
  pesanError.hidden = false;
  bolehKirim = false;
  tombolFoto.disabled = true;
  gambarInfoLokasi();
}

// Muat (ulang) status piket
async function muatStatus() {
  tombolFoto.disabled = true; // cegah ketukan saat status belum jelas
  const hasil = await piketStatus();
  if (!hasil.ok) {
    tampilkanKesalahan(hasil.error.message);
    return;
  }
  tampilkanStatus(hasil.data);
}

// ==========================================================
// LOKASI
// ==========================================================
// Mengembalikan { ok: true, latitude, longitude, akurasi } atau { ok: false, kode }
function mintaLokasi() {
  return new Promise((selesai) => {
    if (!navigator.geolocation) {
      selesai({ ok: false, kode: 2 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posisi) =>
        selesai({
          ok: true,
          latitude: posisi.coords.latitude,
          longitude: posisi.coords.longitude,
          akurasi: posisi.coords.accuracy,
        }),
      (galat) => selesai({ ok: false, kode: galat.code }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

// ==========================================================
// KAMERA
// ==========================================================
function tampilkanGalatKamera(kode) {
  const ditolak = kode === "NotAllowedError" || kode === "SecurityError";
  teksPesanKamera.textContent = ditolak ? PESAN_KAMERA.izin : PESAN_KAMERA.lain;
  pesanKamera.hidden = false;
  kontrolKamera.hidden = true;
}

// Buka view kamera lalu nyalakan kamera
async function bukaTampilanKamera() {
  pesanKamera.hidden = true;
  kontrolKamera.hidden = false;
  tampilkanView("kamera");

  const hasil = await bukaKamera(videoKamera);
  if (!hasil.ok && hasil.kode !== "DIBATALKAN")
    tampilkanGalatKamera(hasil.kode);
}

// Kembali ke home dan bersihkan sisa kamera/foto
function kembaliKeHome() {
  hentikanKamera(videoKamera);
  fotoSaatIni = null;
  gambarFoto.removeAttribute("src");
  inputPesan.value = "";
  bersihkanError(pesanKirim);
  tampilkanView("home");
}

// Tombol Ambil Foto: minta lokasi dulu, baru buka kamera
tombolFoto.addEventListener("click", () => {
  jalankanDenganKunci(tombolFoto, async () => {
    const lokasi = await mintaLokasi();
    if (!lokasi.ok) {
      aturLokasiError(lokasi.kode); // pesan tampil di home, kamera tidak dibuka
      return;
    }
    keadaanLokasi = "aktif";
    gambarInfoLokasi();
    await bukaTampilanKamera();
  });
});

// Silang / Kembali di kamera: hentikan stream lalu ke home
tombolTutupKamera.addEventListener("click", kembaliKeHome);
tombolKembaliKamera.addEventListener("click", kembaliKeHome);

// Tukar kamera belakang <-> depan
tombolTukar.addEventListener("click", () => {
  jalankanDenganKunci(tombolTukar, async () => {
    const hasil = await tukarKamera(videoKamera);
    if (!hasil.ok && hasil.kode !== "DIBATALKAN")
      tampilkanGalatKamera(hasil.kode);
  });
});

// Potret: ambil frame, hentikan kamera, tampilkan foto
tombolPotret.addEventListener("click", () => {
  const foto = ambilFoto(videoKamera);
  if (!foto) return; // video belum siap

  hentikanKamera(videoKamera);
  fotoSaatIni = foto;
  gambarFoto.src = foto.dataUrl;
  inputPesan.value = "";
  bersihkanError(pesanKirim);
  tampilkanView("foto");
});

// ==========================================================
// FOTO + KIRIM
// ==========================================================
// Silang di foto: buang foto dan kembali ke kamera
tombolBuangFoto.addEventListener("click", () => {
  if (sedangKirim) return;
  fotoSaatIni = null;
  gambarFoto.removeAttribute("src");
  inputPesan.value = "";
  bersihkanError(pesanKirim);
  bukaTampilanKamera();
});

async function kirimFoto() {
  if (!fotoSaatIni) return;
  sedangKirim = true;
  try {
    bersihkanError(pesanKirim);

    // Koordinat segar (aturan yang sama dengan sebelum membuka kamera)
    const lokasi = await mintaLokasi();
    if (!lokasi.ok) {
      tampilkanError(pesanKirim, PESAN_LOKASI[lokasi.kode] || PESAN_LOKASI[2]);
      return;
    }

    const pesan = inputPesan.value.trim();
    const hasil = await piketSubmit({
      foto: fotoSaatIni.base64,
      pesan: pesan || null,
      latitude: lokasi.latitude,
      longitude: lokasi.longitude,
      akurasi: lokasi.akurasi,
    });

    // Sukses, atau error yang membuat foto tidak bisa dikirim lagi: ke home + muat ulang status
    if (hasil.ok || KODE_KEMBALI_HOME.includes(hasil.error.code)) {
      kembaliKeHome();
      await muatStatus();
      return;
    }

    // Error lain: tampilkan pesan server, foto tetap ada untuk dicoba lagi
    tampilkanError(pesanKirim, hasil.error.message);
  } finally {
    sedangKirim = false;
  }
}

formKirim.addEventListener("submit", (e) => {
  e.preventDefault();
  jalankanDenganKunci(tombolKirim, kirimFoto);
});

// ==========================================================
// MULAI
// ==========================================================
async function mulai() {
  // Pasang header dan ikon
  VIEW.home.prepend(buatHeader());
  tombolFoto.prepend(buatIkon("kamera", 20));
  tombolTutupKamera.append(buatIkon("silang", 24));
  tombolBuangFoto.append(buatIkon("silang", 24));
  tombolTukar.append(buatIkon("tukarKamera", 24));
  tombolKirim.append(buatIkon("kirim", 24));
  tampilkanView("home");

  // 1) Siapa yang login? (peran tidak cocok -> otomatis pindah halaman)
  const hasilMe = await pastikanPeran("siswa");
  if (!hasilMe.ok) {
    tampilkanKesalahan(hasilMe.error.message);
    return;
  }
  panggilan = hasilMe.data.panggilan;

  // 2) Status piket hari ini
  await muatStatus();
  cekIzinLokasi();
}

mulai();
