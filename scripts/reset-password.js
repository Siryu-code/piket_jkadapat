// Membuat password acak baru untuk satu akun.
// Pemakaian: node scripts/reset-password.js <username>
const bcrypt = require("bcryptjs");
const { muatEnv } = require("./_env");
const { passwordAcak } = require("./_password");

async function utama() {
  const argumen = process.argv.slice(2);
  if (argumen.length !== 1) {
    throw new Error("Pemakaian: node scripts/reset-password.js <username>");
  }
  const username = argumen[0].trim().toLowerCase();

  muatEnv();
  const { ambilDb } = require("../netlify/functions/_lib/db");
  const db = ambilDb();

  // Cari akunnya
  const { data: user, error } = await db
    .from("users")
    .select("id, username, nama, role")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error("Gagal membaca tabel users: " + error.message);
  if (!user) {
    throw new Error(
      `Username "${username}" tidak ditemukan. Periksa penulisannya (huruf kecil, tanpa spasi). Daftar username ada di Supabase, Table Editor, tabel users.`,
    );
  }

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
    `\nPassword baru untuk ${user.username} (${user.nama}, ${user.role}):\n`,
  );
  console.log(`  ${password}\n`);
  console.log("Password ini HANYA ditampilkan sekali. Salin sekarang.\n");
}

utama().catch((err) => {
  console.error("Gagal:", err.message);
  process.exitCode = 1;
});
