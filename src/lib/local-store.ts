// 本地模式（未登录）的数据存储：全部放在浏览器 localStorage，不上传服务器
// 结构与服务器表保持同名，方便将来一键导入账号
import type { ActivityRow, Rule } from "@/lib/types";

const K = {
  acts: "zc.local.activities",
  base: "zc.local.base",
  seq: "zc.local.seq",
};

export type LocalBaseRow = { dimension: string; base_score: number; peer_score: number; deduction: number };
export type LocalBase = Record<string, { baseScore: number; peerScore: number; deduction: number }>;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readActivities(): ActivityRow[] {
  if (!isBrowser()) return [];
  return safeParse<ActivityRow[]>(localStorage.getItem(K.acts), []);
}

function writeActivities(rows: ActivityRow[]) {
  localStorage.setItem(K.acts, JSON.stringify(rows));
}

function nextId(): number {
  const cur = Number(localStorage.getItem(K.seq) ?? "0") + 1;
  localStorage.setItem(K.seq, String(cur));
  return cur;
}

// 新增一条：从规则里补齐展示字段，和服务器返回的行结构一致
export function addActivity(input: {
  rule: Rule;
  title: string;
  quantity: number;
  points: number;
  evidencePath: string;
  remark: string;
}): ActivityRow {
  const id = nextId();
  const row: ActivityRow = {
    activity_id: id,
    student_id: "local",
    title: input.title,
    activity_date: new Date().toISOString().slice(0, 10),
    dimension: input.rule.dimension,
    quantity: input.quantity,
    points: input.points,
    status: "待审核",
    evidence_path: input.evidencePath,
    remark: input.remark,
    item_no: input.rule.item_no,
    category: input.rule.category,
    level: input.rule.level,
    grade: input.rule.grade,
  };
  writeActivities([...readActivities(), row]);
  return row;
}

export function updateActivity(id: number, patch: Partial<ActivityRow>) {
  writeActivities(readActivities().map((r) => (r.activity_id === id ? { ...r, ...patch } : r)));
}

export function deleteActivity(id: number) {
  writeActivities(readActivities().filter((r) => r.activity_id !== id));
}

export function readBase(): LocalBase {
  if (!isBrowser()) return {};
  return safeParse<LocalBase>(localStorage.getItem(K.base), {});
}

export function writeBase(base: LocalBase) {
  localStorage.setItem(K.base, JSON.stringify(base));
}

export function clearAll() {
  localStorage.removeItem(K.acts);
  localStorage.removeItem(K.base);
  localStorage.removeItem(K.seq);
}
