import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ActivityRow } from "@/lib/types";

// GET /api/activities → 活动列表（联规则表带出条目展示信息）
export async function GET() {
  const rows = db
    .prepare(
      `SELECT a.activity_id, a.student_id, a.title, a.activity_date, a.dimension,
              a.quantity, a.points, a.status, a.evidence_path, a.remark,
              r.item_no, r.category, r.level, r.grade
       FROM activities a LEFT JOIN rules r ON a.rule_id = r.rule_id
       ORDER BY a.activity_id DESC`,
    )
    .all() as ActivityRow[];
  return NextResponse.json(rows);
}

// POST /api/activities → 录入一条活动
// 学号：单用户模式，写死当前用户（切片5 做登录后改为从登录状态取）
// 日期：服务器自动盖"今天"（本地时区），保证落在本学年，用户不填
// 分值和育别以数据库里的规则为准（不信任前端传值），按量计分规则分值=单价×数量
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const studentId = "251543528"; // TODO 切片5：改为从登录会话取当前用户
  const ruleId = Number(body?.ruleId);
  const title = String(body?.title ?? "").trim();
  const activityDate = localToday();
  const evidencePath = String(body?.evidencePath ?? "").trim();
  const remark = String(body?.remark ?? "").trim();
  const quantity = body?.quantity === undefined ? 1 : Number(body.quantity);

  if (!title || !Number.isInteger(ruleId)) {
    return NextResponse.json(
      { error: "规则和活动名称是必填项" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999) {
    return NextResponse.json({ error: "数量必须是 0~999 之间的数" }, { status: 400 });
  }

  const rule = db
    .prepare("SELECT rule_id, dimension, points, unit FROM rules WHERE rule_id = ?")
    .get(ruleId) as { rule_id: number; dimension: string; points: number; unit: string } | undefined;
  if (!rule) {
    return NextResponse.json({ error: "规则不存在" }, { status: 400 });
  }
  // 带计量单位的规则必须给数量；不带单位的固定为 1
  const finalQuantity = rule.unit ? quantity : 1;
  const points = Math.round(rule.points * finalQuantity * 100) / 100;

  db.prepare(
    "INSERT OR IGNORE INTO students (student_id, name, class_name) VALUES (?, '', '')",
  ).run(studentId);

  const result = db
    .prepare(
      `INSERT INTO activities (student_id, rule_id, title, activity_date, dimension, quantity, points, evidence_path, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(studentId, rule.rule_id, title, activityDate, rule.dimension, finalQuantity, points, evidencePath, remark);

  return NextResponse.json(
    { ok: true, activity_id: result.lastInsertRowid, points },
    { status: 201 },
  );
}
