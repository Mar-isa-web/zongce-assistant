import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// GET /api/me → 当前登录用户信息；未登录 401（页面用它做跳转判断）
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const stu = db
    .prepare("SELECT student_id, name, role, must_change_password FROM students WHERE student_id = ?")
    .get(user.studentId) as
    | { student_id: string; name: string; role: string; must_change_password: number }
    | undefined;
  return NextResponse.json(stu ?? user);
}
