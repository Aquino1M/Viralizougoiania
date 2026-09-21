import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/users";
import type { StaffUser, StaffUserPublic } from "@/lib/types";

const COOKIE_NAME = "viralizougoiania_staff";
const MAX_AGE = 60 * 60 * 12;

function sign(payload: string, passwordHash: string) {
  return crypto.createHmac("sha256", passwordHash).update(payload).digest("hex");
}

export async function createAdminSession(user: StaffUser) {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify({
    uid: user.id,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  })).toString("base64url");

  store.set(COOKIE_NAME, `${payload}.${sign(payload, user.password_hash)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<StaffUserPublic | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);

  let parsed: { uid?: string; exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed.uid || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
  const user = await getUserById(parsed.uid);
  if (!user || !user.active) return null;

  const expected = sign(payload, user.password_hash);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const { password_hash: _, ...safe } = user;
  return safe;
}

export async function isAdmin() {
  return Boolean(await getSession());
}

export async function isSuperAdmin() {
  return (await getSession())?.role === "admin";
}
