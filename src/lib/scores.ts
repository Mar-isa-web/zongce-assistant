import { db } from "@/lib/db";

// 五育折算公式：《实施办法》第五~九条 + 第四条（总成绩=各育×20%/60%/10%/5%/5%）
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
  raw: number; // 该育原始总分
  converted: number; // 折算分（占比后）
};

export type StudentScore = {
  studentId: string;
  name: string;
  className: string;
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
    .prepare("SELECT student_id, name, class_name, major FROM students WHERE student_id = ?")
    .get(studentId) as { student_id: string; name: string; class_name: string; major: string } | undefined;

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

    return {
      dimension: cfg.dimension,
      baseScore: round2(baseScore),
      peerScore: round2(peerScore),
      deduction: round2(deduction),
      bonus: round2(bonus),
      bonusCount: bonusRow?.n ?? 0,
      raw: round2(raw),
      converted: round2(raw * cfg.weight),
    };
  });

  const total = round2(dims.reduce((s, d) => s + d.converted, 0));

  return {
    studentId,
    name: stu?.name ?? "",
    className: stu?.class_name ?? "",
    major: stu?.major ?? "",
    dims,
    total,
  };
}

// 全体学生排名（按综合总分降序；同名次暂不并列，简单序号）——供以后班委视角用
export function computeRanking(academicYear: string): StudentScore[] {
  const students = db
    .prepare("SELECT student_id, major FROM students ORDER BY student_id")
    .all() as { student_id: string; major: string }[];
  const list = students
    .map((s) => computeForStudent(s.student_id, academicYear))
    .sort((a, b) => b.total - a.total)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  return list;
}

// 专业内排名：排名与同专业（major 相同）的学生比较（智育基础分公式即"本年级本专业"口径）
export function computeMajorRank(
  studentId: string,
  academicYear: string,
): { major: string; rank: number; total: number } {
  const me = computeForStudent(studentId, academicYear);
  const majors = db
    .prepare("SELECT DISTINCT major FROM students WHERE major != ''")
    .all() as { major: string }[];
  // 找到该学生所属专业；专业为空时归入"未登记专业"组
  const mine = majors.some((m) => m.major === me.major) ? me.major : "";
  const peers = db
    .prepare("SELECT student_id FROM students WHERE major = ?")
    .all(mine) as { student_id: string }[];
  const totals = peers
    .map((p) => computeForStudent(p.student_id, academicYear).total)
    .sort((a, b) => b - a);
  const rank = totals.findIndex((t) => t <= me.total) + 1; // 同分并列算靠前名次
  return { major: mine || "（未登记专业）", rank, total: totals.length };
}
