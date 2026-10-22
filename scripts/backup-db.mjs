// 数据库在线备份：用 better-sqlite3 的 backup API（WAL 模式下直接 cp 可能拷到不一致的快照）
// 由 cron 每天跑一次，保留最近 N 份
//   node scripts/backup-db.mjs [--keep=14]
import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "db", "zongce.db");
const OUT_DIR = path.join(ROOT, "db", "backups");
const KEEP = Number(process.argv.find((a) => a.startsWith("--keep="))?.split("=")[1] ?? 14);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`[backup] 找不到数据库：${DB_PATH}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const dest = path.join(OUT_DIR, `zongce-${stamp()}.db`);
  const src = new Database(DB_PATH, { readonly: true });

  // 在线备份：不阻塞写入，拿到的是事务一致的快照
  await src.backup(dest);
  src.close();

  // 备份文件默认是 WAL 模式，会带 .wal/.shm 两个侧文件；切成 DELETE 模式，
  // 让它变成单个自包含文件，拷走/回滚都省事
  const norm = new Database(dest);
  norm.pragma("journal_mode = DELETE");
  norm.close();
  for (const side of [`${dest}-wal`, `${dest}-shm`]) {
    if (existsSync(side)) unlinkSync(side);
  }

  // 校验：完整性 + 关键表行数，防止备份出一个坏文件还不知道
  const check = new Database(dest, { readonly: true });
  const integrity = check.pragma("integrity_check", { simple: true });
  const counts = {
    students: check.prepare("SELECT count(*) c FROM students").get().c,
    activities: check.prepare("SELECT count(*) c FROM activities").get().c,
    rules: check.prepare("SELECT count(*) c FROM rules").get().c,
  };
  check.close();

  const size = Math.round(statSync(dest).size / 1024);
  if (integrity !== "ok") {
    console.error(`[backup] ❌ 完整性校验失败：${integrity}（文件保留待排查）${dest}`);
    process.exit(1);
  }

  // 清理：只留最近 KEEP 份
  const files = readdirSync(OUT_DIR)
    .filter((f) => /^zongce-\d{4}-\d{2}-\d{2}-\d{6}\.db$/.test(f))
    .sort()
    .reverse();
  const removed = files.slice(KEEP);
  for (const f of removed) unlinkSync(path.join(OUT_DIR, f));

  console.log(
    `[backup] ✅ ${path.basename(dest)} ${size}KB ` +
      `students=${counts.students} activities=${counts.activities} rules=${counts.rules} ` +
      `保留${Math.min(files.length, KEEP)}份${removed.length ? `，清理${removed.length}份` : ""}`,
  );
}

main().catch((e) => {
  console.error(`[backup] ❌ 失败：${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
