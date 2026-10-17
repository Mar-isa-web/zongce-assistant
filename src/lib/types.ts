// 与数据库 rules 表对应的类型（蛇形命名保持和 SQL 一致，方便对照）
export type Rule = {
  rule_id: number;
  academic_year: string;
  dimension: string;
  item_no: number;
  category: string;
  level: string;
  grade: string;
  points: number;
  unit: string;
  aliases: string;
  note: string;
};

// 列表页用的活动行（activity 联表 rule 的展示字段）
export type ActivityRow = {
  activity_id: number;
  student_id: string;
  title: string;
  activity_date: string;
  dimension: string;
  quantity: number;
  points: number;
  status: string;
  evidence_path: string;
  remark: string;
  item_no: number | null;
  category: string | null;
  level: string | null;
  grade: string | null;
};
