import { NextResponse } from "next/server";
import { computeForStudent, computeMajorRank } from "@/lib/scores";
import { getSessionUser } from "@/lib/auth";

// GET /api/scores → 当前登录用户的五育明细 + 专业内名次
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const ACADEMIC_YEAR = "2025-2026";
  const current = computeForStudent(user.studentId, ACADEMIC_YEAR);
  const majorRank = computeMajorRank(user.studentId, ACADEMIC_YEAR);
  return NextResponse.json({
    academicYear: ACADEMIC_YEAR,
    current: { ...current, majorRank },
  });
}
