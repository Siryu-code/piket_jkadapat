// Klien Supabase. Hanya dipakai di server (memakai secret key).
const { createClient } = require("@supabase/supabase-js");

let klien = null;

// Dibuat sekali, lalu dipakai ulang
function ambilDb() {
  if (!klien) {
    const url = process.env.SUPABASE_URL;
    const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !kunci) {
      throw new Error(
        "SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di environment",
      );
    }
    klien = createClient(url, kunci, {
      // Kita tidak memakai Supabase Auth, jadi tidak perlu simpan sesi
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return klien;
}

module.exports = { ambilDb };
