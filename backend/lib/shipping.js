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
  // Coerce all numeric inputs up front. Without this, a string subtotal like
  // "200" compared with the numeric fallbackFreeOver via >= still works by
  // coincidence (JS coerces), but a NaN/undefined slips through silently and
  // gives wrong free-shipping decisions. Fail closed: NaN → 0 → never free.
  const sub = Number(subtotal);
  const subSafe = Number.isFinite(sub) ? sub : 0;
  const weight = Number(weightKg);
  const weightSafe = Number.isFinite(weight) ? weight : 0;
  const fbFee = Number(fallbackFee) || 0;
  const fbFreeOver = Number(fallbackFreeOver) || 0;

  const zone = findZone(zones, emirate);
  if (!zone) {
    if (fbFreeOver > 0 && subSafe >= fbFreeOver) {
      return { fee: 0, freeShip: true, zone: null, zoneName: null };
    }
    return { fee: fbFee, freeShip: false, zone: null, zoneName: null };
  }
  const base = Number(zone.fee) || 0;
  const perKg = Number(zone.perKg) || 0;
  const freeOver = Number(zone.freeOver) || 0;
  if (freeOver > 0 && subSafe >= freeOver) {
    return { fee: 0, freeShip: true, zone, zoneName: zone.name || null };
  }
  const extraKg = Math.max(0, weightSafe - 1);
  const fee = base + extraKg * perKg;
  return {
    fee: Math.round(fee * 100) / 100,
    freeShip: false,
    zone,
    zoneName: zone.name || null,
  };
}

module.exports = { parseZones, findZone, computeShipping };
