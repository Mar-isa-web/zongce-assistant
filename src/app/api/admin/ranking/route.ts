import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { computeRanking } from "@/lib/scores";

// GET /api/admin/ranking?className=2515435 → 管理员看全班（或全库）排名
// 不传 className 就是所有学生一起排；传了只看该班
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "只有管理员能看全班排名" }, { status: 403 });
  }

  const ACADEMIC_YEAR = "2025-2026";
  const className = new URL(request.url).searchParams.get("className")?.trim() || "";

  const classes = (
    db.prepare("SELECT DISTINCT class_name FROM students WHERE class_name <> '' ORDER BY class_name").all() as {
      class_name: string;
    }[]
  ).map((r) => r.class_name);

  // 传了不存在的班级就当"全部"，避免前端手改参数拿到空表还以为是 bug
  const useClass = className && classes.includes(className) ? className : "";
  const rows = computeRanking(ACADEMIC_YEAR, useClass || undefined);

  return NextResponse.json({
    academicYear: ACADEMIC_YEAR,
    classes,
    className: useClass,
    count: rows.length,
    rows: rows.map((s) => ({
      rank: s.rank,
      studentId: s.studentId,
      name: s.name,
      className: s.className,
      major: s.major,
      total: s.total,
      dims: s.dims.map((d) => ({ dimension: d.dimension, converted: d.converted })),
    })),
  });
}
