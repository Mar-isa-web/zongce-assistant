import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/register → 注册新同学（学号即用户名），成功后直接登录
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const college = String(body?.college ?? "").trim();
  const className = String(body?.className ?? "").trim();
  const major = String(body?.major ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const password = String(body?.password ?? "");

  if (!/^\d{6,12}$/.test(studentId)) {
    return NextResponse.json({ error: "学号应是 6~12 位数字" }, { status: 400 });
  }
  if (!name || !college || !className) {
    return NextResponse.json({ error: "姓名、学院、班级必填" }, { status: 400 });
  }
  // 手机号选填；填了就得是合法的 11 位号段，且不能和别的账号重复
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "手机号应是 11 位数字，以 1 开头" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const exists = db.prepare("SELECT student_id FROM students WHERE student_id = ?").get(studentId);
  if (exists) {
    return NextResponse.json({ error: "这个学号已经注册过了" }, { status: 400 });
  }

  // 手机号用于找回密码时核验身份，必须唯一，否则分不清是谁
  if (phone) {
    const dup = db.prepare("SELECT student_id FROM students WHERE phone = ?").get(phone);
    if (dup) {
      return NextResponse.json({ error: "这个手机号已被其他账号绑定" }, { status: 400 });
    }
  }

  db.prepare(
    "INSERT INTO students (student_id, name, class_name, college, major, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, 'student')",
  ).run(studentId, name, className, college, major, phone, hashPassword(password));

  // 注册即登录，省一步
  const { token, maxAge } = createSession(studentId);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  return res;
}
