import { NextResponse } from "next/server";
import { computeForStudent, computeRanking } from "@/lib/scores";

const STUDENT_ID = "251543528"; // TODO 切片5：从登录会话取
const ACADEMIC_YEAR = "2025-2026";

// GET /api/scores → 当前学生的五育明细 + 全体排名
export async function GET(request: Request) {
  new URL(request.url).searchParams.get("ay"); // 读参数保持动态
  const current = { ...computeForStudent(STUDENT_ID, ACADEMIC_YEAR), rank: undefined };
  const ranking = computeRanking(ACADEMIC_YEAR);
  const myRank = ranking.find((r) => r.studentId === STUDENT_ID)?.rank ?? null;
  return NextResponse.json({
    academicYear: ACADEMIC_YEAR,
    current: { ...current, rank: myRank },
    ranking,
  });
}
