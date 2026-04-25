// Shipping zones: settings.shippingZones is a JSON string of
// [{ name, emirates: ["dubai", ...], fee, freeOver, perKg }]
// Mirrors src/utils/shipping.js so server and client agree.

function parseZones(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function findZone(zones, emirate) {
  if (!zones?.length || !emirate) return null;
  for (const z of zones) {
    if ((z.emirates || []).includes(emirate)) return z;
  }
  return zones.find((z) => (z.emirates || []).includes("*")) || null;
}

function computeShipping({ zones, emirate, subtotal, weightKg, fallbackFee = 15, fallbackFreeOver = 200 }) {
  const zone = findZone(zones, emirate);
  if (!zone) {
    if (Number(fallbackFreeOver) > 0 && subtotal >= Number(fallbackFreeOver)) {
      return { fee: 0, freeShip: true, zone: null, zoneName: null };
    }
    return { fee: Number(fallbackFee) || 0, freeShip: false, zone: null, zoneName: null };
  }
  const base = Number(zone.fee) || 0;
  const perKg = Number(zone.perKg) || 0;
  const freeOver = Number(zone.freeOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) {
    return { fee: 0, freeShip: true, zone, zoneName: zone.name || null };
  }
  const extraKg = Math.max(0, (Number(weightKg) || 0) - 1);
  const fee = base + extraKg * perKg;
  return {
    fee: Math.round(fee * 100) / 100,
    freeShip: false,
    zone,
    zoneName: zone.name || null,
  };
}

module.exports = { parseZones, findZone, computeShipping };
