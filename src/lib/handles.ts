/** Normalizes @name, name, or a profile link into a lowercase username, or null if invalid. */
export function cleanHandle(raw: string, min: number): string | null {
  let v = raw.trim();
  v = v.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|t\.me)\//i, "").split(/[/?#]/)[0];
  v = v.replace(/^@+/, "").toLowerCase();
  return new RegExp(`^[a-z0-9_]{${min},32}$`).test(v) ? v : null;
}
