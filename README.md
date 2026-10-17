# 综测小助手

帮同学自动核算综合测评（综测）分数的 Web 应用：录入活动和证书 → 按学院评分细则自动算分 → 一键生成综测表。

我的第一个从 0 到上线的全栈项目，用于练习 AI 协作开发（vibe coding）的完整流程：需求卡片 → 小步切片 → 逐项验收。

## 技术栈

- **框架**：Next.js（App Router）+ TypeScript
- **样式**：Tailwind CSS
- **数据库**：SQLite（规划中）
- **部署**：Netlify ✅ 线上地址：https://vermillion-clafoutis-7cbc93.netlify.app/

## 开发路线图（MVP 切片）

- [x] 切片 0：脚手架初始化，构建通过，[部署上线](https://vermillion-clafoutis-7cbc93.netlify.app/)（2026-10-16）
- [x] 切片 1：数据库设计（学生表 / 活动表 / 评分规则表）——224 条真实细则已入库
- [x] 切片 2：录入活动，列表页展示（四级联动自动带分）
- [ ] 切片 3：评分规则配置页（类别、分值可维护）
- [ ] 切片 4：算分逻辑 + 分数展示
- [ ] 切片 5：登录（账号密码）
- [ ] 切片 6：导出综测表（Word / Excel）
- [ ] 切片 7：3 位真实用户试用，收集反馈进 v2

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000 查看效果。
