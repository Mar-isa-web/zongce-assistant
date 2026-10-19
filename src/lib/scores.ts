import { db } from "@/lib/db";

// 五育折算公式：《实施办法》第五~九条 + 第四条（总成绩=各育×20%/60%/10%/5%/5%）
// 各育原始总分均为百分制（满分100，超出按100计），折算分 = 封顶后的原始分 × 占比
export const DIM_CONFIG = [
  { dimension: "德育", weight: 0.2, wBase: 0.3, wPeer: 0.2, wBonus: 0.5, hasDeduction: true },
  { dimension: "智育", weight: 0.6, wBase: 0.8, wPeer: 0, wBonus: 0.2, hasDeduction: false },
  { dimension: "体育", weight: 0.1, wBase: 0.7, wPeer: 0, wBonus: 0.3, hasDeduction: true },
  { dimension: "美育", weight: 0.05, wBase: 0.5, wPeer: 0, wBonus: 0.5, hasDeduction: true },
  { dimension: "劳育", weight: 0.05, wBase: 0.5, wPeer: 0, wBonus: 0.5, hasDeduction: true },
] as const;

export type DimResult = {
  dimension: string;
  baseScore: number;
  peerScore: number;
  deduction: number;
  bonus: number;
  bonusCount: number;
  raw: number; // 该育原始总分（百分制，超出按100计）
  converted: number; // 折算分 = raw × 占比
  capped: boolean; // 原始分是否触顶（>100 按 100 计）
};

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

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

  const dims: DimResult[] = DIM_CONFIG.map((cfg) => {
    const b = baseRows.find((r) => r.dimension === cfg.dimension);
    const baseScore = b?.base_score ?? 0;
    const peerScore = b?.peer_score ?? 0;
    const deduction = b?.deduction ?? 0;
    const bonusRow = bonusRows.find((r) => r.dimension === cfg.dimension);
    const bonus = bonusRow?.s ?? 0;

    let raw = baseScore * cfg.wBase + peerScore * cfg.wPeer + bonus * cfg.wBonus;
    if (cfg.hasDeduction) raw -= deduction;
    raw = Math.max(0, raw); // 办法规定：扣分大于前三项得分总和则为零分
    const capped = raw > 100;
    raw = Math.min(raw, 100); // 原始总分按百分制，超出按 100 计

    return {
      dimension: cfg.dimension,
      baseScore: round2(baseScore),
      peerScore: round2(peerScore),
      deduction: round2(deduction),
      bonus: round2(bonus),
      bonusCount: bonusRow?.n ?? 0,
      raw: round2(raw),
      converted: round2(raw * cfg.weight),
      capped,
    };
  });

  const total = round2(dims.reduce((s, d) => s + d.converted, 0));

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
