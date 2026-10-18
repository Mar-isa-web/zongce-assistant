# 项目交接说明（PROJECT-HANDOFF）

> 给任何接手本项目的工具或人：先读完这份文档再动代码。
> 最后更新：2026-10-18（切片 0-7 完成，已部署上线）

## 一、这是什么

**综测小助手**：面向高校综合测评场景的全栈 Web 应用。学生录入活动 → 按学院评分细则（224 条，真实 PDF 入库）自动算分 → 一键生成官方综测表 Word。已部署于阿里云 ECS：`http://47.112.8.28:3000`。

## 二、技术栈与运行

- **Next.js 16（App Router）+ TypeScript + Tailwind**，`src/` 目录结构
- **数据库**：SQLite（better-sqlite3 **必须锁 v12.4.1，见下方大坑**），库文件 `db/zongce.db`（gitignore，不入仓库）
- **本地开发**：`npm install && npm run dev`（需先 `npm run db:init` 建库）
- **Word 导出**：docxtemplater + `templates/综测表_template.docx`（官方表格掏空的模板，53 个占位符）

## 三、⚠️ 已知大坑（踩过一次，别再踩）

1. **better-sqlite3 不能升 v13**：v13.0.3 在"阿里云经济型e + Ubuntu 22.04 + 内核 5.15 + Xeon"组合下，require 后首次 SQLite 操作 100% SIGSEGV（预编译和源码编译都崩；Windows 正常；二进制 md5 与官方一致非下载损坏）。**v12.4.1 全部正常**。升级前必须在这类服务器上冒烟验证；
2. **swap 必须用 dd 创建**：`fallocate` 方式（含云助手 SWAP 插件）在此类网络盘上不可靠；
3. **服务器访问 GitHub 直连不通**：克隆/拉取用 `https://gh-proxy.com/https://github.com/...` 前缀；
4. **中文经 GitBash 传 curl 会 GBK 乱码**：测 API 用 node fetch 或 `--data-binary @file`；
5. **测试前先查当前记录 id**：导入/重建后 id 会重排。

## 四、部署速查（深圳实例 47.112.8.28）

详见 `DEPLOY.md`（完整步骤）。核心命令：

```bash
# 服务器上更新版本
cd /opt/zongce-assistant && git pull https://gh-proxy.com/https://github.com/Mar-isa-web/zongce-assistant.git main \
  && npm ci --registry=https://registry.npmmirror.com && npm run build && systemctl restart zongce
# 备份数据库
cp db/zongce.db db/backup-$(date +%F).db
```

- systemd 服务名 `zongce`，`WorkingDirectory` 必须是项目根（db 和 templates 是 cwd 相对路径）
- 管理员账号 251543528（admin），线上库为全新空库+224 规则+演示账号 251500000/张三

## 五、v2 待办（按优先级）

1. **修改密码页**（登录后，旧密码→新密码；改密码 API + 页面）
2. **忘记密码入口**（登录页提示"联系管理员重置"）
3. **管理员重置成员密码**（admin 一键重置为临时密码）
4. **移动端适配**（用户实测手机排版不佳，总分页 7 列表格需响应式处理）
5. 班委视图（`computeRanking` 已在 lib 备好）
6. 三级审核流、批量导入历史活动、数量型封顶规则（同类取最高等）

## 六、验收文化（接手者请遵守）

- 小切片开发，一个切片一个提交，提交信息用中文描述功能；
- **双通道验收**：数值核对（API 输出 vs 手算）+ 界面肉眼/截图验收；
- 涉及算分的改动必须与手算逐分核对后才能合入；
- 深色模式、手机宽度（320px）也要能看。
