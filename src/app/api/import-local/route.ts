import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// POST /api/import-local → 把"本地试算"时存在浏览器里的数据搬进账号
// 分值不信任前端：按 rule_id 重新查规则算分，和 /api/activities 同一套口径
const ACADEMIC_YEAR = "2025-2026";
const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];
const MAX_ACTIVITIES = 300;

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const acts = Array.isArray(body?.activities) ? body.activities : [];
  const base = body?.base && typeof body.base === "object" ? body.base : null;

  if (acts.length > MAX_ACTIVITIES) {
    return NextResponse.json({ error: `一次最多导入 ${MAX_ACTIVITIES} 条活动` }, { status: 400 });
  }
  if (acts.length === 0 && !base) {
    return NextResponse.json({ error: "没有要导入的数据" }, { status: 400 });
  }

  const ruleStmt = db.prepare("SELECT rule_id, dimension, points, unit FROM rules WHERE rule_id = ?");
  const insertAct = db.prepare(
    `INSERT INTO activities (student_id, rule_id, title, activity_date, dimension, quantity, points, evidence_path, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const upsertBase = db.prepare(
    `INSERT INTO base_scores (student_id, academic_year, dimension, base_score, peer_score, deduction)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, academic_year, dimension) DO UPDATE SET
       base_score = excluded.base_score,
       peer_score = excluded.peer_score,
       deduction = excluded.deduction`,
  );

  let imported = 0;
  let skipped = 0;
  let baseSaved = 0;

  const run = db.transaction(() => {
    db.prepare("INSERT OR IGNORE INTO students (student_id, name, class_name) VALUES (?, '', '')").run(user.studentId);

    for (const a of acts) {
      const ruleId = Number(a?.ruleId);
      const title = String(a?.title ?? "").trim().slice(0, 200);
      const qtyRaw = a?.quantity === undefined ? 1 : Number(a.quantity);
      if (!title || !Number.isInteger(ruleId)) {
        skipped += 1;
        continue;
      }
      const rule = ruleStmt.get(ruleId) as { rule_id: number; dimension: string; points: number; unit: string } | undefined;
      if (!rule) {
        skipped += 1;
        continue;
      }
      const quantity = rule.unit ? Math.min(Math.max(Number(qtyRaw) || 1, 0.01), 999) : 1;
      const points = Math.round(rule.points * quantity * 100) / 100;
      insertAct.run(
        user.studentId,
        rule.rule_id,
        title,
        localToday(),
        rule.dimension,
        quantity,
        points,
        String(a?.evidencePath ?? "").trim().slice(0, 300),
        String(a?.remark ?? "").trim().slice(0, 300),
      );
      imported += 1;
    }

    if (base) {
      for (const dim of DIMENSIONS) {
        const row = (base as Record<string, { baseScore?: unknown; peerScore?: unknown; deduction?: unknown }>)[dim];
        if (!row) continue;
        const num = (v: unknown) => {
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000) : 0;
        };
        upsertBase.run(user.studentId, ACADEMIC_YEAR, dim, num(row.baseScore), num(row.peerScore), num(row.deduction));
        baseSaved += 1;
      }
    }
  });

  try {
    run();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "导入失败" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, imported, skipped, baseSaved });
}
