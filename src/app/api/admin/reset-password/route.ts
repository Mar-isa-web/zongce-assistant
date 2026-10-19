import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, hashPassword } from "@/lib/auth";

// POST /api/admin/reset-password → 管理员把某个成员重置为临时密码 zc+学号
// 重置后该生所有设备立即下线，且下次登录必须先改密码
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "只有管理员能重置密码" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const targetId = String(body?.studentId ?? "").trim();
  if (!targetId) return NextResponse.json({ error: "缺少学号" }, { status: 400 });

  if (targetId === user.studentId) {
    return NextResponse.json({ error: "改自己的密码请走右上角「修改密码」" }, { status: 400 });
  }

  const stu = db
    .prepare("SELECT student_id, name, role FROM students WHERE student_id = ?")
    .get(targetId) as { student_id: string; name: string; role: string } | undefined;
  if (!stu) return NextResponse.json({ error: "找不到这个学号" }, { status: 404 });

  // 不允许管理员之间互相重置，避免误伤或越权
  if (stu.role === "admin") {
    return NextResponse.json({ error: "不能重置其他管理员的密码" }, { status: 403 });
  }

  const tempPassword = `zc${targetId}`;
  db.transaction(() => {
    db.prepare("UPDATE students SET password_hash = ?, must_change_password = 1 WHERE student_id = ?").run(
      hashPassword(tempPassword),
      targetId,
    );
    // 旧会话全部失效，防止已登录的设备继续使用
    db.prepare("DELETE FROM sessions WHERE student_id = ?").run(targetId);
  })();

  // 临时密码是规则化的，直接回给前端展示，省去管理员自己拼
  return NextResponse.json({ ok: true, studentId: targetId, name: stu.name, tempPassword });
}
