/**
 * Lightly obfuscated base64url JSON for reveal links.
 * This is NOT encryption — anyone with the link can decode the match.
 */

const KEY = new TextEncoder().encode("HOHOHO");

function xorBytes(bytes) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ KEY[i % KEY.length];
  }
  return out;
}

export function bytesToBase64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlToBytes(str) {
  const clean = String(str || "").replace(/[^A-Za-z0-9_-]/g, "");
  const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
  const b64 = clean.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64url(xorBytes(bytes));
}

/**
 * @param {string} token
 * @returns {object | null}
 */
export function decodePayload(token) {
  try {
    const bytes = xorBytes(base64urlToBytes(token));
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Build the text-message body. The full family headline is included
 * so the recipient sees the same name as the app banner.
 */
export function composeSms({ giverName, title, link, budget, date }) {
  const headline = (title || "").trim() || "The Swanson Family Secret Santa 2026";
  let message = `Ho ho ho, ${giverName}! Your Secret Santa match for ${headline} is ready: ${link}`;
  const extras = [];
  const prettyBudget = formatBudget(budget);
  const prettyDate = formatDate(date);
  if (prettyBudget) extras.push(`budget ${prettyBudget}`);
  if (prettyDate) extras.push(`exchange ${prettyDate}`);
  if (extras.length) message += ` (${extras.join(", ")})`;
  return message;
}

export function formatTitleForSms(title) {
  const t = (title || "").trim() || "The Swanson Family Secret Santa 2026";
  return t.replace(/^The\s+/i, "");
}

export function formatBudget(budget) {
  if (budget == null) return "";
  const raw = String(budget).trim();
  if (!raw) return "";
  if (/^\$/.test(raw)) return raw;
  if (/^\d+(\.\d{1,2})?$/.test(raw)) return `$${raw}`;
  return raw;
}

export function formatDate(date) {
  if (!date) return "";
  const raw = String(date).trim();
  if (!raw) return "";
  // Already a pretty string
  if (/[A-Za-z]/.test(raw) && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = months[Number(m[2]) - 1];
  const day = Number(m[3]);
  if (!month) return raw;
  return `${month} ${day}, ${m[1]}`;
}

/**
 * Cross-platform sms: URI. The "?&body=" form works on iOS and Android.
 * If no phone is given, the Messages app still opens with the body prefilled.
 */
export function smsUri(phone, body) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  const dest = cleaned ? cleaned : "";
  return `sms:${dest}?&body=${encodeURIComponent(body)}`;
}

export function revealHash(token) {
  return `#r/${token}`;
}

export function parseRevealHash(hash) {
  const h = String(hash || "").replace(/^#/, "");
  const m = h.match(/^r\/(.+)$/);
  return m ? m[1] : null;
}
