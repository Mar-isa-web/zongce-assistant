import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const STATUSES = ["待审核", "通过", "不通过"];

// POST /api/activities/update → 修改自己的一条活动（名称/证明材料/备注/状态）
// 分值和规则不在可改范围：分值由规则决定，录错了规则就删掉重录
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const activityId = Number(body?.activityId);
  const title = String(body?.title ?? "").trim();
  const status = String(body?.status ?? "待审核");
  const evidencePath = String(body?.evidencePath ?? "").trim();
  const remark = String(body?.remark ?? "").trim();

  if (!Number.isInteger(activityId) || !title || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "参数不完整或状态不合法" }, { status: 400 });
  }

  const result = db
    .prepare("UPDATE activities SET title = ?, evidence_path = ?, remark = ?, status = ? WHERE activity_id = ? AND student_id = ?")
    .run(title, evidencePath, remark, status, activityId, user.studentId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
