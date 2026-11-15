// Pengujian cepat untuk time.js, schedule.js, dan geo.js.
// Jalankan: node scripts/test-util.js
const assert = require("assert");
const {
  waktuWib,
  jamKirimWib,
  dalamSesi,
} = require("../netlify/functions/_lib/time");
const { hariJadwal, namaHari } = require("../netlify/functions/_lib/schedule");
const { jarakMeter } = require("../netlify/functions/_lib/geo");

let lolos = 0;
let gagalHitung = 0;

function uji(nama, fungsi) {
  try {
    fungsi();
    console.log("OK     " + nama);
    lolos++;
  } catch (err) {
    console.log("GAGAL  " + nama + "  ->  " + err.message);
    gagalHitung++;
  }
}

// ---------- schedule.js ----------
uji("absen 1 jatuh di Senin", () => assert.strictEqual(hariJadwal(1), 1));
uji("absen 5 jatuh di Jumat", () => assert.strictEqual(hariJadwal(5), 5));
uji("absen 6 kembali ke Senin", () => assert.strictEqual(hariJadwal(6), 1));
uji("absen 31 jatuh di Senin", () => {
  assert.strictEqual(hariJadwal(31), 1);
  assert.strictEqual(namaHari(hariJadwal(31)), "Senin");
});
uji("absen 34 jatuh di Kamis", () => {
  assert.strictEqual(hariJadwal(34), 4);
  assert.strictEqual(namaHari(hariJadwal(34)), "Kamis");
});

// ---------- time.js ----------
uji("2026-11-09T22:30:00Z = 10 Nov 2026 05:30 WIB (Selasa)", () => {
  const w = waktuWib(new Date("2026-11-09T22:30:00Z"));
  assert.strictEqual(w.tanggal, "2026-11-10");
  assert.strictEqual(w.hari, 2);
  assert.strictEqual(w.jam, 5);
  assert.strictEqual(w.menit, 30);
});
uji("tengah malam WIB tertulis jam 0 (bukan 24)", () => {
  const w = waktuWib(new Date("2026-11-09T17:00:00Z"));
  assert.strictEqual(w.tanggal, "2026-11-10");
  assert.strictEqual(w.jam, 0);
});
uji("8 Nov 2026 adalah Minggu (hari = 7)", () => {
  assert.strictEqual(waktuWib(new Date("2026-11-08T12:00:00Z")).hari, 7);
});
uji("created_at 08:42 UTC menjadi 15:42 WIB", () => {
  assert.strictEqual(jamKirimWib("2026-11-06T08:42:00.123456+00:00"), "15:42");
});
uji("sesi: 05:00:00 WIB boleh, 04:59:59 tidak", () => {
  assert.strictEqual(
    dalamSesi(waktuWib(new Date("2026-11-09T22:00:00Z")), 5, 17),
    true,
  );
  assert.strictEqual(
    dalamSesi(waktuWib(new Date("2026-11-09T21:59:59Z")), 5, 17),
    false,
  );
});
uji("sesi: 17:00:00 WIB boleh, 17:00:01 tidak", () => {
  assert.strictEqual(
    dalamSesi(waktuWib(new Date("2026-11-10T10:00:00Z")), 5, 17),
    true,
  );
  assert.strictEqual(
    dalamSesi(waktuWib(new Date("2026-11-10T10:00:01Z")), 5, 17),
    false,
  );
});

// ---------- geo.js ----------
uji("titik yang sama berjarak 0 m", () => {
  assert.strictEqual(jarakMeter(-6.2, 106.8, -6.2, 106.8), 0);
});
uji("dua titik berjarak sekitar 100 m dihitung sekitar 100 m", () => {
  const jarak = jarakMeter(-6.2, 106.8, -6.2 + 0.0009, 106.8); // 0,0009 derajat lintang
  assert.ok(jarak > 99 && jarak < 101, "hasil: " + jarak.toFixed(2) + " m");
});
uji("1 derajat lintang sekitar 111,2 km", () => {
  const jarak = jarakMeter(0, 106.8, 1, 106.8);
  assert.ok(
    jarak > 111000 && jarak < 111400,
    "hasil: " + jarak.toFixed(0) + " m",
  );
});

console.log(`\nLolos: ${lolos}, gagal: ${gagalHitung}`);
process.exit(gagalHitung > 0 ? 1 : 0);
