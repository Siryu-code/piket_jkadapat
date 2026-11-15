// Membuat akun siswa (dari siswa.txt) dan akun wali kelas.
// Dijalankan di laptop, bukan di server.
//
// Pemakaian:
//   node scripts/create-users.js --dry-run
//   node scripts/create-users.js
//   node scripts/create-users.js --wali 'Nama Wali,Panggilan'
//
// siswa.txt (di root repo), satu siswa per baris: nama,absen,panggilan
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { muatEnv } = require("./_env");
const { passwordAcak } = require("./_password");

const FILE_SISWA = path.join(__dirname, "..", "siswa.txt");
const MAKS_ABSEN = 34;
const MAKS_USERNAME = 50; // batas yang diterima endpoint login

// ---------- argumen ----------
function bacaArgumen(argv) {
  const hasil = { dryRun: false, wali: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      hasil.dryRun = true;
    } else if (a === "--wali") {
      i++;
      if (i >= argv.length || argv[i].startsWith("--")) {
        throw new Error(
          "Opsi --wali butuh nilai, contoh: --wali 'Nama Wali,Panggilan'",
        );
      }
      hasil.wali = argv[i];
    } else if (a.startsWith("--wali=")) {
      hasil.wali = a.slice("--wali=".length);
    } else {
      throw new Error(`Opsi tidak dikenal: ${a}`);
    }
  }
  return hasil;
}

// ---------- membaca masukan ----------
// "Nama Wali,Panggilan" -> { nama, panggilan }
function bacaWali(teks, kesalahan) {
  const bagian = teks.split(",").map((b) => b.trim());
  if (bagian.length !== 2 || bagian.some((b) => b === "")) {
    kesalahan.push(
      `--wali: formatnya 'Nama,Panggilan' (dua bagian, keduanya terisi), yang diberikan: "${teks}"`,
    );
    return null;
  }
  return { nama: bagian[0], panggilan: bagian[1] };
}

// Membaca siswa.txt. Semua masalah dikumpulkan, bukan berhenti di yang pertama.
function bacaSiswa(kesalahan) {
  const daftar = [];
  const teks = fs.readFileSync(FILE_SISWA, "utf8").replace(/^\uFEFF/, ""); // buang BOM Notepad
  const absenDiFile = new Map(); // absen -> nomor baris pertama

  teks.split(/\r?\n/).forEach((mentah, i) => {
    const noBaris = i + 1;
    const baris = mentah.trim();
    if (baris === "") return; // baris kosong dilewati

    const kolom = baris.split(",").map((k) => k.trim());
    if (kolom.length !== 3 || kolom.some((k) => k === "")) {
      kesalahan.push(
        `siswa.txt baris ${noBaris}: harus tepat 3 kolom terisi (nama,absen,panggilan) -> "${baris}"`,
      );
      return;
    }

    const [nama, absenTeks, panggilan] = kolom;
    if (!/^\d+$/.test(absenTeks)) {
      kesalahan.push(
        `siswa.txt baris ${noBaris}: absen "${absenTeks}" harus berupa angka bulat`,
      );
      return;
    }
    const absen = Number(absenTeks);
    if (absen < 1 || absen > MAKS_ABSEN) {
      kesalahan.push(
        `siswa.txt baris ${noBaris}: absen ${absen} di luar 1 sampai ${MAKS_ABSEN}`,
      );
      return;
    }
    if (absenDiFile.has(absen)) {
      kesalahan.push(
        `siswa.txt baris ${noBaris}: absen ${absen} kembar dengan baris ${absenDiFile.get(absen)}`,
      );
      return;
    }
    absenDiFile.set(absen, noBaris);
    daftar.push({ noBaris, nama, absen, panggilan });
  });

  if (daftar.length === 0 && kesalahan.length === 0) {
    kesalahan.push("siswa.txt kosong, tidak ada siswa yang bisa dibuat");
  }
  return daftar;
}

// "Bu Sari" -> "busari", "Dîna!" -> "dina"
function usernameDari(panggilan) {
  return panggilan
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // buang tanda aksen
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// ---------- keluaran ----------
function cetakTabel(judul, baris) {
  const lebar = judul.map((j, i) =>
    Math.max(j.length, ...baris.map((b) => String(b[i]).length)),
  );
  const susun = (b) =>
    "  " + b.map((s, i) => String(s).padEnd(lebar[i])).join("  ");
  console.log(susun(judul));
  console.log("  " + lebar.map((l) => "-".repeat(l)).join("  "));
  baris.forEach((b) => console.log(susun(b)));
}

function selCsv(nilai) {
  const t = nilai === null || nilai === undefined ? "" : String(nilai);
  return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

function stempelWaktu(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---------- utama ----------
async function utama() {
  const opsi = bacaArgumen(process.argv.slice(2));
  const adaFileSiswa = fs.existsSync(FILE_SISWA);
  if (!adaFileSiswa && !opsi.wali) {
    throw new Error(
      "File siswa.txt tidak ditemukan di root repo. Buat dulu (format: nama,absen,panggilan), atau pakai --wali untuk membuat akun wali saja.",
    );
  }

  const kesalahan = [];
  const wali = opsi.wali ? bacaWali(opsi.wali, kesalahan) : null;
  const siswa = adaFileSiswa ? bacaSiswa(kesalahan) : [];

  // Data yang sudah ada di database (untuk memeriksa kembar)
  muatEnv();
  const { ambilDb } = require("../netlify/functions/_lib/db");
  const db = ambilDb();
  const { data: ada, error } = await db
    .from("users")
    .select("username, absen, role");
  if (error) throw new Error("Gagal membaca tabel users: " + error.message);

  const terpakai = new Set(ada.map((u) => u.username));
  const absenDb = new Map(
    ada.filter((u) => u.role === "siswa").map((u) => [u.absen, u.username]),
  );
  const akun = [];

  // Wali diproses lebih dulu supaya mendapat username polos
  if (wali) {
    const dasar = usernameDari(wali.panggilan);
    if (!dasar) {
      kesalahan.push(
        `--wali: panggilan "${wali.panggilan}" tidak menghasilkan username (harus ada huruf atau angka)`,
      );
    } else if (dasar.length > MAKS_USERNAME) {
      kesalahan.push(
        `--wali: username "${dasar}" lebih dari ${MAKS_USERNAME} karakter, pakai panggilan yang lebih pendek`,
      );
    } else if (terpakai.has(dasar)) {
      kesalahan.push(
        `--wali: username "${dasar}" sudah dipakai di database, pakai panggilan wali yang lain`,
      );
    } else {
      terpakai.add(dasar);
      akun.push({
        role: "wali",
        username: dasar,
        nama: wali.nama,
        panggilan: wali.panggilan,
        absen: null,
      });
    }
  }

  for (const s of siswa) {
    if (absenDb.has(s.absen)) {
      kesalahan.push(
        `siswa.txt baris ${s.noBaris}: absen ${s.absen} sudah dipakai akun "${absenDb.get(s.absen)}" di database`,
      );
      continue;
    }
    const dasar = usernameDari(s.panggilan);
    if (!dasar) {
      kesalahan.push(
        `siswa.txt baris ${s.noBaris}: panggilan "${s.panggilan}" tidak menghasilkan username (harus ada huruf atau angka)`,
      );
      continue;
    }
    // Bila sudah dipakai, tambahkan nomor absen
    let username = terpakai.has(dasar) ? dasar + s.absen : dasar;
    if (terpakai.has(username)) {
      kesalahan.push(
        `siswa.txt baris ${s.noBaris}: username "${dasar}" dan "${username}" sudah dipakai, ganti panggilannya`,
      );
      continue;
    }
    if (username.length > MAKS_USERNAME) {
      kesalahan.push(
        `siswa.txt baris ${s.noBaris}: username "${username}" lebih dari ${MAKS_USERNAME} karakter, pakai panggilan yang lebih pendek`,
      );
      continue;
    }
    terpakai.add(username);
    akun.push({
      role: "siswa",
      username,
      nama: s.nama,
      panggilan: s.panggilan,
      absen: s.absen,
    });
  }

  if (kesalahan.length > 0) {
    console.error(
      `\nDitemukan ${kesalahan.length} masalah. TIDAK ADA akun yang dibuat. Perbaiki lalu jalankan lagi:\n`,
    );
    kesalahan.forEach((k) => console.error("  - " + k));
    console.error("");
    process.exitCode = 1;
    return;
  }

  // Wali di atas, siswa urut absen
  akun.sort((a, b) =>
    a.role === b.role
      ? (a.absen || 0) - (b.absen || 0)
      : a.role === "wali"
        ? -1
        : 1,
  );

  // ----- uji coba -----
  if (opsi.dryRun) {
    console.log(
      "\nMODE UJI COBA (--dry-run): tidak ada yang disimpan, password belum dibuat.\n",
    );
    console.log(`Akan dibuat ${akun.length} akun:\n`);
    cetakTabel(
      ["role", "absen", "nama", "panggilan", "username"],
      akun.map((a) => [
        a.role,
        a.absen === null ? "-" : a.absen,
        a.nama,
        a.panggilan,
        a.username,
      ]),
    );
    console.log("\nSudah sesuai? Jalankan lagi tanpa --dry-run.\n");
    return;
  }

  // ----- buat sungguhan -----
  for (const a of akun) {
    a.password = passwordAcak(10);
    a.password_hash = await bcrypt.hash(a.password, 10);
  }

  // Satu perintah insert untuk semuanya: berhasil semua atau gagal semua
  const baris = akun.map((a) => ({
    username: a.username,
    nama: a.nama,
    panggilan: a.panggilan,
    absen: a.absen,
    password_hash: a.password_hash,
    role: a.role,
  }));
  const { error: errSimpan } = await db.from("users").insert(baris);
  if (errSimpan) {
    if (errSimpan.code === "23505") {
      throw new Error(
        "Ada username atau absen yang ternyata sudah dipakai. TIDAK ADA akun yang tersimpan. Jalankan lagi.",
      );
    }
    throw new Error(
      "Gagal menyimpan ke database: " +
        errSimpan.message +
        " (tidak ada akun yang tersimpan)",
    );
  }

  console.log(
    `\n${akun.length} akun berhasil dibuat. Password HANYA ditampilkan sekali ini, salin sekarang:\n`,
  );
  cetakTabel(
    ["role", "absen", "nama", "username", "password"],
    akun.map((a) => [
      a.role,
      a.absen === null ? "-" : a.absen,
      a.nama,
      a.username,
      a.password,
    ]),
  );

  // Simpan juga ke CSV (tidak menimpa file yang sudah ada)
  const lokasiCsv = path.join(
    __dirname,
    "..",
    `akun-baru-${stempelWaktu()}.csv`,
  );
  const isiCsv = [
    "username,password,role,absen,nama,panggilan",
    ...akun.map((a) =>
      [a.username, a.password, a.role, a.absen, a.nama, a.panggilan]
        .map(selCsv)
        .join(","),
    ),
  ].join("\r\n");
  try {
    fs.writeFileSync(lokasiCsv, "\uFEFF" + isiCsv + "\r\n", { flag: "wx" }); // BOM agar Excel membaca UTF-8
    console.log(
      `\nDisimpan juga di: ${path.basename(lokasiCsv)} (di root repo, tidak ikut ke Git)`,
    );
    console.log(
      "File itu berisi password polos. Bagikan ke siswa, lalu hapus.\n",
    );
  } catch (err) {
    console.error(
      "\nPERINGATAN: akun sudah tersimpan, tapi file CSV gagal dibuat: " +
        err.message,
    );
    console.error("Salin password dari tabel di atas sekarang.\n");
  }
}

utama().catch((err) => {
  console.error("Gagal:", err.message);
  process.exitCode = 1;
});
