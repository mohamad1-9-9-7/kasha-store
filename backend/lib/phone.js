// Canonical UAE phone format: 05XXXXXXXX (10 digits, starts with 05)
// Accepts: 05XXXXXXXX, +9715XXXXXXXX, 9715XXXXXXXX, 005XXXXXXXX, with spaces/dashes.

function normalizePhone(input) {
  if (input == null) return "";
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("971")) digits = "0" + digits.slice(3);
  return digits;
}

function isValidPhone(input) {
  return /^05\d{8}$/.test(normalizePhone(input));
}

module.exports = { normalizePhone, isValidPhone };
