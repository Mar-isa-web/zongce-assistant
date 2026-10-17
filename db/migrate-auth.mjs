// 一次性迁移：存量库补上登录相关结构，并给管理员设置初始密码
// 用法：node db/migrate-auth.mjs
// 初始密码规则：zc + 学号（如 zc251543528），登录后建议自行修改（v2 提供改密码）
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(here, "zongce.db"));

// 散列算法与 src/lib/auth.ts 保持一致：scrypt(密码, 盐, 64) → "盐的hex:散列hex"
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function tryAdd(sql, label) {
  try {
    db.exec(sql);
    console.log(`✓ ${label}`);
  } catch (e) {
    console.log(`- ${label}（可能已存在）: ${e.message}`);
  }
}

tryAdd("ALTER TABLE students ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''", "students.password_hash");
tryAdd("ALTER TABLE students ADD COLUMN role TEXT NOT NULL DEFAULT 'student'", "students.role");
tryAdd(`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id),
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  expires_at TEXT NOT NULL
)`, "sessions 表");

// 给指定学号设置初始密码并升为管理员
const [, , targetId, role] = process.argv;
const id = targetId ?? "251543528";
const initialPassword = `zc${id}`;
db.prepare("UPDATE students SET password_hash = ?, role = ? WHERE student_id = ?")
  .run(hashPassword(initialPassword), role ?? "admin", id);
console.log(`✓ ${id} 初始密码已设置：${initialPassword}，角色：${role ?? "admin"}`);
db.close();
