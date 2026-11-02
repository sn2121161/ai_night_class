# 分子商场项目 Docker 全栈正常模式部署提示词

这份提示词以当前 Molecule Shop 的真实部署方式为准：

```text
浏览器 → frontend 容器（3000） → api 容器（5600） → PostgreSQL 容器（db）
```

数据库也在 Docker 容器中运行，数据放在 Docker volume 中，不依赖电脑本机 PostgreSQL。不要把本机已安装的 PostgreSQL、SQLite、内存数据库和 Docker 数据库混着用。

当前正常模式的关键配置：

```dotenv
AUTO_CREATE_SCHEMA=false
SEED_DEMO_DATA=false
```

- `AUTO_CREATE_SCHEMA=false`：启动 API 时不偷偷创建/修改表，表结构只通过 migration 更新。
- `SEED_DEMO_DATA=false`：启动 API 时不自动补演示管理员、演示商品、演示留言。

> 已经存在的演示数据不会因为改成 `false` 自动删除。清理前必须先备份并让人确认删除范围。

---

## 先改好 `backend/.env`：正常模式的唯一配置来源

项目根目录创建或修改的是真实运行配置文件 `backend/.env`。它不能提交到 Git，也不能把密码、邮箱授权码或飞书密钥发到群里。`backend/.env.example` 只保留变量名和示例值，供其他人复制。

如果项目里还没有 `.env`，可先复制模板：

```bash
# macOS
cp backend/.env.example backend/.env

# Windows PowerShell
Copy-Item backend\.env.example backend\.env
```

然后在 `backend/.env` 中补齐或改成下面的内容。尖括号里的文字必须换成学员自己的值，不能原样保留：
1. postgresql的数据库密码统一为1234
2. 先不考虑邮箱和飞书的功能，把这些隐藏掉，忘记密码那里暂时不做

```dotenv
# Docker 中首次创建 PostgreSQL 时使用的账号信息
POSTGRES_USER=shop_prod
POSTGRES_PASSWORD=1234
POSTGRES_DB=shop_prod

# API 在 Docker 网络里连接数据库：主机名必须是 db，不是 localhost
# 此处密码必须与 POSTGRES_PASSWORD 完全相同
DATABASE_URL=postgresql+psycopg2://shop_prod:1234@db:5432/shop_prod

# API 安全配置：每个项目都要换成自己的随机值
JWT_SECRET=<自己生成的随机字符串>
PAYMENT_ENCRYPTION_KEY=<自己生成的 Fernet 密钥>

# 正常模式：不自动建表，也不灌入演示数据
AUTO_CREATE_SCHEMA=false
SEED_DEMO_DATA=false

# 本地前端地址
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# 邮箱找回密码功能：暂未开通邮箱时可保持为空；开通后再填写 QQ/企业邮箱 SMTP 参数
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USERNAME=
# SMTP_PASSWORD=
# SMTP_FROM=
# SMTP_STARTTLS=true

# 飞书通知功能：暂未接入可保持为空
# FEISHU_APP_ID=
# FEISHU_APP_SECRET=
# FEISHU_WEBHOOK_URL=
```

填写时记住这几条：

- 容器中的 API 访问数据库必须写 `@db:5432`；`@localhost:5432` 指向的是 API 容器自己，通常会连不上数据库。
- 为减少课堂配置出错，数据库密码强制改成1234，`DATABASE_URL` 中的密码必须做 URL 编码。
- `JWT_SECRET` 可用 `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` 生成；Windows 若命令为 `python`，把 `python3` 改成 `python`。
- `PAYMENT_ENCRYPTION_KEY` 可用 `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` 生成；Windows 同样可把 `python3` 改成 `python`。
- 修改 `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB` 只会在 Docker volume 第一次初始化数据库时生效。已有 `shop_postgres` volume 时，不能靠改 `.env` 改掉数据库内已有账号或密码；先备份，再让 Agent 给出不删数据的迁移方案。
- `SEED_DEMO_DATA=false` 后不应依赖 `ADMIN_BOOTSTRAP_PASSWORD` 自动产生管理员；首个管理员必须通过单独的 `bootstrap-admin` 命令创建。
- SMTP 和飞书变量留空不应让 API 退回演示模式；暂时不做“忘记密码邮件”和“飞书通知”功能。

改完 `.env` 后，运行 `docker compose up -d --build`，再运行 migration；不要用“端口 5600 能访问”作为唯一判断标准，还要检查 `/health/details` 中的数据库主机和两个正常模式开关。

---

## 一、先复制的总提示词

把下面整段交给自己的代码助手。先不要运行 Docker 命令，先让代码助手检查项目并完成配置。

```text
我要把我本地已经完成的前端和后端项目改成 Docker 全栈“正常模式”部署。请先检查当前项目，不要新建项目，不要删除已有业务功能。

我的目标是同时启动三个 Docker 服务：
1. db：PostgreSQL 16 数据库；
2. api：FastAPI 后端；
3. frontend：前端页面。

浏览器访问 http://localhost:3000；后端健康检查为 http://127.0.0.1:5600/health。

请严格遵守：

1. 数据库必须是 Docker 中的 PostgreSQL 16，不使用电脑本机 PostgreSQL、SQLite、内存数据库或假接口。
2. Docker 网络中，后端连接数据库的主机名必须是 db，端口 5432。不要写 localhost。
3. 数据库数据必须挂到 Docker named volume，例如 shop_postgres:/var/lib/postgresql/data；上传图片也必须使用独立 volume，例如 shop_uploads。
4. API 端口只能绑定 127.0.0.1:5600；前端端口为 3000；不要把 PostgreSQL 5432 暴露到电脑端口或公网。
5. backend/.env 不存在时，必须停止并告诉我如何从 .env.example 创建它；不要静默改用默认数据库、演示数据库或内存数据库。
6. 必须按本文“先改好 backend/.env”中的模板检查并填写环境变量。DATABASE_URL 的数据库主机必须为 db；POSTGRES_PASSWORD 与 DATABASE_URL 中的密码必须是同一个值；不要在报告或日志中打印任何密码或密钥。
7. 正常模式必须设置：
   AUTO_CREATE_SCHEMA=false
   SEED_DEMO_DATA=false
   不允许启动时自动创建商品、留言、用户或管理员。
8. 数据库表只能通过 Alembic migration 创建或升级。第一次启动和每次有新 migration 时，必须明确运行：
   docker compose run --rm api alembic upgrade head
9. 需要一个明确的“一次性创建首个管理员”方式，例如单独的 bootstrap-admin 命令。它只能创建我指定的管理员，不能顺便写入演示商品或演示留言。
10. 增加 GET /health/details，只返回：服务环境、数据库类型、数据库主机名、当前 migration 版本、AUTO_CREATE_SCHEMA 和 SEED_DEMO_DATA 的值。绝不返回密码、完整连接串、token 或密钥。
11. 先为现有数据提供备份命令，再给启动命令。禁止使用 docker compose down -v、删除 volume、清空数据库或重建数据库，除非我明确同意。

请给我：
- docker-compose.yml、backend/Dockerfile、frontend/Dockerfile 是否需要修改；
- backend/.env.example 应包含哪些不带真实秘密的变量；
- 首次部署、日常启动、查看日志、数据库 migration、备份、停止服务的命令；
- 如何确认三个容器、真实 PostgreSQL 和正常模式都已经生效；
- 修改了哪些文件。

完成配置后先不要写入演示数据。
```

---

# Windows 用户：安装与部署提示词

## 1. 先安装 Docker Desktop

用管理员身份打开 PowerShell：

```powershell
wsl --status
```

如果没有 WSL，执行：

```powershell
wsl --install
```

按系统要求重启后，安装 Docker Desktop for Windows，选择 WSL 2 后端。启动 Docker Desktop，等待它显示 Running。

验证：

```powershell
docker version
docker compose version
docker run --rm hello-world
```

## 2. Windows 用户复制给 Agent 的提示词

```text
我的系统是 Windows。我已安装并启动 Docker Desktop，Docker 使用 WSL 2 后端。

我的项目目录是 C:\\Users\\<我的用户名>\\Documents\\python_proj\\shop；如果实际目录不同，请先问我或先列出目录，不要猜路径。

请按照“Docker 全栈正常模式”部署这个项目：Docker 里启动 PostgreSQL 16、FastAPI API 和前端。不要使用我电脑以前安装过的 PostgreSQL，不要使用 SQLite，也不要使用内存/演示数据。

请先检查 backend/.env 是否存在。若不存在：只创建 backend/.env.example，并明确告诉我复制成 backend/.env 后需要自己填写哪些密码；不要自动编造真实密码。

请让 backend/.env 支持以下变量，变量值由我自己填写：

POSTGRES_USER=shop_prod
POSTGRES_PASSWORD=1234
POSTGRES_DB=shop_prod
DATABASE_URL=postgresql+psycopg2://shop_prod:1234@db:5432/shop_prod
JWT_SECRET=<我自己生成的随机密钥>
PAYMENT_ENCRYPTION_KEY=<我自己生成的Fernet密钥>
AUTO_CREATE_SCHEMA=false
SEED_DEMO_DATA=false
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USERNAME=
# SMTP_PASSWORD=
# SMTP_FROM=
# SMTP_STARTTLS=true
# FEISHU_APP_ID=
# FEISHU_APP_SECRET=
# FEISHU_WEBHOOK_URL=

其中 POSTGRES_PASSWORD 和 DATABASE_URL 中的密码必须是同一个值。DATABASE_URL 的主机必须是 db，不是 localhost。若 PostgreSQL volume 已存在，不要以为改 POSTGRES_PASSWORD 就能改掉已有数据库密码；先备份并说明安全修改方案。

要求：
- docker-compose.yml 必须有 db、api、frontend 三个服务；
- db 必须使用 postgres:16 和 named volume 保存数据；
- api 等 db 健康后再启动；
- db 不映射 5432 到 Windows；api 只映射 127.0.0.1:5600；frontend 映射 3000；
- 数据库 migration 用 docker compose run --rm api alembic upgrade head 明确执行；
- 不能因为数据库为空就自动写演示账号、演示商品或演示留言；
- 给我一个明确的首管理员初始化命令，而不是自动创建默认管理员；
- 给我 PowerShell 版本的完整命令：构建、启动、migration、检查、日志、备份和停止；
- 不要执行 down -v，不要删除 volume。

最后请检查 /health/details，确认数据库主机是 db，且 SEED_DEMO_DATA 和 AUTO_CREATE_SCHEMA 都是 false。
```

## 3. Windows 用户完成后应看到什么

```powershell
docker compose ps
curl http://127.0.0.1:5600/health
curl http://127.0.0.1:5600/health/details
docker compose logs --tail=100 api
```

正常情况：`db` 显示 healthy，`api` 和 `frontend` 显示 running；`health/details` 显示 PostgreSQL、数据库主机 `db`、两个演示/自动建表开关都是 `false`。

---

# macOS 用户：安装与部署提示词

## 1. 先安装 Docker Desktop

确认是 Apple 芯片还是 Intel：苹果菜单 → 关于本机。下载对应芯片的 Docker Desktop for Mac，拖入“应用程序”后打开 Docker，等待菜单栏图标显示已启动。

终端验证：

```bash
docker version
docker compose version
docker run --rm hello-world
```

如果显示找不到 `docker`，退出并重新打开终端；仍无效时在 Docker Desktop 设置中检查 Docker CLI 是否加入 PATH。

## 2. macOS 用户复制给 Agent 的提示词

```text
我的系统是 macOS，已经安装并启动 Docker Desktop。我的商城项目目录是 /Users/<我的用户名>/Documents/python_proj/shop；如果实际路径不同，请先让我确认，不能猜路径。

请把这个项目改成 Docker 全栈“正常模式”：Docker 中启动 PostgreSQL 16、FastAPI API、前端页面。不要使用 Mac 本机 PostgreSQL，不要使用 SQLite，不要使用内存数据库，也不要自动写演示数据。

请先检查 backend/.env。若缺失，请提供 backend/.env.example 和创建 backend/.env 的清晰步骤；不要在代码仓库里写真实密码或密钥。

backend/.env 需要包含以下变量，密码和密钥由我自己填写：

POSTGRES_USER=shop_prod
POSTGRES_PASSWORD=<我自己填写的强密码>
POSTGRES_DB=shop_prod
DATABASE_URL=postgresql+psycopg2://shop_prod:<URL编码后的数据库密码>@db:5432/shop_prod
JWT_SECRET=<我自己生成的随机密钥>
PAYMENT_ENCRYPTION_KEY=<我自己生成的Fernet密钥>
AUTO_CREATE_SCHEMA=false
SEED_DEMO_DATA=false
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USERNAME=
# SMTP_PASSWORD=
# SMTP_FROM=
# SMTP_STARTTLS=true
# FEISHU_APP_ID=
# FEISHU_APP_SECRET=
# FEISHU_WEBHOOK_URL=

其中 POSTGRES_PASSWORD 和 DATABASE_URL 中的密码必须是同一个值。DATABASE_URL 的主机必须是 db，不是 localhost。若 PostgreSQL volume 已存在，不要以为改 POSTGRES_PASSWORD 就能改掉已有数据库密码；先备份并说明安全修改方案。

请做到：
- docker-compose.yml 有 db、api、frontend 三个服务；
- db 使用 postgres:16，并把 /var/lib/postgresql/data 挂到 named volume；
- api 必须等 db 健康后启动；
- PostgreSQL 不映射到 Mac 端口；api 只绑定 127.0.0.1:5600；frontend 使用 3000；
- 表结构只通过 docker compose run --rm api alembic upgrade head 更新；
- 正常启动不能自动创建演示管理员、商品或留言；
- 提供一个单独的首管理员初始化命令，只创建我指定的管理员；
- 给我完整 macOS 终端命令：构建、启动、migration、检查、日志、备份、停止；
- 不要执行 docker compose down -v，不要删除 volume。

最后通过 /health/details 证明：数据库是 PostgreSQL，主机是 db，AUTO_CREATE_SCHEMA=false，SEED_DEMO_DATA=false。
```

## 3. macOS 用户完成后应看到什么

```bash
docker compose ps
curl http://127.0.0.1:5600/health
curl http://127.0.0.1:5600/health/details
docker compose logs --tail=100 api
```

正常情况：`db` 显示 healthy，`api` 与 `frontend` 显示 running；页面可通过 `http://localhost:3000` 打开。

---

## 数据备份提示词（两个系统都适用）

运行 migration 或清理旧演示数据前，先让 Agent 给出并执行备份；不要先删除数据。

```text
请只为当前 Docker 中的 PostgreSQL 做备份，不修改任何数据。备份文件保存到项目根目录 backups/，文件名包含当前日期和时间。请使用 docker compose exec db pg_dump 导出当前数据库；导出完成后告诉我备份文件大小和路径。

不要执行 docker compose down -v，不要删除 volume，不要清空表，也不要在没有我确认的情况下删除旧演示数据。
```

建议执行后检查：

```bash
ls -lh backups
docker volume ls
```

---

## 从演示模式切到正常模式：统一提示词

> 先备份，再做这个步骤。它的目标是阻止未来自动灌入演示数据，不会自动删除历史演示数据。

```text
请把当前 Docker 商城服务从演示模式切换为正常模式，但不要删除任何现有数据。

请按顺序完成：
1. 只读检查当前 backend/.env、docker compose 配置、当前容器、Alembic migration 版本和数据库中的用户/商品/订单数量；报告时遮住密码和密钥。
2. 先创建数据库备份到 backups/，确认备份成功。
3. 把正常模式配置改为：
   AUTO_CREATE_SCHEMA=false
   SEED_DEMO_DATA=false
4. 保留 Docker 的 db、api、frontend 三个服务和已有 PostgreSQL volume；不要切换到电脑本机数据库。
5. 使用 migration 升级数据库：docker compose run --rm api alembic upgrade head。
6. 只重建和重启需要更新的服务。
7. 检查 /health/details，确认数据库主机为 db，数据库类型为 PostgreSQL，两个开关为 false。
8. 列出当前数据库已有的疑似演示用户、商品和留言，但不要删除。等我确认后再给出精确删除方案。

最后给我一份中文报告：备份路径、容器状态、migration 版本、数据库状态、正常模式开关，以及是否有任何数据被删除。
```

---

## 日常命令（两个系统都适用）

```bash
# 构建并启动三个容器
docker compose up -d --build

# 新功能有 migration 时，明确升级数据库
docker compose run --rm api alembic upgrade head

# 查看状态与日志
docker compose ps
docker compose logs -f api

# 只停止容器，保留数据库和上传图片
docker compose down
```

绝对不要把下面命令当成日常停止命令：

```bash
docker compose down -v
```

它会删除 PostgreSQL 数据 volume 和上传图片 volume。

## 官方资料

- [Docker Desktop for Windows 安装](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop for Mac 安装](https://docs.docker.com/desktop/setup/install/mac-install/)
