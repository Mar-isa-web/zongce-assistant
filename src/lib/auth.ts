import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

// 会话 Cookie 名与有效期
export const SESSION_COOKIE = "zongce_session";
const SESSION_DAYS = 30;

// 密码散列：scrypt + 随机盐，存 "盐:散列"（与 db/migrate-auth.mjs 保持一致）
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// 校验密码：timingSafeEqual 防时序攻击（虽然场景简单，习惯要从第一行代码养成）
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

// 登录成功：创建会话令牌（30天有效），返回令牌给路由设置 Cookie
export function createSession(studentId: string): { token: string; maxAge: number } {
  const token = randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions (token, student_id, expires_at) VALUES (?, ?, datetime('now', 'localtime', '+30 days'))",
  ).run(token, studentId);
  // 顺手清理过期会话，防止表无限膨胀
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now', 'localtime')");
  return { token, maxAge: SESSION_DAYS * 24 * 3600 };
}

export function destroySession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// 从请求 Cookie 里读出会话令牌；没有则返回 null
export function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return (
    cookieHeader
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) ?? null
  );
}

// 从请求 Cookie 里解析当前登录用户；未登录返回 null
export function getSessionUser(request: Request): { studentId: string; role: string } | null {
  const token = getSessionToken(request);
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.student_id, st.role FROM sessions s
       JOIN students st ON st.student_id = s.student_id
       WHERE s.token = ? AND s.expires_at > datetime('now', 'localtime')`,
    )
    .get(token) as { student_id: string; role: string } | undefined;
  if (!row) return null;
  return { studentId: row.student_id, role: row.role };
}
