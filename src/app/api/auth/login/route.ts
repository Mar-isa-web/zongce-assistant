import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/login → 学号+密码 登录，成功则种下会话 Cookie
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const password = String(body?.password ?? "");

  if (!studentId || !password) {
    return NextResponse.json({ error: "学号和密码都要填" }, { status: 400 });
  }

  const stu = db
    .prepare("SELECT student_id, password_hash FROM students WHERE student_id = ?")
    .get(studentId) as { student_id: string; password_hash: string } | undefined;

  // 未注册或没设密码都统一报"学号或密码不对"——不泄露账号是否存在
  if (!stu || !stu.password_hash || !verifyPassword(password, stu.password_hash)) {
    return NextResponse.json({ error: "学号或密码不对" }, { status: 401 });
  }

  const { token, maxAge } = createSession(studentId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, // JS 读不到，防 XSS 偷令牌
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
