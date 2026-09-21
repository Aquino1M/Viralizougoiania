import fs from "node:fs/promises";
import path from "node:path";
import crypto, { randomUUID } from "node:crypto";
import type { StaffUser, StaffUserPublic, UserRole } from "@/lib/types";

const localUsersFile = path.join(process.cwd(), "data", "users.json");

function hasSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return false;
  const lowerUrl = url.toLowerCase();
  const lowerKey = key.toLowerCase();
  if (lowerUrl.includes("seu-projeto") || lowerUrl.includes("your-project") || lowerUrl.includes("example")) return false;
  if (lowerKey.includes("seu_service_role_key") || lowerKey.includes("your_service_role_key") || lowerKey.includes("troque")) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co") && key.length > 20;
  } catch {
    return false;
  }
}

function headers(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function sb(pathname: string, init?: RequestInit) {
  const base = process.env.SUPABASE_URL!.trim().replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    ...init,
    cache: "no-store",
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function readLocalUsers(): Promise<StaffUser[]> {
  const raw = await fs.readFile(localUsersFile, "utf8");
  return JSON.parse(raw);
}

async function writeLocalUsers(users: StaffUser[]) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Para cadastrar usuários na Vercel, configure o Supabase e execute supabase/schema.sql.");
  }
  await fs.writeFile(localUsersFile, JSON.stringify(users, null, 2), "utf8");
}

export function publicUser(user: StaffUser): StaffUserPublic {
  const { password_hash: _, ...safe } = user;
  return safe;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, expectedHex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export async function getUsers(): Promise<StaffUser[]> {
  if (hasSupabaseConfig()) {
    return await sb("staff_users?select=*&order=name.asc");
  }
  return (await readLocalUsers()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUserById(id: string) {
  if (hasSupabaseConfig()) {
    const rows = await sb(`staff_users?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows?.[0] as StaffUser | undefined;
  }
  return (await readLocalUsers()).find((u) => u.id === id);
}

export async function getUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return undefined;
  if (hasSupabaseConfig()) {
    const rows = await sb(`staff_users?select=*&username=eq.${encodeURIComponent(normalized)}&limit=1`);
    return rows?.[0] as StaffUser | undefined;
  }
  return (await readLocalUsers()).find((u) => u.username === normalized);
}

export async function authenticateUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) return undefined;
  return user;
}

export async function createUser(input: { username: string; name: string; password: string; role: UserRole; active?: boolean }) {
  const username = normalizeUsername(input.username);
  const name = input.name.trim();
  if (username.length < 3) throw new Error("O login precisa ter pelo menos 3 caracteres.");
  if (!name) throw new Error("Digite o nome do usuário.");
  if (input.password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  if (!["admin", "journalist"].includes(input.role)) throw new Error("Função inválida.");
  if (await getUserByUsername(username)) throw new Error("Esse login já está em uso.");

  const now = new Date().toISOString();
  const user: StaffUser = {
    id: randomUUID(),
    username,
    name,
    password_hash: hashPassword(input.password),
    role: input.role,
    active: input.active !== false,
    created_at: now,
    updated_at: now,
  };

  if (hasSupabaseConfig()) {
    const rows = await sb("staff_users", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(user),
    });
    return rows[0] as StaffUser;
  }

  const users = await readLocalUsers();
  users.push(user);
  await writeLocalUsers(users);
  return user;
}

export async function updateUser(id: string, input: { username?: string; name?: string; password?: string; role?: UserRole; active?: boolean }) {
  const current = await getUserById(id);
  if (!current) throw new Error("Usuário não encontrado.");

  const patch: Partial<StaffUser> = { updated_at: new Date().toISOString() };
  if (input.username !== undefined) {
    const username = normalizeUsername(input.username);
    if (username.length < 3) throw new Error("O login precisa ter pelo menos 3 caracteres.");
    const same = await getUserByUsername(username);
    if (same && same.id !== id) throw new Error("Esse login já está em uso.");
    patch.username = username;
  }
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("O nome não pode ficar vazio.");
    patch.name = name;
  }
  if (input.role !== undefined) {
    if (!["admin", "journalist"].includes(input.role)) throw new Error("Função inválida.");
    patch.role = input.role;
  }
  if (input.active !== undefined) patch.active = Boolean(input.active);
  if (input.password) {
    if (input.password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    patch.password_hash = hashPassword(input.password);
  }

  if (hasSupabaseConfig()) {
    const rows = await sb(`staff_users?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    return rows[0] as StaffUser;
  }

  const users = await readLocalUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index < 0) throw new Error("Usuário não encontrado.");
  users[index] = { ...users[index], ...patch };
  await writeLocalUsers(users);
  return users[index];
}

export async function deleteUser(id: string) {
  if (hasSupabaseConfig()) {
    await sb(`staff_users?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const users = (await readLocalUsers()).filter((u) => u.id !== id);
  await writeLocalUsers(users);
}

export function usersStorageMode() {
  return hasSupabaseConfig() ? "supabase" : process.env.NODE_ENV === "production" ? "readonly-demo" : "local-json";
}
