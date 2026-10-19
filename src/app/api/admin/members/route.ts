import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// 手机号脱敏：13800138000 → 138****8000（管理员核对后 4 位用，不暴露完整号码）
function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

// GET /api/admin/members → 管理员查看成员列表（学生表瘦身版，绝不返回密码散列）
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "只有管理员能查看成员列表" }, { status: 403 });
  }

  const rows = db
    .prepare(
      `SELECT student_id, name, class_name, college, major, phone, role, must_change_password, created_at
       FROM students ORDER BY class_name, student_id`,
    )
    .all() as {
    student_id: string;
    name: string;
    class_name: string;
    college: string;
    major: string;
    phone: string;
    role: string;
    must_change_password: number;
    created_at: string;
  }[];

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      phone: maskPhone(r.phone ?? ""),
      has_phone: Boolean(r.phone),
      must_change_password: Boolean(r.must_change_password),
    })),
  );
}
