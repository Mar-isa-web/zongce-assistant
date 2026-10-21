// 纯算分核心：不碰数据库，前后端共用（服务器模式由 scores.ts 调用，本地模式由页面直接调用）
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

// 一个育的基础分输入（缺省即 0）
export type BaseInput = { dimension: string; baseScore: number; peerScore: number; deduction: number };
// 一个育的加分汇总（缺省即 0 条）
export type BonusInput = { dimension: string; bonus: number; count: number };

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// 传入基础分与加分汇总，返回五育明细
export function computeDims(bases: BaseInput[], bonuses: BonusInput[]): DimResult[] {
  return DIM_CONFIG.map((cfg) => {
    const b = bases.find((r) => r.dimension === cfg.dimension);
    const baseScore = b?.baseScore ?? 0;
    const peerScore = b?.peerScore ?? 0;
    const deduction = b?.deduction ?? 0;
    const bonusRow = bonuses.find((r) => r.dimension === cfg.dimension);
    const bonus = bonusRow?.bonus ?? 0;

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
      bonusCount: bonusRow?.count ?? 0,
      raw: round2(raw),
      converted: round2(raw * cfg.weight),
      capped,
    };
  });
}

export function computeTotal(dims: DimResult[]) {
  return round2(dims.reduce((s, d) => s + d.converted, 0));
}

// 从活动列表汇总每个育的加分（状态"不通过"不计，与列表页小计口径一致）
export function sumBonuses(acts: { dimension: string; points: number; status: string }[]): BonusInput[] {
  const map = new Map<string, BonusInput>();
  for (const a of acts) {
    if (a.status === "不通过") continue;
    const cur = map.get(a.dimension) ?? { dimension: a.dimension, bonus: 0, count: 0 };
    cur.bonus += a.points;
    cur.count += 1;
    map.set(a.dimension, cur);
  }
  return [...map.values()];
}
