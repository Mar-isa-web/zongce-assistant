"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Rule } from "@/lib/types";
import { addActivity, listRules } from "@/lib/data";

const DIMENSIONS = ["德育", "智育", "体育", "美育", "劳育"];
// 级别下拉的展示顺序：校级最高频放前面（默认选中），四级全保留
const LEVEL_ORDER = ["校级", "院级", "省级", "国家级"];

// 细则里明确"不予加分"的边界情况：搜索命中时主动提示，防止同学硬塞进错误规则
const NO_BONUS_HINTS: { keys: string[]; text: string }[] = [
  {
    keys: ["奖学金", "国奖"],
    text: "各类奖学金不参与综测加分——奖学金由综测排名评出，再加回综测属于循环加分（细则荣誉类补充说明①）",
  },
  {
    keys: ["先进班集体"],
    text: "综测评定的“先进班集体”不参与加分（细则荣誉类补充说明①）；外部单位评的先进集体可走“德育·集体荣誉”",
  },
  {
    keys: ["入党积极分子"],
    text: "各类荣誉中的先进分子不含入党积极分子（细则备注）",
  },
  {
    keys: ["部门优秀", "社团内部", "协会"],
    text: "学生组织/社团内部评选的荣誉（如“部门优秀个人”）不予加分（细则补充说明⑤）",
  },
];

export default function AddPage() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [searchQ, setSearchQ] = useState("");
  const [combo, setCombo] = useState(""); // "育别|条目号" 合成一个下拉，少点一次
  const [level, setLevel] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [title, setTitle] = useState("");
  const [evidencePath, setEvidencePath] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    listRules()
      .then(setRules)
      .catch(() => setLoadError("规则加载失败，请刷新重试"));
  }, []);

  // 育别+条目 合并下拉：如 "智育 · 1. 竞赛"
  const comboOptions = useMemo(() => {
    if (!rules) return [];
    const seen = new Map<string, string>();
    for (const r of rules) seen.set(`${r.dimension}|${r.item_no}`, `${r.dimension} · ${r.item_no}. ${r.category}`);
    return [...seen.entries()];
  }, [rules]);

  const [dimension, itemNo] = combo ? combo.split("|") : ["", ""];

  const levelOptions = useMemo(() => {
    if (!rules || !itemNo) return [];
    const levels = new Set(
      rules.filter((r) => r.dimension === dimension && r.item_no === Number(itemNo)).map((r) => r.level),
    );
    const list = [...levels];
    list.sort((a, b) => {
      const ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return list;
  }, [rules, dimension, itemNo]);

  const gradeOptions = useMemo(
    () =>
      rules?.filter(
        (r) => r.dimension === dimension && r.item_no === Number(itemNo) && r.level === level,
      ) ?? [],
    [rules, dimension, itemNo, level],
  );

  const selectedRule = rules?.find((r) => String(r.rule_id) === ruleId) ?? null;

  // 搜索：匹配 常见例子/类别/等级/级别/育别，展示最相近的 6 条
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!rules || q === "") return null;
    const hit = (r: Rule) =>
      [r.aliases, r.category, r.grade, r.level, r.dimension, r.item_no + ""]
        .join(",")
        .toLowerCase()
        .includes(q);
    const matched = rules.filter(hit);
    const hints = NO_BONUS_HINTS.filter((h) => h.keys.some((k) => q.includes(k) || k.includes(q)));
    return { matched: matched.slice(0, 6), hints, noMatch: matched.length === 0 };
  }, [rules, searchQ]);

  function pickSearchResult(r: Rule) {
    setCombo(`${r.dimension}|${r.item_no}`);
    setLevel(r.level);
    setRuleId(String(r.rule_id));
    setSearchQ("");
    setMessage("");
  }

  function pickCombo(v: string) {
    setCombo(v);
    setRuleId("");
    if (!rules || !v) return;
    const [d, n] = v.split("|");
    const levels = new Set(
      rules.filter((r) => r.dimension === d && r.item_no === Number(n)).map((r) => r.level),
    );
    // 默认选中"校级"；单项类等没有级别概念的自动选唯一项
    setLevel(levels.has("校级") ? "校级" : [...levels][0] ?? "");
  }

  // 预览分值：按量计分规则 = 单价 × 数量
  const previewPoints = useMemo(() => {
    if (!selectedRule) return null;
    const qty = selectedRule.unit ? Number(quantity) || 0 : 1;
    return Math.round(selectedRule.points * qty * 100) / 100;
  }, [selectedRule, quantity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!selectedRule) {
      setMessage("请先把规则选完整（可搜索，也可逐级下拉）");
      return;
    }
    setSubmitting(true);
    try {
      const created = await addActivity({
        rule: selectedRule,
        quantity: selectedRule.unit ? Number(quantity) || 0 : 1,
        points: previewPoints ?? selectedRule.points,
        title,
        evidencePath,
        remark,
      });
      setMessage(`✅ 已保存（记录 #${created.activity_id}），${created.points} 分`);
      setTitle("");
      setEvidencePath("");
      setRemark("");
      // 联动选择保留不动：连续录同类活动（比如一堆"活动参与者"）时不用重新选
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "保存失败"}`);
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-teal-500 focus:outline-none";
  const label = "mb-1 block text-sm font-medium text-zinc-800";

  if (loadError) return <main className="p-8 text-red-600">{loadError}</main>;
  if (!rules) return <main className="p-8 text-zinc-500">规则加载中…</main>;

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold sm:text-3xl">录入活动</h1>

      {/* 搜索：输奖状上的名字 */}
      <div className="mt-6">
        <span className={label}>搜索规则（输奖状名称关键词）</span>
        <input
          className={input}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="输入关键词"
        />
        {searchResults && (
          <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-2">
            {searchResults.hints.map((h) => (
              <p key={h.text} className="px-2 py-1 text-sm text-red-600">🚫 {h.text}</p>
            ))}
            {searchResults.matched.map((r) => (
              <button
                key={r.rule_id}
                type="button"
                onClick={() => pickSearchResult(r)}
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-teal-50"
              >
                {r.dimension} · {r.item_no}. {r.category} · {r.level || "不分级"} · {r.grade}
                <span className="ml-2 font-medium text-teal-700">{r.points}分{r.unit ? `/${r.unit}` : ""}</span>
              </button>
            ))}
            {searchResults.matched.length === 0 && searchResults.hints.length === 0 && (
              <p className="px-2 py-1 text-sm text-zinc-500">没搜到，试试换个词，或用下方下拉逐级选择</p>
            )}
          </div>
        )}
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className={label}>规则 <span className="text-red-500">*</span></span>
          <select className={input} value={combo} onChange={(e) => pickCombo(e.target.value)} required>
            <option value="">育别 · 条目</option>
            {comboOptions.map(([key, text]) => (
              <option key={key} value={key}>{text}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>级别</span>
            {/* 不加 required：单项类等规则没有级别（值为空）是合法状态，真正的必填门槛是下面的"等级" */}
            <select className={input} value={level} onChange={(e) => { setLevel(e.target.value); setRuleId(""); }} disabled={!combo}>
              {levelOptions.map((l) => (
                <option key={l} value={l}>{l === "" ? "（不分级）" : l}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>等级 / 身份 <span className="text-red-500">*</span></span>
            <select className={input} value={ruleId} onChange={(e) => setRuleId(e.target.value)} required disabled={!combo}>
              <option value="">请选择</option>
              {gradeOptions.map((r) => (
                <option key={r.rule_id} value={r.rule_id}>{r.grade}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedRule && (
          <div className="rounded bg-teal-50 px-4 py-3 text-teal-800">
            分值 <strong className="text-lg">{previewPoints}</strong> 分
            {selectedRule.unit && (
              <span className="ml-1">
                （{selectedRule.points} 分/{selectedRule.unit} ×{" "}
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-16 rounded border border-teal-300 px-1 py-0.5 text-center"
                />
                {" "}{selectedRule.unit}）
              </span>
            )}
            {selectedRule.note && <div className="mt-1 text-sm">📌 {selectedRule.note}</div>}
            {selectedRule.aliases && (
              <div className="mt-1 text-sm text-teal-600">常见例子：{selectedRule.aliases}</div>
            )}
          </div>
        )}

        <div>
          <span className={label}>活动名称 <span className="text-red-500">*</span></span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)}  required />
        </div>

        <div>
          <span className={label}>证明材料路径（可选，可后补）</span>
          <input className={input} value={evidencePath} onChange={(e) => setEvidencePath(e.target.value)}  />
        </div>

        <div>
          <span className={label}>备注（可选）</span>
          <input className={input} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={submitting} className="rounded bg-teal-600 px-6 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {submitting ? "保存中…" : "保存"}
          </button>
          <Link href="/list" className="text-teal-700 hover:underline">查看列表 →</Link>
          {message && <span>{message}</span>}
        </div>
      </form>
    </main>
  );
}
