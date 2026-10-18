import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { computeForStudent, DIM_CONFIG } from "@/lib/scores";

const ACADEMIC_YEAR = "2025-2026";

// 数字口径与手填表一致：原始分类分数不带多余小数（113、0.25），折算分类固定两位（56.50）
const fmt = (n: number) => String(Math.round(n * 100) / 100);
const fmt2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// 育别 → 模板标签前缀（模板内 {deItems} {deBaseRaw}…，循环体共用 no/title/points/itemNo）
const DIM_KEYS = [
  { key: "de", name: "德育" },
  { key: "zhi", name: "智育" },
  { key: "ti", name: "体育" },
  { key: "mei", name: "美育" },
  { key: "lao", name: "劳育" },
] as const;

// GET /api/export/word → 用官方综测表模板生成可提交的 Word（docxtemplater 填充）
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const stu = db
    .prepare("SELECT student_id, name, class_name, college, major, phone FROM students WHERE student_id = ?")
    .get(user.studentId) as {
    student_id: string; name: string; class_name: string; college: string; major: string; phone: string;
  };
  const score = computeForStudent(user.studentId, ACADEMIC_YEAR);
  const acts = db
    .prepare(
      `SELECT a.dimension, a.title, a.points, r.item_no
       FROM activities a LEFT JOIN rules r ON a.rule_id = r.rule_id
       WHERE a.student_id = ? AND a.status != '不通过'
       ORDER BY a.activity_id`,
    )
    .all(user.studentId) as { dimension: string; title: string; points: number; item_no: number | null }[];

  const data: Record<string, unknown> = {
    name: stu.name,
    className: stu.class_name,
    studentId: stu.student_id,
    college: stu.college,
    major: stu.major,
    phone: stu.phone ?? "",
  };

  for (const { key, name } of DIM_KEYS) {
    const cfg = DIM_CONFIG.find((c) => c.dimension === name)!;
    const d = score.dims.find((x) => x.dimension === name)!;
    data[`${key}Items`] = acts
      .filter((x) => x.dimension === name)
      .map((a, i) => ({
        no: i + 1,
        title: a.title,
        points: fmt(a.points),
        itemNo: a.item_no ?? "—",
      }));
    data[`${key}BaseRaw`] = fmt(d.baseScore);
    data[`${key}BaseConv`] = fmt2(d.baseScore * cfg.wBase);
    if (key === "de") {
      // 德育互评分行：只有德育在折算公式里用互评分
      data.dePeerRaw = fmt(d.peerScore);
      data.dePeerConv = fmt2(d.peerScore * cfg.wPeer);
    }
    if (key === "mei") {
      // 美育互评分不参与折算（权重0），仅展示；表格两个子项系统未分项，只填合计
      data.meiPeerRaw = fmt(d.peerScore);
    }
    data[`${key}SelfRaw`] = fmt(d.bonus);
    data[`${key}SelfConv`] = fmt2(d.bonus * cfg.wBonus);
    if (cfg.hasDeduction) data[`${key}Deduct`] = fmt(d.deduction);
    data[`${key}TotalRaw`] = fmt2(d.raw);
    data[`${key}TotalConv`] = fmt2(d.converted);
  }

  try {
    const zip = new PizZip(readFileSync(path.join(process.cwd(), "templates", "综测表_template.docx"), "binary"));
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const filename = encodeURIComponent(`${stu.name}-综合测评表-${ACADEMIC_YEAR}.docx`);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `综测表生成失败：${msg}` }, { status: 500 });
  }
}
