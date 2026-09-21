import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "viralizougoiania_admin";
const MAX_AGE = 60 * 60 * 12;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function createAdminSession() {
  const store = await cookies();
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin:${expires}`;
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
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

export async function isAdmin() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const [, expiresRaw] = payload.split(":");
  return Number(expiresRaw) > Math.floor(Date.now() / 1000);
}
