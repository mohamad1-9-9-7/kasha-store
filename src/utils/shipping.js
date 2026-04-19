// Shipping zones: JSON-string in settings.shippingZones.
// Each zone: { name, emirates: ["dubai", ...], fee, freeOver, perKg }

export function parseZones(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function findZone(zones, emirate) {
  if (!zones?.length || !emirate) return null;
  for (const z of zones) {
    if ((z.emirates || []).includes(emirate)) return z;
  }
  return zones.find((z) => (z.emirates || []).includes("*")) || null;
}

// Compute shipping cost given zone, subtotal, total cart weight (kg)
export function computeShipping({ zones, emirate, subtotal, weightKg, fallbackFee = 15, fallbackFreeOver = 200 }) {
  const zone = findZone(zones, emirate);
  if (!zone) {
    if (Number(fallbackFreeOver) > 0 && subtotal >= Number(fallbackFreeOver)) return { fee: 0, freeShip: true, zone: null };
    return { fee: Number(fallbackFee) || 0, freeShip: false, zone: null };
  }
  const base = Number(zone.fee) || 0;
  const perKg = Number(zone.perKg) || 0;
  const freeOver = Number(zone.freeOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) return { fee: 0, freeShip: true, zone };
  const extraKg = Math.max(0, (Number(weightKg) || 0) - 1);
  const fee = base + extraKg * perKg;
  return { fee: Math.round(fee * 100) / 100, freeShip: false, zone };
}

export function cartWeight(items) {
  return (items || []).reduce((s, it) => {
    const w = Number(it.weight) || 0;
    const q = Number(it.qty) || 1;
    return s + w * q;
  }, 0);
}
