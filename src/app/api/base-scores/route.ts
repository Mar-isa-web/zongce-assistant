import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const ACADEMIC_YEAR = "2025-2026"; // 学年切换 v2 再做

const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];

// GET /api/base-scores → 当前登录用户本学年的基础分（没录过的育不返回，前端补 0）
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const rows = db
    .prepare(
      "SELECT dimension, base_score, peer_score, deduction FROM base_scores WHERE student_id = ? AND academic_year = ?",
    )
    .all(user.studentId, ACADEMIC_YEAR);
  return NextResponse.json(rows);
}

// POST /api/base-scores → 批量保存（复合主键 upsert：重复保存覆盖，不产生重复行）
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "没有要保存的数据" }, { status: 400 });
  }

  const upsert = db.prepare(
    `INSERT INTO base_scores (student_id, academic_year, dimension, base_score, peer_score, deduction)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id, academic_year, dimension) DO UPDATE SET
       base_score = excluded.base_score,
       peer_score = excluded.peer_score,
       deduction = excluded.deduction`,
  );

  const saved = db.transaction(() => {
    for (const r of rows) {
      const dimension = String(r?.dimension ?? "");
      if (!DIMENSIONS.includes(dimension)) {
        throw new Error(`未知的育别：${dimension}`);
      }
      const num = (v: unknown) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${dimension}的分数必须是≥0的数字`);
        return n;
      };
      upsert.run(user.studentId, ACADEMIC_YEAR, dimension, num(r.baseScore), num(r.peerScore), num(r.deduction));
    }
  });

  try {
    saved();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存失败" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
