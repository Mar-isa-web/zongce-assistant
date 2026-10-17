import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ActivityRow } from "@/lib/types";

// GET /api/activities → 活动列表（联规则表带出条目展示信息）
export async function GET() {
  const rows = db
    .prepare(
      `SELECT a.activity_id, a.student_id, a.title, a.activity_date, a.dimension,
              a.points, a.status, a.evidence_path, a.remark,
              r.item_no, r.category, r.level, r.grade
       FROM activities a LEFT JOIN rules r ON a.rule_id = r.rule_id
       ORDER BY a.activity_id DESC`,
    )
    .all() as ActivityRow[];
  return NextResponse.json(rows);
}

// POST /api/activities → 录入一条活动
// 分值和育别以数据库里的规则为准（不信任前端传值），学号不存在时自动登记空学生
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const ruleId = Number(body?.ruleId);
  const title = String(body?.title ?? "").trim();
  const activityDate = String(body?.activityDate ?? "").trim();
  const evidencePath = String(body?.evidencePath ?? "").trim();
  const remark = String(body?.remark ?? "").trim();

  if (!studentId || !title || !activityDate || !Number.isInteger(ruleId)) {
    return NextResponse.json(
      { error: "学号、规则、活动名称、日期都是必填项" },
      { status: 400 },
    );
  }

  const rule = db
    .prepare("SELECT rule_id, dimension, points FROM rules WHERE rule_id = ?")
    .get(ruleId) as { rule_id: number; dimension: string; points: number } | undefined;
  if (!rule) {
    return NextResponse.json({ error: "规则不存在" }, { status: 400 });
  }

  db.prepare(
    "INSERT OR IGNORE INTO students (student_id, name, class_name) VALUES (?, '', '')",
  ).run(studentId);

  const result = db
    .prepare(
      `INSERT INTO activities (student_id, rule_id, title, activity_date, dimension, points, evidence_path, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(studentId, rule.rule_id, title, activityDate, rule.dimension, rule.points, evidencePath, remark);

  return NextResponse.json({ ok: true, activity_id: result.lastInsertRowid }, { status: 201 });
}
