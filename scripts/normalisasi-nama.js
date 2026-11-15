// SEKALI PAKAI: merapikan kolom nama di tabel users ke format baku
// (lihat netlify/functions/_lib/nama.js), dan memeriksa nama yang kembar.
// Password dan kolom lain tidak disentuh.
//
//   node scripts/normalisasi-nama.js             uji coba: hanya menampilkan
//   node scripts/normalisasi-nama.js --terapkan  menyimpan perubahan
const { muatEnv } = require("./_env");
const { normalisasiNama } = require("../netlify/functions/_lib/nama");

async function utama() {
  const argumen = process.argv.slice(2);
  const terapkan = argumen.includes("--terapkan");
  const asing = argumen.filter((a) => a !== "--terapkan");
  if (asing.length > 0)
    throw new Error(`Opsi tidak dikenal: ${asing.join(" ")}`);

  muatEnv();
  const { ambilDb } = require("../netlify/functions/_lib/db");
  const db = ambilDb();

  const { data: semua, error } = await db
    .from("users")
    .select("id, username, nama, role, absen");
  if (error) throw new Error("Gagal membaca tabel users: " + error.message);
  if (semua.length === 0) {
    console.log(
      "\nTabel users masih kosong, tidak ada yang perlu dirapikan.\n",
    );
    return;
  }

  const masalah = [];
  const perubahan = [];
  const kelompok = new Map(); // nama rapi -> daftar username

  for (const u of semua) {
    const rapi = normalisasiNama(u.nama);
    if (rapi === "") {
      masalah.push(
        `akun "${u.username}": nama "${u.nama}" tidak berisi huruf atau angka`,
      );
      continue;
    }
    if (rapi.length > 100) {
      masalah.push(`akun "${u.username}": nama lebih dari 100 karakter`);
      continue;
    }
    if (!kelompok.has(rapi)) kelompok.set(rapi, []);
    kelompok.get(rapi).push(u.username);
    if (rapi !== u.nama)
      perubahan.push({
        id: u.id,
        username: u.username,
        lama: u.nama,
        baru: rapi,
      });
  }
  for (const [rapi, daftar] of kelompok) {
    if (daftar.length > 1) {
      masalah.push(
        `nama "${rapi}" dipakai ${daftar.length} akun (${daftar.join(", ")}). Bedakan salah satunya dulu di Table Editor`,
      );
    }
  }

  console.log(
    `\nAkun diperiksa: ${semua.length}. Nama yang perlu dirapikan: ${perubahan.length}.\n`,
  );
  perubahan.forEach((p) =>
    console.log(`  ${p.username.padEnd(20)} "${p.lama}"  ->  "${p.baru}"`),
  );
  if (perubahan.length > 0) console.log("");

  if (masalah.length > 0) {
    console.error(
      `Ditemukan ${masalah.length} masalah. TIDAK ADA yang diubah. Perbaiki lalu jalankan lagi:\n`,
    );
    masalah.forEach((m) => console.error("  - " + m));
    console.error("");
    process.exitCode = 1;
    return;
  }

  if (perubahan.length === 0) {
    console.log(
      "Semua nama sudah rapi dan tidak ada yang kembar. Lanjut ke SQL indeks unik.\n",
    );
    return;
  }
  if (!terapkan) {
    console.log(
      "MODE UJI COBA: belum ada yang disimpan. Jalankan lagi dengan --terapkan bila sudah sesuai.\n",
    );
    return;
  }

  let berhasil = 0;
  for (const p of perubahan) {
    const { error: errUpdate } = await db
      .from("users")
      .update({ nama: p.baru })
      .eq("id", p.id);
    if (errUpdate) {
      throw new Error(
        `Gagal mengubah akun "${p.username}": ${errUpdate.message} (${berhasil} dari ${perubahan.length} sudah tersimpan; jalankan lagi untuk melanjutkan)`,
      );
    }
    berhasil++;
  }
  console.log(
    `Selesai: ${berhasil} nama dirapikan. Lanjut ke SQL indeks unik.\n`,
  );
}

utama().catch((err) => {
  console.error("Gagal:", err.message);
  process.exitCode = 1;
});
