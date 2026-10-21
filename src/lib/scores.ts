import { db } from "@/lib/db";
import {
  DIM_CONFIG,
  computeDims,
  computeTotal,
  round2,
  type DimResult,
  type BaseInput,
  type BonusInput,
} from "@/lib/score-core";

// 算分公式集中在 score-core.ts（前后端共用一份），这里只负责从库里取数
export { DIM_CONFIG, round2 };
export type { DimResult };

export type StudentScore = {
  studentId: string;
  name: string;
  className: string;
  college: string;
  major: string;
  dims: DimResult[];
  total: number;
  rank?: number;
};

// 单个学生的完整算分：基础分来自 base_scores，加分来自 activities（排除"不通过"）
export function computeForStudent(studentId: string, academicYear: string): Omit<StudentScore, "rank"> {
  const stu = db
    .prepare("SELECT student_id, name, class_name, college, major FROM students WHERE student_id = ?")
    .get(studentId) as { student_id: string; name: string; class_name: string; college: string; major: string } | undefined;

  const baseRows = db
    .prepare("SELECT dimension, base_score, peer_score, deduction FROM base_scores WHERE student_id = ? AND academic_year = ?")
    .all(studentId, academicYear) as { dimension: string; base_score: number; peer_score: number; deduction: number }[];

  const bonusRows = db
    .prepare("SELECT dimension, SUM(points) AS s, COUNT(*) AS n FROM activities WHERE student_id = ? AND status != '不通过' GROUP BY dimension")
    .all(studentId) as { dimension: string; s: number; n: number }[];

  const bases: BaseInput[] = baseRows.map((r) => ({
    dimension: r.dimension,
    baseScore: r.base_score,
    peerScore: r.peer_score,
    deduction: r.deduction,
  }));
  const bonuses: BonusInput[] = bonusRows.map((r) => ({ dimension: r.dimension, bonus: r.s, count: r.n }));

  const dims = computeDims(bases, bonuses);
  const total = computeTotal(dims);

  return {
    studentId,
    name: stu?.name ?? "",
    className: stu?.class_name ?? "",
    college: stu?.college ?? "",
    major: stu?.major ?? "",
    dims,
    total,
  };
}

// 排名（按综合总分降序）：可传班级只看本班，不传就是全库所有人
// 同分并列取靠前名次（1、2、2、4），与 computeMajorRank 的口径保持一致
export function computeRanking(academicYear: string, className?: string): StudentScore[] {
  const rows = (
    className
      ? db.prepare("SELECT student_id FROM students WHERE class_name = ? ORDER BY student_id").all(className)
      : db.prepare("SELECT student_id FROM students ORDER BY student_id").all()
  ) as { student_id: string }[];

  const sorted = rows
    .map((s) => computeForStudent(s.student_id, academicYear))
    .sort((a, b) => b.total - a.total);

  let prevTotal: number | null = null;
  let prevRank = 0;
  return sorted.map((s, i) => {
    const rank = prevTotal !== null && Math.abs(s.total - prevTotal) < 0.005 ? prevRank : i + 1;
    prevTotal = s.total;
    prevRank = rank;
    return { ...s, rank };
  });
}

// 专业内排名：按"学院+专业"分组（不同学院会有同名专业，只按专业分会混组）
// 同分并列算靠前名次
export function computeMajorRank(
  studentId: string,
  academicYear: string,
): { college: string; major: string; rank: number; total: number } {
  const me = computeForStudent(studentId, academicYear);
  const college = me.college || "";
  const major = me.major || "";
  const peers = db
    .prepare("SELECT student_id FROM students WHERE college = ? AND major = ?")
    .all(college, major) as { student_id: string }[];
  const totals = peers
    .map((p) => computeForStudent(p.student_id, academicYear).total)
    .sort((a, b) => b - a);
  const rank = totals.findIndex((t) => t <= me.total) + 1;
  return {
    college: college || "（未登记学院）",
    major: major || "（未登记专业）",
    rank,
    total: totals.length,
  };
}
