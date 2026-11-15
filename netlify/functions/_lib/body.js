// Membaca body request sebagai JSON dengan aman.
// Mengembalikan objek, atau null bila body kosong, terlalu besar, atau bukan objek JSON.
function bacaJson(event, maksByte = 10000) {
  if (typeof event.body !== "string") return null;

  let teks = event.body;
  if (event.isBase64Encoded) {
    teks = Buffer.from(teks, "base64").toString("utf8");
  }
  if (Buffer.byteLength(teks, "utf8") > maksByte) return null;

  try {
    const hasil = JSON.parse(teks);
    if (hasil && typeof hasil === "object" && !Array.isArray(hasil)) {
      return hasil;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { bacaJson };
