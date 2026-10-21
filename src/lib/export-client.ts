// 前端导出：数据全部留在浏览器里，不经过服务器
// Word 用 docxtemplater 填官方模板（模板放 public/zongce-template.docx，53 个占位符）
// Excel 用 exceljs 现做两个 sheet（按需动态加载，避免拖慢首屏）
"use client";

import type { DimResult } from "@/lib/score-core";

export type ExportInfo = {
  name: string;
  studentId: string;
  className: string;
  college: string;
  major: string;
  phone: string;
};

export type ExportAct = {
  title: string;
  dimension: string;
  points: number;
  quantity: number;
  status: string;
  activity_date: string;
  item_no: number | null;
  category: string | null;
  level: string | null;
  grade: string | null;
};

const ACADEMIC_YEAR = "2025-2026";

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const fmt2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// 育别 → 模板标签前缀（与服务端 /api/export/word 保持完全一致）
const DIM_KEYS = [
  { key: "de", name: "德育" },
  { key: "zhi", name: "智育" },
  { key: "ti", name: "体育" },
  { key: "mei", name: "美育" },
  { key: "lao", name: "劳育" },
] as const;

// 各育折算权重（与服务端 DIM_CONFIG 同源，这里只取用到的两个）
const WEIGHTS: Record<string, { wBase: number; wPeer: number; wBonus: number }> = {
  德育: { wBase: 0.3, wPeer: 0.2, wBonus: 0.5 },
  智育: { wBase: 0.8, wPeer: 0, wBonus: 0.2 },
  体育: { wBase: 0.7, wPeer: 0, wBonus: 0.3 },
  美育: { wBase: 0.5, wPeer: 0, wBonus: 0.5 },
  劳育: { wBase: 0.5, wPeer: 0, wBonus: 0.5 },
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildWordData(info: ExportInfo, dims: DimResult[], acts: ExportAct[]) {
  const data: Record<string, unknown> = {
    name: info.name,
    className: info.className,
    studentId: info.studentId,
    college: info.college,
    major: info.major,
    phone: info.phone,
  };

  for (const { key, name } of DIM_KEYS) {
    const w = WEIGHTS[name];
    const d = dims.find((x) => x.dimension === name);
    if (!d) continue;
    const mine = acts.filter((a) => a.dimension === name && a.status !== "不通过");
    data[`${key}Items`] = mine.map((a, i) => ({
      no: i + 1,
      title: a.title,
      points: fmt(a.points),
      itemNo: a.item_no ?? "—",
    }));
    data[`${key}BaseRaw`] = fmt(d.baseScore);
    data[`${key}BaseConv`] = fmt2(d.baseScore * w.wBase);
    if (key === "de") {
      data.dePeerRaw = fmt(d.peerScore);
      data.dePeerConv = fmt2(d.peerScore * w.wPeer);
    }
    if (key === "mei") data.meiPeerRaw = fmt(d.peerScore);
    data[`${key}SelfRaw`] = fmt(d.bonus);
    data[`${key}SelfConv`] = fmt2(d.bonus * w.wBonus);
    if (name !== "智育") data[`${key}Deduct`] = fmt(d.deduction);
    data[`${key}TotalRaw`] = fmt2(d.raw);
    data[`${key}TotalConv`] = fmt2(d.converted);
  }
  return data;
}

export async function exportWord(info: ExportInfo, dims: DimResult[], acts: ExportAct[]) {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import("pizzip"),
    import("docxtemplater"),
  ]);
  const res = await fetch("/zongce-template.docx");
  if (!res.ok) throw new Error("模板加载失败，请刷新重试");
  const zip = new PizZip(await res.arrayBuffer());
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(buildWordData(info, dims, acts));
  const blob: Blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
  saveBlob(blob, `${info.name || "我"}-综合测评表-${ACADEMIC_YEAR}.docx`);
}

export async function exportExcel(info: ExportInfo, dims: DimResult[], acts: ExportAct[], total: number) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "综测小助手";

  const ws1 = wb.addWorksheet("综测汇总");
  ws1.addRow([`${info.college}·${info.major} ${info.name} 综合测评汇总（${ACADEMIC_YEAR}）`]);
  ws1.addRow([`学号 ${info.studentId} · 班级 ${info.className}`]);
  ws1.addRow([]);
  const header1 = ws1.addRow(["育别", "基础分", "互评分", "扣分", "加分小计", "原始总分", "折算分"]);
  header1.font = { bold: true };
  for (const d of dims) {
    ws1.addRow([d.dimension, d.baseScore, d.peerScore, d.deduction, d.bonus, d.raw, d.converted]);
  }
  const totalRow = ws1.addRow(["综合测评总分", "", "", "", "", "", total]);
  totalRow.font = { bold: true };

  const ws2 = wb.addWorksheet("活动明细");
  const header2 = ws2.addRow(["序号", "育别", "名称", "匹配的细则", "日期", "数量", "分值", "状态"]);
  header2.font = { bold: true };
  acts.forEach((a, i) => {
    ws2.addRow([
      i + 1,
      a.dimension,
      a.title,
      a.item_no !== null ? `${a.item_no}. ${a.category} · ${a.level || "不分级"} · ${a.grade}` : "—",
      a.activity_date,
      a.quantity,
      a.points,
      a.status,
    ]);
  });
  ws2.columns.forEach((c) => (c.width = 18));
  ws1.columns.forEach((c) => (c.width = 14));

  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${info.name || "我"}-综测-${ACADEMIC_YEAR}.xlsx`,
  );
}
