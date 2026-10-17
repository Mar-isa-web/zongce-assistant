// 数据库初始化脚本：建表 + 灌入规则种子数据 + 种子学生
// 用法：npm run db:init          （安全模式：库已存在且有活动数据时拒绝执行）
//       npm run db:init -- --force （清空重建，慎用）
import Database from "better-sqlite3";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = join(here, "zongce.db");

if (existsSync(dbPath)) {
  const probe = new Database(dbPath, { readonly: true });
  const hasActivities = probe
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='activities'")
    .get();
  const count =
    hasActivities && hasActivities.n > 0
      ? probe.prepare("SELECT COUNT(*) AS n FROM activities").get().n
      : 0;
  probe.close();
  if (count > 0 && !process.argv.includes("--force")) {
    console.error(`已存在 ${count} 条活动数据，拒绝重建。确认要清空请加 --force`);
    process.exit(1);
  }
  rmSync(dbPath);
}

const db = new Database(dbPath);
db.exec(readFileSync(join(here, "schema.sql"), "utf8"));
db.exec(readFileSync(join(here, "seed_rules.sql"), "utf8"));

// 种子学生：作者本人（信息来自他综测表表头），INSERT OR IGNORE 防重复
db.prepare(
  "INSERT OR IGNORE INTO students (student_id, name, class_name, college, major, phone) VALUES (?, ?, ?, ?, ?, ?)",
).run("251543528", "江圳宇", "2515435", "计算机学院", "计算机科学与技术", "");

const rules = db.prepare("SELECT COUNT(*) AS n FROM rules").get().n;
console.log(`数据库已初始化: ${dbPath}（规则 ${rules} 条，种子学生 1 人）`);
db.close();
