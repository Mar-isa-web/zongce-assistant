import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Rule } from "@/lib/types";

// GET /api/rules → 规则列表（数据量小，全量下发，前端做联动筛选）
// 支持 ?dimension=德育 可选过滤。Next 16（cacheComponents 模式）没有 force-dynamic 了，
// 读 request 参数即代表每次请求实时执行，不参与构建期预渲染。
export async function GET(request: Request) {
  const dimension = new URL(request.url).searchParams.get("dimension");
  const rows = (
    dimension
      ? db
          .prepare(
            "SELECT rule_id, academic_year, dimension, item_no, category, level, grade, points, unit, aliases, note FROM rules WHERE dimension = ? ORDER BY item_no, level, grade",
          )
          .all(dimension)
      : db
          .prepare(
            "SELECT rule_id, academic_year, dimension, item_no, category, level, grade, points, unit, aliases, note FROM rules ORDER BY dimension, item_no, level, grade",
          )
          .all()
  ) as Rule[];
  return NextResponse.json(rows);
}

// PATCH /api/rules → 编辑单条规则（分值/常见例子/备注），仅班委（管理员）可用
export async function PATCH(request: Request) {
  const user = getSessionUser(request);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "只有班委（管理员）能修改规则" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ruleId = Number(body?.ruleId);
  const points = Number(body?.points);
  const aliases = String(body?.aliases ?? "").trim();
  const note = String(body?.note ?? "").trim();

  if (!Number.isInteger(ruleId)) {
    return NextResponse.json({ error: "缺少规则 id" }, { status: 400 });
  }
  if (!Number.isFinite(points) || points < 0) {
    return NextResponse.json({ error: "分值必须是 ≥0 的数字" }, { status: 400 });
  }

  const result = db
    .prepare("UPDATE rules SET points = ?, aliases = ?, note = ? WHERE rule_id = ?")
    .run(points, aliases, note, ruleId);
  if (result.changes === 0) {
    return NextResponse.json({ error: "规则不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
