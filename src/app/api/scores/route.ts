import { NextResponse } from "next/server";
import { computeForStudent, computeMajorRank } from "@/lib/scores";

const STUDENT_ID = "251543528"; // TODO 切片5：从登录会话取
const ACADEMIC_YEAR = "2025-2026";

// GET /api/scores → 当前学生的五育明细 + 专业内名次（全体排名属班委视角，v2 配合登录开放）
export async function GET(request: Request) {
  new URL(request.url).searchParams.get("ay"); // 读参数保持动态
  const current = computeForStudent(STUDENT_ID, ACADEMIC_YEAR);
  const majorRank = computeMajorRank(STUDENT_ID, ACADEMIC_YEAR);
  return NextResponse.json({
    academicYear: ACADEMIC_YEAR,
    current: { ...current, majorRank },
  });
}
