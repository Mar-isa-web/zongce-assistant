import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, getSessionToken, verifyPassword, hashPassword } from "@/lib/auth";

// POST /api/auth/change-password → 登录用户自助改密码
// 只改会话里的本人，前端不传学号，杜绝越权改别人密码
export async function POST(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const oldPassword = String(body?.oldPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "旧密码和新密码都要填" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }
  if (newPassword === oldPassword) {
    return NextResponse.json({ error: "新密码不能和旧密码一样" }, { status: 400 });
  }

  const stu = db
    .prepare("SELECT password_hash FROM students WHERE student_id = ?")
    .get(user.studentId) as { password_hash: string } | undefined;

  // 旧密码不对按 400 返回：这是已登录用户的操作，不存在"探测账号是否存在"的风险
  if (!stu || !stu.password_hash || !verifyPassword(oldPassword, stu.password_hash)) {
    return NextResponse.json({ error: "旧密码不对" }, { status: 400 });
  }

  // 重新生成随机盐再散列，不复用旧盐
  db.prepare("UPDATE students SET password_hash = ? WHERE student_id = ?").run(
    hashPassword(newPassword),
    user.studentId,
  );

  // 改密后踢掉本人在别的设备上的会话，只留当前这一个，避免用户改完密码立刻被踢
  const currentToken = getSessionToken(request) ?? "";
  db.prepare("DELETE FROM sessions WHERE student_id = ? AND token <> ?").run(user.studentId, currentToken);

  return NextResponse.json({ ok: true });
}
