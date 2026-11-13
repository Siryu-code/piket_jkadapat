// js/camera.js
// Mengurus kamera live (getUserMedia) dan pengambilan foto.
// Tidak memakai input type file: foto hanya dari kamera.

const MAKS_SISI = 1280; // sisi terpanjang foto (px)
const KUALITAS_JPEG = 0.7;

let stream = null; // stream kamera yang sedang aktif
let mode = "environment"; // 'environment' (belakang) atau 'user' (depan)
let urutan = 0; // penanda untuk membatalkan pembukaan kamera yang tertunda

// Hentikan semua track kamera dan lepaskan dari elemen video
export function hentikanKamera(video) {
  urutan += 1; // batalkan pembukaan kamera yang masih menunggu izin
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (video) video.srcObject = null;
}

// Buka kamera. Mengembalikan { ok: true } atau { ok: false, kode }.
// Panggil dari handler klik. Stream lama selalu dihentikan dulu.
export async function bukaKamera(video, modeBaru = mode) {
  hentikanKamera(video);
  const nomor = urutan;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, kode: "TIDAK_DIDUKUNG" };
  }

  try {
    const streamBaru = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: modeBaru },
      audio: false,
    });

    // Pengguna sudah menutup kamera saat menunggu izin: buang stream ini
    if (nomor !== urutan) {
      streamBaru.getTracks().forEach((track) => track.stop());
      return { ok: false, kode: "DIBATALKAN" };
    }

    stream = streamBaru;
    mode = modeBaru;
    video.srcObject = stream;
    await video.play().catch(() => {}); // autoplay biasanya sudah jalan
    return { ok: true };
  } catch (galat) {
    return { ok: false, kode: galat.name || "GALAT" };
  }
}

// Tukar kamera belakang <-> depan
export function tukarKamera(video) {
  return bukaKamera(video, mode === "environment" ? "user" : "environment");
}

// Ambil frame video, perkecil, ekspor JPEG.
// Mengembalikan { dataUrl, base64 } atau null bila video belum siap.
// base64 = isi saja, tanpa awalan "data:image/jpeg;base64,".
export function ambilFoto(video) {
  const lebarAsli = video.videoWidth;
  const tinggiAsli = video.videoHeight;
  if (!lebarAsli || !tinggiAsli) return null;

  // Perkecil bila perlu (tidak pernah diperbesar). Hasil tidak dicerminkan.
  const skala = Math.min(1, MAKS_SISI / Math.max(lebarAsli, tinggiAsli));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(lebarAsli * skala);
  canvas.height = Math.round(tinggiAsli * skala);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", KUALITAS_JPEG);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}
