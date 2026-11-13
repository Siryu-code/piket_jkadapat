// js/api.js
// Satu-satunya tempat yang memanggil fetch.
// Semua fungsi selalu mengembalikan:
//   sukses -> { ok: true,  data: {...} }
//   gagal  -> { ok: false, error: { code: 'KODE', message: 'Teks untuk ditampilkan' } }

// true  = pakai data tiruan (tanpa jaringan)
// false = pakai fetch sungguhan ke /api/*
export const USE_MOCK = true;

const JEDA_MOCK_MS = 400;
const HALAMAN_LOGIN = "login.html";

// ==========================================================
// Pesan error bawaan (dipakai mock, dan sebagai cadangan
// kalau server tidak mengirim field message)
// ==========================================================
const PESAN_ERROR = {
  KREDENSIAL_SALAH: "Username atau password salah.",
  TIDAK_LOGIN: "Sesi berakhir. Silakan masuk kembali.",
  DILARANG: "Kamu tidak punya akses.",
  TIDAK_DITEMUKAN: "Data tidak ditemukan.",
  PASSWORD_LAMA_SALAH: "Password lama salah.",
  PASSWORD_BARU_INVALID: "Password baru tidak memenuhi syarat.",
  BUKAN_HARI_PIKET: "Hari ini bukan jadwal piketmu.",
  DI_LUAR_JAM: "Pengiriman foto hanya dibuka pukul 05.00 sampai 17.00 WIB.",
  SUDAH_KIRIM: "Kamu sudah mengirim foto hari ini.",
  DI_LUAR_AREA: "Kamu berada di luar area kelas.",
  AKURASI_BURUK: "Akurasi lokasi kurang baik. Coba lagi.",
  FOTO_INVALID: "Foto tidak valid. Silakan ambil ulang.",
  SERVER_ERROR: "Terjadi kesalahan pada server.",
  JARINGAN_GAGAL: "Tidak dapat terhubung ke server. Periksa koneksi internet.",
};

function sukses(data) {
  return { ok: true, data };
}

function gagal(code, message) {
  return {
    ok: false,
    error: {
      code,
      message: message || PESAN_ERROR[code] || PESAN_ERROR.SERVER_ERROR,
    },
  };
}

function jeda(ms) {
  return new Promise((selesai) => setTimeout(selesai, ms));
}

// Pindah ke login.html. Promise-nya sengaja tidak pernah selesai,
// supaya kode di halaman berhenti dan tombol tetap terkunci sampai halaman berganti.
function alihkanKeLogin() {
  window.location.replace(HALAMAN_LOGIN);
  return new Promise(() => {});
}

// ==========================================================
// Pengaturan mock (dari parameter URL)
//   ?role=siswa | wali
//   ?status=BELUM_KIRIM | SUDAH_KIRIM | DI_LUAR_SESI | TIDAK_PIKET
//   ?error=KODE_ERROR
// Disimpan di sessionStorage supaya terbawa antar halaman.
// Untuk menghapus satu pengaturan, beri nilai kosong: ?error=
// Ini satu-satunya penggunaan storage dan hanya aktif di mode mock.
// ==========================================================
const KUNCI_MOCK = "mockPengaturan";
const ROLE_VALID = ["siswa", "wali"];
const STATUS_VALID = [
  "BELUM_KIRIM",
  "SUDAH_KIRIM",
  "DI_LUAR_SESI",
  "TIDAK_PIKET",
];

function bacaPengaturanTersimpan() {
  try {
    return JSON.parse(sessionStorage.getItem(KUNCI_MOCK)) || {};
  } catch {
    return {};
  }
}

function simpanPengaturan() {
  try {
    sessionStorage.setItem(KUNCI_MOCK, JSON.stringify(pengaturan));
  } catch {
    // abaikan kalau storage tidak tersedia
  }
}

function muatPengaturanMock() {
  const hasil = bacaPengaturanTersimpan();
  const url = new URLSearchParams(window.location.search);

  const aturan = {
    role: (nilai) => ROLE_VALID.includes(nilai),
    status: (nilai) => STATUS_VALID.includes(nilai),
    error: (nilai) => Object.prototype.hasOwnProperty.call(PESAN_ERROR, nilai),
  };

  for (const kunci of Object.keys(aturan)) {
    if (!url.has(kunci)) continue;
    const nilai = url.get(kunci);
    if (nilai === "") {
      delete hasil[kunci]; // nilai kosong = hapus pengaturan
    } else if (aturan[kunci](nilai)) {
      hasil[kunci] = nilai;
    }
  }
  // Memilih ?status= secara eksplisit juga mengulang tanda "sudah kirim" dari mock
  if (url.has("status")) delete hasil.sudahKirim;
  return hasil;
}

const pengaturan = USE_MOCK ? muatPengaturanMock() : {};
if (USE_MOCK) simpanPengaturan();

// Kode error yang boleh dipaksa lewat ?error=, per fungsi API
const ERROR_MOCK_PER_FUNGSI = {
  login: ["KREDENSIAL_SALAH"],
  passwordChange: ["PASSWORD_LAMA_SALAH", "PASSWORD_BARU_INVALID"],
  piketSubmit: [
    "BUKAN_HARI_PIKET",
    "DI_LUAR_JAM",
    "SUDAH_KIRIM",
    "DI_LUAR_AREA",
    "AKURASI_BURUK",
    "FOTO_INVALID",
  ],
  waliPhoto: ["TIDAK_DITEMUKAN"],
};

// Kalau ?error cocok dengan fungsi yang dipanggil, kembalikan error itu
function errorMock(namaFungsi) {
  const kode = pengaturan.error;
  if (!kode) return null;
  if (kode === "TIDAK_LOGIN" && namaFungsi !== "login") return gagal(kode);
  if ((ERROR_MOCK_PER_FUNGSI[namaFungsi] || []).includes(kode))
    return gagal(kode);
  return null;
}

// ==========================================================
// Data mock
// ==========================================================
const PENGGUNA_MOCK = {
  siswa: { role: "siswa", nama: "Raka Pratama", panggilan: "Raka", absen: 6 },
  wali: {
    role: "wali",
    nama: "Ibu Sari Wulandari",
    panggilan: "Bu Sari",
    absen: null,
  },
};

const JAM_KIRIM_MOCK = "15:42";
const CATATAN_MOCK = "Bima izin, tidak masuk hari ini.";

// Foto mock: gambar SVG polos warna #7B6554 (data URI)
const FOTO_MOCK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">' +
      '<rect width="100%" height="100%" fill="#7B6554"/></svg>',
  );

// Mock meniru server: hari dihitung di sini (di frontend sungguhan TIDAK boleh)
const TANGGAL_DEFAULT_MOCK = "2026-11-06";
const MAKS_TANGGAL_MOCK = "2026-11-09";
const NAMA_HARI_MOCK = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function hariMock(tanggal) {
  const [tahun, bulan, hari] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(tahun, bulan - 1, hari)).getUTCDay();
}

// Catatan mock disimpan per tanggal
function catatanMock(tanggal) {
  const peta =
    pengaturan.catatan && typeof pengaturan.catatan === "object"
      ? pengaturan.catatan
      : {};
  if (typeof peta[tanggal] === "string") return peta[tanggal];
  return tanggal === TANGGAL_DEFAULT_MOCK ? CATATAN_MOCK : "";
}

function daftarSiswaMock() {
  return [
    {
      kirimanId: "kiriman-dina",
      panggilan: "Dina",
      absen: 5,
      status: "SUDAH_KIRIM",
      jamKirim: "15:42",
      pesan:
        "Lantai dan papan tulis sudah dibersihkan, sampah dibuang ke depan.",
    },
    {
      kirimanId: "kiriman-fajar",
      panggilan: "Fajar",
      absen: 10,
      status: "SUDAH_KIRIM",
      jamKirim: "15:55",
      pesan: null,
    },
    {
      kirimanId: "kiriman-salsa",
      panggilan: "Salsa",
      absen: 15,
      status: "SUDAH_KIRIM",
      jamKirim: "16:03",
      pesan: "Menyapu dan merapikan meja.",
    },
    {
      kirimanId: null,
      panggilan: "Bima",
      absen: 20,
      status: "TIDAK_KIRIM",
      jamKirim: null,
      pesan: null,
    },
    {
      kirimanId: "kiriman-nadia",
      panggilan: "Nadia",
      absen: 25,
      status: "SUDAH_KIRIM",
      jamKirim: "15:31",
      pesan: null,
    },
    {
      kirimanId: null,
      panggilan: "Rizky",
      absen: 30,
      status: "TIDAK_KIRIM",
      jamKirim: null,
      pesan: null,
    },
  ];
}

// Tanpa tanggal = tanggal default. Sabtu/Minggu: tidak ada jadwal.
function dataWaliMock(tanggalDiminta) {
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(tanggalDiminta || "")
    ? tanggalDiminta
    : TANGGAL_DEFAULT_MOCK;
  const hari = hariMock(tanggal);
  const akhirPekan = hari === 0 || hari === 6;
  const siswa = akhirPekan ? [] : daftarSiswaMock();

  return {
    tanggal,
    maksTanggal: MAKS_TANGGAL_MOCK,
    namaHari: NAMA_HARI_MOCK[hari],
    adaJadwal: !akhirPekan,
    ringkasan: {
      sudah: siswa.filter((s) => s.status === "SUDAH_KIRIM").length,
      total: siswa.length,
    },
    catatan: catatanMock(tanggal),
    siswa,
  };
}

// ==========================================================
// fetch sungguhan (dipakai kalau USE_MOCK = false)
// ==========================================================
async function fetchSungguhan(metode, jalur, body) {
  const opsi = { method: metode, credentials: "same-origin", headers: {} };
  if (body !== undefined) {
    opsi.headers["Content-Type"] = "application/json";
    opsi.body = JSON.stringify(body);
  }

  let respons;
  try {
    respons = await fetch(jalur, opsi);
  } catch {
    return gagal("JARINGAN_GAGAL");
  }

  let json = null;
  try {
    json = await respons.json();
  } catch {
    // respons bukan JSON
  }

  if (json && typeof json.ok === "boolean") {
    if (json.ok) return sukses(json.data ?? {});
    return gagal(json.error?.code || "SERVER_ERROR", json.error?.message);
  }
  if (respons.status === 401) return gagal("TIDAK_LOGIN");
  return gagal("SERVER_ERROR");
}

// ==========================================================
// Pintu bersama semua fungsi API
// ==========================================================
async function jalankan({
  nama,
  metode,
  jalur,
  body,
  mock,
  abaikan401 = false,
}) {
  let hasil;
  if (USE_MOCK) {
    await jeda(JEDA_MOCK_MS);
    hasil = errorMock(nama) || mock(body);
  } else {
    hasil = await fetchSungguhan(metode, jalur, body);
  }

  // Aturan 401: di halaman mana pun (kecuali saat login) arahkan ke login.html
  if (!hasil.ok && hasil.error.code === "TIDAK_LOGIN" && !abaikan401) {
    return alihkanKeLogin();
  }
  return hasil;
}

// ==========================================================
// Fungsi API (sesuai kontrak)
// ==========================================================

// POST /api/auth-login
export function login(username, password) {
  return jalankan({
    nama: "login",
    metode: "POST",
    jalur: "/api/auth-login",
    body: { username, password },
    abaikan401: true,
    mock: () => {
      const role = pengaturan.role || "siswa";
      return sukses({ role, panggilan: PENGGUNA_MOCK[role].panggilan });
    },
  });
}

// POST /api/auth-logout
export function logout() {
  return jalankan({
    nama: "logout",
    metode: "POST",
    jalur: "/api/auth-logout",
    body: {},
    mock: () => sukses({}),
  });
}

// GET /api/me
export function me() {
  return jalankan({
    nama: "me",
    metode: "GET",
    jalur: "/api/me",
    mock: () => sukses({ ...PENGGUNA_MOCK[pengaturan.role || "siswa"] }),
  });
}

// POST /api/password-change
export function passwordChange(lama, baru) {
  return jalankan({
    nama: "passwordChange",
    metode: "POST",
    jalur: "/api/password-change",
    body: { lama, baru },
    mock: () => sukses({}),
  });
}

// GET /api/piket-status (siswa)
export function piketStatus() {
  return jalankan({
    nama: "piketStatus",
    metode: "GET",
    jalur: "/api/piket-status",
    mock: () => {
      // Setelah kirim sukses, status berikutnya selalu SUDAH_KIRIM
      const status = pengaturan.sudahKirim
        ? "SUDAH_KIRIM"
        : pengaturan.status || "BELUM_KIRIM";
      return sukses({
        status,
        bolehKirim: status === "BELUM_KIRIM",
        namaHariJadwal: "Rabu",
        jamKirim:
          status === "SUDAH_KIRIM"
            ? pengaturan.sudahKirim || JAM_KIRIM_MOCK
            : null,
      });
    },
  });
}

// POST /api/piket-submit (siswa)
// data: { foto, pesan, latitude, longitude, akurasi }
export function piketSubmit(data) {
  return jalankan({
    nama: "piketSubmit",
    metode: "POST",
    jalur: "/api/piket-submit",
    body: data,
    mock: () => {
      pengaturan.sudahKirim = JAM_KIRIM_MOCK;
      simpanPengaturan();
      return sukses({ jamKirim: JAM_KIRIM_MOCK });
    },
  });
}

// GET /api/wali-day?tanggal=... (wali). Tanpa tanggal = default dari server.
// Mock: tanpa tanggal = Jumat, 6 November 2026. Sabtu/Minggu tidak ada jadwal.
export function waliDay(tanggal) {
  const query = tanggal ? `?tanggal=${encodeURIComponent(tanggal)}` : "";
  return jalankan({
    nama: "waliDay",
    metode: "GET",
    jalur: `/api/wali-day${query}`,
    mock: () => sukses(dataWaliMock(tanggal)),
  });
}

// GET /api/wali-photo?id=... (wali)
export function waliPhoto(kirimanId) {
  return jalankan({
    nama: "waliPhoto",
    metode: "GET",
    jalur: `/api/wali-photo?id=${encodeURIComponent(kirimanId)}`,
    mock: () => {
      const ada = daftarSiswaMock().some(
        (s) => s.kirimanId && s.kirimanId === kirimanId,
      );
      if (!ada) return gagal("TIDAK_DITEMUKAN");
      return sukses({ url: FOTO_MOCK, kedaluwarsaDetik: 300 });
    },
  });
}

// PUT /api/wali-note (wali)
export function waliNote(tanggal, catatan) {
  return jalankan({
    nama: "waliNote",
    metode: "PUT",
    jalur: "/api/wali-note",
    body: { tanggal, catatan },
    mock: () => {
      if (!pengaturan.catatan || typeof pengaturan.catatan !== "object")
        pengaturan.catatan = {};
      pengaturan.catatan[tanggal] = catatan;
      simpanPengaturan();
      return sukses({});
    },
  });
}
