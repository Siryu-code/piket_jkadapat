// Menghitung jarak dua titik di bumi (rumus Haversine), hasil dalam meter.
const RADIUS_BUMI_M = 6371000;

function keRadian(derajat) {
  return (derajat * Math.PI) / 180;
}

function jarakMeter(lat1, lng1, lat2, lng2) {
  const dLat = keRadian(lat2 - lat1);
  const dLng = keRadian(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(keRadian(lat1)) *
      Math.cos(keRadian(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS_BUMI_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

module.exports = { jarakMeter };
