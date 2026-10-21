// 数据入口：根据「是否登录」自动选后端
//   server 模式 → 走原有 /api/*（数据入库，和以前完全一样）
//   local  模式 → 走浏览器 localStorage + 纯前端算分（不注册也能用）
"use client";

import type { ActivityRow, Rule } from "@/lib/types";
import { computeDims, computeTotal, sumBonuses } from "@/lib/score-core";
import * as local from "@/lib/local-store";

export const ACADEMIC_YEAR = "2025-2026";

export type Mode = "local" | "server";

let cachedMode: Mode | null = null;

export async function getMode(force = false): Promise<Mode> {
  if (cachedMode && !force) return cachedMode;
  try {
    const r = await fetch("/api/me");
    cachedMode = r.ok ? "server" : "local";
  } catch {
    cachedMode = "local";
  }
  return cachedMode;
}

export function resetMode() {
  cachedMode = null;
}

export async function listRules(): Promise<Rule[]> {
  const mode = await getMode();
  const res = await fetch(mode === "server" ? "/api/rules" : "/rules.json");
  if (!res.ok) throw new Error("规则加载失败");
  return (await res.json()) as Rule[];
}

export async function listActivities(): Promise<ActivityRow[]> {
  const mode = await getMode();
  if (mode === "local") return local.readActivities();
  const res = await fetch("/api/activities");
  if (!res.ok) throw new Error("活动加载失败");
  return (await res.json()) as ActivityRow[];
}

export async function addActivity(input: {
  rule: Rule;
  title: string;
  quantity: number;
  points: number;
  evidencePath: string;
  remark: string;
}): Promise<{ activity_id: number; points: number }> {
  const mode = await getMode();
  if (mode === "local") {
    const row = local.addActivity(input);
    return { activity_id: row.activity_id, points: row.points };
  }
  const res = await fetch("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ruleId: input.rule.rule_id,
      quantity: input.quantity,
      title: input.title,
      evidencePath: input.evidencePath,
      remark: input.remark,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "保存失败");
  return { activity_id: data.activity_id, points: data.points };
}

export { local };

// 改一条活动（名称/证明材料/备注/状态；分值由规则决定，不在这里改）
export async function updateActivity(
  id: number,
  patch: { title: string; evidencePath: string; remark: string; status: string },
): Promise<void> {
  const mode = await getMode();
  if (mode === "local") {
    local.updateActivity(id, {
      title: patch.title,
      evidence_path: patch.evidencePath,
      remark: patch.remark,
      status: patch.status,
    });
    return;
  }
  const res = await fetch("/api/activities/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId: id, ...patch }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "保存失败");
  }
}

export async function deleteActivity(id: number): Promise<void> {
  const mode = await getMode();
  if (mode === "local") {
    local.deleteActivity(id);
    return;
  }
  const res = await fetch("/api/activities/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId: id }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "删除失败");
  }
}

// 基础分：两种模式都返回同样的行结构（蛇形字段），页面无需分辨
export type BaseRowOut = { dimension: string; base_score: number; peer_score: number; deduction: number };

export async function getBase(): Promise<BaseRowOut[]> {
  const mode = await getMode();
  if (mode === "local") {
    const base = local.readBase();
    return Object.entries(base).map(([dimension, v]) => ({
      dimension,
      base_score: v.baseScore,
      peer_score: v.peerScore,
      deduction: v.deduction,
    }));
  }
  const res = await fetch("/api/base-scores");
  if (!res.ok) throw new Error("基础分加载失败");
  return (await res.json()) as BaseRowOut[];
}

export async function saveBase(
  rows: { dimension: string; baseScore: string; peerScore: string; deduction: string }[],
): Promise<void> {
  const mode = await getMode();
  if (mode === "local") {
    const base: local.LocalBase = {};
    for (const r of rows) {
      base[r.dimension] = {
        baseScore: Number(r.baseScore) || 0,
        peerScore: Number(r.peerScore) || 0,
        deduction: Number(r.deduction) || 0,
      };
    }
    local.writeBase(base);
    return;
  }
  const res = await fetch("/api/base-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error("保存失败");
}

// 总分：两种模式返回同样的结构，本地模式没有专业名次
export type ScoreOut = {
  academicYear: string;
  current: {
    studentId: string;
    name: string;
    className: string;
    dims: ReturnType<typeof computeDims>;
    total: number;
    majorRank: { college: string; major: string; rank: number; total: number } | null;
  };
};

export async function getScore(): Promise<ScoreOut> {
  const mode = await getMode();
  if (mode === "server") {
    const res = await fetch("/api/scores");
    if (!res.ok) throw new Error("算分失败");
    return (await res.json()) as ScoreOut;
  }

  const base = local.readBase();
  const acts = local.readActivities();
  const bases = Object.entries(base).map(([dimension, v]) => ({
    dimension,
    baseScore: v.baseScore,
    peerScore: v.peerScore,
    deduction: v.deduction,
  }));
  const dims = computeDims(bases, sumBonuses(acts));
  return {
    academicYear: ACADEMIC_YEAR,
    current: {
      studentId: "local",
      name: "本地模式",
      className: "未登录",
      dims,
      total: computeTotal(dims),
      majorRank: null,
    },
  };
}
