# 部署指南（切片 7）——阿里云 ECS

> 切片 7a 已于 2026-10-18 本地演练通过：`npm run build` 构建 OK，生产模式实测登录 / 算分 / Word 综测表导出 / Excel 导出全部正常。
> 本文档 = 买机器后照着敲就能上线的最小步骤。预算：99 元/年（2核2G 经济型e + 40G ESSD + 3M 带宽，特价不可用券，续费仅 1 次同价）。

## 0. 演练确认过的两个关键点

- `db/zongce.db`（SQLite）和 `templates/` 都是**相对项目根目录**读的 → 生产环境必须从项目根目录启动（下面 systemd 已设 `WorkingDirectory`）；
- `npm ci` 会自动装 better-sqlite3 的 Linux 预编译二进制，服务器上无需编译环境。

## 1. 购买与初始化 ECS

1. 阿里云"快速购买-基础版"：2核2G、Ubuntu 24.04 64位、40G ESSD，买 1 年（99 元）；
2. 安全组放行端口：**22**（SSH）、**3000**（应用）；
3. 本机连接：`ssh root@服务器IP`。

## 2. 服务器环境（一次性）

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# 2G 内存防构建 OOM：加 2G swap
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 3. 拉代码 + 构建

```bash
cd /opt
git clone https://github.com/Mar-isa-web/zongce-assistant.git
cd zongce-assistant
npm ci
npm run build
```

## 4. 数据库初始化（⚠️ 需要人工决策）

- **方案 A（推荐，给全班用）**：全新空库，同学自己注册
  ```bash
  npm run db:init
  ```
- **方案 B（带本地真实数据）**：`scp db/zongce.db root@服务器IP:/opt/zongce-assistant/db/`
  ⚠️ 含个人真实测评数据，放公网服务器前自行权衡隐私。

注：`db/` 在 .gitignore 里不会随 git 上去；`templates/综测表_template.docx` 在仓库里，git clone 自带。

## 5. 常驻启动（systemd）

`/etc/systemd/system/zongce.service`：

```ini
[Unit]
Description=zongce-assistant
After=network.target

[Service]
WorkingDirectory=/opt/zongce-assistant
ExecStart=/usr/bin/npm start
Environment=PORT=3000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now zongce
```

## 6. 验证与首次使用

- 浏览器访问 `http://服务器IP:3000`（IP:端口方式**无需 ICP 备案**；以后绑域名才需要）；
- 管理员：先注册自己，再把数据库里自己那行的 `role` 改成 `admin`（`/rules` 编辑权限用）。

## 7. 更新版本

```bash
cd /opt/zongce-assistant && git pull && npm ci && npm run build && systemctl restart zongce
```

## 8. 试用阶段须知

- **备份**：`cp db/zongce.db db/backup-$(date +%F).db`（上改动前先备份）；
- **注册开放**：3000 公网开放 = 任何人可注册，试用阶段接受，v2 再加邀请码；
- **无 HTTPS**：密码散列存库（scrypt）但传输是明文 HTTP，试用前知情；以后绑了域名可用 Caddy 一键上 HTTPS。
