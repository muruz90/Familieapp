import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "./db";

export type User = {
  id: number;
  name: string;
  username: string;
  role: "parent" | "child";
  color: string;
};

const COOKIE = "familie_session";
const SESSION_DAYS = 90;

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function userCount(): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}

export function verifyLogin(username: string, password: string): User | null {
  const row = db()
    .prepare("SELECT id, name, username, role, color, password_hash FROM users WHERE username = ?")
    .get(username.trim()) as (User & { password_hash: string }) | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  store.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.id, u.name, u.username, u.role, u.color FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as User | undefined;
  return row ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(userCount() === 0 ? "/opsaetning" : "/login");
  return user;
}

export async function requireParent(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "parent") redirect("/");
  return user;
}
