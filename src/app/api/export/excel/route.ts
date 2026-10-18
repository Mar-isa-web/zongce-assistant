import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { computeForStudent, computeMajorRank } from "@/lib/scores";

const ACADEMIC_YEAR = "2025-2026";

// GET /api/export/excel → 导出当前用户的综测 Excel（Sheet1 综测汇总 / Sheet2 活动明细）
export async function GET(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const stu = db
    .prepare("SELECT student_id, name, class_name, college, major FROM students WHERE student_id = ?")
    .get(user.studentId) as { student_id: string; name: string; class_name: string; college: string; major: string };
  const score = computeForStudent(user.studentId, ACADEMIC_YEAR);
  const majorRank = computeMajorRank(user.studentId, ACADEMIC_YEAR);
  const activities = db
    .prepare(
      `SELECT a.title, a.activity_date, a.dimension, a.quantity, a.points, a.status,
              r.item_no, r.category, r.level, r.grade
       FROM activities a LEFT JOIN rules r ON a.rule_id = r.rule_id
       WHERE a.student_id = ?
       ORDER BY a.dimension, a.activity_id`,
    )
    .all(user.studentId) as {
    title: string; activity_date: string; dimension: string; quantity: number;
    points: number; status: string; item_no: number | null; category: string | null;
    level: string | null; grade: string | null;
  }[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "综测小助手";

  // Sheet1 综测汇总
  const ws1 = wb.addWorksheet("综测汇总");
  ws1.addRow([`${stu.college}·${stu.major} ${stu.name} 综合测评汇总（${ACADEMIC_YEAR}）`]);
  ws1.addRow([
    `学号 ${stu.student_id} · 班级 ${stu.class_name} · 专业名次 第 ${majorRank.rank} 名（${majorRank.college}·${majorRank.major} 共 ${majorRank.total} 人）`,
  ]);
  ws1.addRow([]);
  const header1 = ws1.addRow(["育别", "基础分", "互评分", "扣分", "加分小计", "原始总分", "折算分"]);
  header1.font = { bold: true };
  for (const d of score.dims) {
    ws1.addRow([
      d.dimension, d.baseScore,
      d.peerScore, d.deduction,
      d.bonus, d.raw, d.converted,
    ]);
  }
  const totalRow = ws1.addRow(["综合测评总分", "", "", "", "", "", score.total]);
  totalRow.font = { bold: true };

  // Sheet2 活动明细
  const ws2 = wb.addWorksheet("活动明细");
  const header2 = ws2.addRow(["序号", "育别", "名称", "匹配的细则", "日期", "数量", "分值", "状态"]);
  header2.font = { bold: true };
  activities.forEach((a, i) => {
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
  ws2.columns.forEach((col) => (col.width = 18));
  ws1.columns.forEach((col) => (col.width = 14));

  const buffer = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`${stu.name}-综测-${ACADEMIC_YEAR}.xlsx`);
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}.xlsx`,
    },
  });
}
