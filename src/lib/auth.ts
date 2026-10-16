import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import type { Participant } from "@/lib/types";

const USER_COOKIE = "osm_session";
const ADMIN_COOKIE = "osm_admin";
const USER_MAX_AGE = 35 * 24 * 60 * 60;
const ADMIN_MAX_AGE = 12 * 60 * 60;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function pack(subject: string, maxAgeSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ s: subject, e: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function unpack(value: string | undefined): string | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.s !== "string" || typeof parsed.e !== "number" || parsed.e < Date.now()) return null;
    return parsed.s;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/* ---------- participants ---------- */
export async function startSession(participantId: string) {
  const jar = await cookies();
  jar.set(USER_COOKIE, pack(participantId, USER_MAX_AGE), cookieOpts(USER_MAX_AGE));
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
}

export async function currentParticipant(): Promise<Participant | null> {
  const jar = await cookies();
  const id = unpack(jar.get(USER_COOKIE)?.value);
  if (!id) return null;
  const { data } = await db().from("participants").select("*").eq("id", id).maybeSingle();
  const p = data as Participant | null;
  return p && !p.banned ? p : null;
}

export async function requireUser(): Promise<{ user: Participant } | { error: Response }> {
  const user = await currentParticipant();
  if (!user) return { error: fail("Join the campaign first to submit.", 401) };
  return { user };
}

/* ---------- admin (single shared password) ---------- */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function startAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, pack("admin", ADMIN_MAX_AGE), cookieOpts(ADMIN_MAX_AGE));
}

export async function endAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function requireAdmin(): Promise<{ admin: true } | { error: Response }> {
  const jar = await cookies();
  if (unpack(jar.get(ADMIN_COOKIE)?.value) !== "admin") return { error: fail("Admin login required.", 401) };
  return { admin: true };
}

/* ---------- access codes (lets an owner sign back in; X accounts cannot be re-registered) ---------- */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newAccessCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export function hashAccessCode(code: string): string {
  const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHmac("sha256", secret()).update(`access:${norm}`).digest("base64url");
}

export function accessCodeMatches(input: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const a = Buffer.from(hashAccessCode(input));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
