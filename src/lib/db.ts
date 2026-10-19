import Database from "better-sqlite3";
import { join } from "node:path";

// 全局单例：dev 模式下模块会被反复加载，挂在 globalThis 上避免重复开连接
const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

function createDb() {
  const db = new Database(join(process.cwd(), "db", "zongce.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON"); // 学号外键真实生效
  ensureSchema(db);
  return db;
}

// 幂等补列：老库（线上已有数据）启动时自动补齐，省掉一次手动迁移
function ensureSchema(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(students)").all() as { name: string }[];
  if (cols.length === 0) return; // 表还没建（未跑 db:init），交给 init 脚本
  if (!cols.some((c) => c.name === "must_change_password")) {
    db.exec("ALTER TABLE students ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0");
  }
}

export const db = globalForDb.sqlite ?? createDb();
if (!globalForDb.sqlite) globalForDb.sqlite = db;
