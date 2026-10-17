import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
