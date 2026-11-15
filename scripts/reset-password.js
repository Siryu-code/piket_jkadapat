// Membuat password acak baru untuk satu akun.
// Pemakaian:
//   node scripts/reset-password.js "Budi Santoso"     (nama lengkap)
//   node scripts/reset-password.js budi               (username)
const bcrypt = require("bcryptjs");
const { muatEnv } = require("./_env");
const { passwordAcak } = require("./_password");
const { normalisasiNama } = require("../netlify/functions/_lib/nama");

async function utama() {
  const argumen = process.argv.slice(2);
  if (argumen.length < 1) {
    throw new Error(
      'Pemakaian: node scripts/reset-password.js "Nama Lengkap"  (atau username)',
    );
  }
  const masukan = argumen.join(" ").trim(); // nama tanpa tanda kutip pun tetap terbaca
  if (masukan === "") throw new Error("Nama atau username tidak boleh kosong");

  muatEnv();
  const { ambilDb } = require("../netlify/functions/_lib/db");
  const db = ambilDb();

  // Cari berdasarkan username dulu, lalu berdasarkan nama lengkap
  const kolom = "id, username, nama, role";
  let { data: cocok, error } = await db
    .from("users")
    .select(kolom)
    .eq("username", masukan.toLowerCase());
  if (error) throw new Error("Gagal membaca tabel users: " + error.message);
  if (cocok.length === 0) {
    const nama = normalisasiNama(masukan);
    if (nama !== "") {
      ({ data: cocok, error } = await db
        .from("users")
        .select(kolom)
        .eq("nama", nama));
      if (error) throw new Error("Gagal membaca tabel users: " + error.message);
    }
  }
  if (cocok.length === 0) {
    throw new Error(
      `Akun "${masukan}" tidak ditemukan (dicari sebagai username lalu sebagai nama lengkap). Periksa penulisannya di Supabase, Table Editor, tabel users.`,
    );
  }
  if (cocok.length > 1) {
    throw new Error(
      `Ada ${cocok.length} akun yang cocok dengan "${masukan}". Pakai username yang pasti.`,
    );
  }
  const user = cocok[0];

  // Buat password baru, simpan hash-nya saja
  const password = passwordAcak(10);
  const hash = await bcrypt.hash(password, 10);
  const { data: terubah, error: errUpdate } = await db
    .from("users")
    .update({ password_hash: hash })
    .eq("id", user.id)
    .select("id");
  if (errUpdate)
    throw new Error("Gagal menyimpan password baru: " + errUpdate.message);
  if (!terubah || terubah.length !== 1)
    throw new Error(
      "Password tidak tersimpan (akun tidak ditemukan saat diubah)",
    );

  console.log(
    `\nPassword baru untuk ${user.nama} (${user.role}, username ${user.username}):\n`,
  );
  console.log(`  ${password}\n`);
  console.log("Password ini HANYA ditampilkan sekali. Salin sekarang.\n");
}

utama().catch((err) => {
  console.error("Gagal:", err.message);
  process.exitCode = 1;
});
