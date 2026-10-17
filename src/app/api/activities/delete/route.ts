import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// POST /api/activities/delete → 删除自己的一条活动
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const activityId = Number(body?.activityId);
  if (!Number.isInteger(activityId)) {
    return NextResponse.json({ error: "缺少记录 id" }, { status: 400 });
  }

  const result = db
    .prepare("DELETE FROM activities WHERE activity_id = ? AND student_id = ?")
    .run(activityId, user.studentId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
