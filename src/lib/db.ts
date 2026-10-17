import Database from "better-sqlite3";
import { join } from "node:path";

// 全局单例：dev 模式下模块会被反复加载，挂在 globalThis 上避免重复开连接
const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

function createDb() {
  const db = new Database(join(process.cwd(), "db", "zongce.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON"); // 学号外键真实生效
  return db;
}

export const db = globalForDb.sqlite ?? createDb();
if (!globalForDb.sqlite) globalForDb.sqlite = db;
