-- 综测小助手 数据库结构（切片1）
-- 依据：《广东金融学院本科生综合测评及评优评先实施办法（2026年修订）》
--       《计算机学院综合测评评分细则（试行）20260702》
-- 引擎：SQLite

-- 学生表：综测表表头信息
CREATE TABLE students (
  student_id  TEXT PRIMARY KEY,              -- 学号，如 251543528
  name        TEXT NOT NULL,                 -- 姓名
  class_name  TEXT NOT NULL,                 -- 班级，如 2515435
  college     TEXT DEFAULT '',               -- 学院，如 计算机学院
  major       TEXT DEFAULT '',               -- 专业
  phone       TEXT DEFAULT '',               -- 联系电话
  created_at  TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 评分规则表：一行 = 细则矩阵的一个格子
-- 例：智育第1条（竞赛）× 省级 × 二等奖 = 12 分
-- 综测表加分条目后面的括号数字即 item_no，如"蓝桥杯 +12（1）"
CREATE TABLE rules (
  rule_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year TEXT NOT NULL,               -- 适用学年，如 2025-2026（规则年年变，按学年各存一份）
  dimension     TEXT NOT NULL,               -- 育别：德育/智育/体育/美育/劳育
  item_no       INTEGER NOT NULL,            -- 细则条目编号（综测表括号里的数字）
  category      TEXT NOT NULL,               -- 类别，如 学生干部/荣誉/竞赛/文化活动/证书
  level         TEXT NOT NULL DEFAULT '',    -- 级别：国家级/省级/校级/院级，无级别的存空串
  grade         TEXT NOT NULL DEFAULT '',    -- 等级：一等奖/二等奖/参与/班长/干事等，无等级的存空串
  points        REAL NOT NULL,               -- 分值（志愿活动 0.25/小时 这类小数）
  unit          TEXT NOT NULL DEFAULT '',    -- 计量单位：篇/次/小时（按量计分的规则才有，分值=points×数量）
  aliases       TEXT NOT NULL DEFAULT '',    -- 常见例子关键词，逗号分隔，供录入页搜索（如"军训先进个人"）
  note          TEXT DEFAULT '',             -- 备注（累计上限等，如"学年内累计不超过5分"）
  UNIQUE (academic_year, dimension, item_no, category, level, grade)
);

-- 活动表：学生申报的每一条加分项
CREATE TABLE activities (
  activity_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    TEXT NOT NULL REFERENCES students(student_id),
  rule_id       INTEGER REFERENCES rules(rule_id),  -- 匹配的细则格子，录入时选定后分值自动带出
  title         TEXT NOT NULL,               -- 名称，如"第十七届蓝桥杯大赛C/C++大学B组广东赛区二等奖"
  activity_date TEXT NOT NULL,               -- 日期 YYYY-MM-DD，录入时校验在本学年内
  dimension     TEXT NOT NULL,               -- 育别（录入时冗余存一份，规则未匹配时也能查）
  quantity      REAL NOT NULL DEFAULT 1,     -- 数量（按量计分规则用：几小时/几次/几篇），分值=规则分值×数量
  points        REAL NOT NULL,               -- 加分值（规则分值×数量，允许班委认定时修改）
  evidence_path TEXT DEFAULT '',             -- 证明材料照片的文件路径（红章照片）
  remark        TEXT DEFAULT '',             -- 备注
  status        TEXT NOT NULL DEFAULT '待审核',  -- 待审核/通过/不通过
  created_at    TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 基础分表：基础分/互评分/扣分，每生每学年每育一行
-- （这些不是活动，来源分别是学年总结/班级互评/违纪记录，切片2之前只建表不录）
CREATE TABLE base_scores (
  student_id    TEXT NOT NULL REFERENCES students(student_id),
  academic_year TEXT NOT NULL,
  dimension     TEXT NOT NULL,               -- 德育/智育/体育/美育/劳育
  base_score    REAL DEFAULT 0,              -- 基础分（智育=GPA相对分、体育=体测折算等）
  peer_score    REAL DEFAULT 0,              -- 互评分（德育/美育有）
  deduction     REAL DEFAULT 0,              -- 扣分（正数存，算总分时再减）
  PRIMARY KEY (student_id, academic_year, dimension)
);

-- 索引：最常用的查询路径
CREATE INDEX idx_activities_student ON activities(student_id);
CREATE INDEX idx_rules_lookup ON rules(academic_year, dimension, item_no);
