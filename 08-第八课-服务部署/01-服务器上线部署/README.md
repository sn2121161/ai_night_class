# 第 8 课 HTML 互动课件：从 localhost 到服务器

课程主题：让上一节只能在本机运行的代码，经过公网认知、SSH 密钥登录、服务器体检、部署方案选择和分阶段执行，变成其他人可以访问的公开服务。

课件共 29 页，其中 25 页主线内容、4 页附录。

## 使用

可直接双击 `index.html`，核心内容和互动不依赖外部网络或 CDN。

也可以在仓库根目录启动静态服务器：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173/常州夜宵008-服务器与部署/slides-html/
```

推荐在 Chrome 或 Edge 中横屏、全屏演示。

## 演示控制

| 操作 | 功能 |
|---|---|
| `←` / `→`、PageUp / PageDown | 前后翻页 |
| 空格 | 下一页 |
| Home / End | 封面 / 最后一页 |
| `F` | 切换全屏 |
| `O` | 页面目录 |
| `N` | 显示或隐藏讲师备注 |
| `R` | 重置并重播当前页 |
| `A` | 跳到第一个附录 |
| 手机左右滑动 | 前后翻页 |

页面 URL 使用 `#slide-N` 记录当前位置，刷新后仍停留在当前页。

## 主要互动

- 把 `localhost` 链接发到群里的失败场景。
- 本机、同一 Wi-Fi、手机 5G 三次访问实验。
- IPv4 / IPv6 逐行比较表。
- 私网、CGN 共享地址与示例地址判断器。
- 出站与入站路径切换。
- 家庭 NAT 与运营商 CGNAT 逐层揭示。
- 家庭电脑 / 云服务器 VS。
- Linux、Windows Server、macOS 场景选择器。
- 密码登录 / SSH 密钥登录 VS。
- Nginx / Tomcat 从 VS 变成合作。
- 静态网站、Node.js、Python、Spring Boot JAR、Java WAR 部署匹配器。
- systemd、Docker、Docker Compose 决策表。
- “直接让 AI 部署”与“先调查、再确认”的流程比较。
- 从本地代码到 HTTPS 的逐步通关路线。

所有互动均为离线模拟，不会连接真实服务器、开放端口或发出部署请求。

## 提示词附件

`prompts/` 中包含：

1. `01-SSH免密登录引导.txt`
2. `02-项目与容器部署分析.txt`
3. `03-确认后的部署执行.txt`
4. `04-服务器只读体检.txt`

课件中的复制按钮内置同版提示词，并为 `file://` 环境提供复制回退。

## 建议时长

- 90 分钟：压缩 IPv4/IPv6、操作系统和服务器体检，由教师演示部署选择。
- 120 分钟：完整讲解并让学员实际完成 SSH 提示词、服务器体检和容器匹配。

完整教学设计见：

`../../AI办公课/08-从localhost到服务器-课程大纲.md`

## 文件结构

```text
slides-html/
├── index.html
├── styles.css
├── app.js
├── README.md
├── prompts/
│   ├── 01-SSH免密登录引导.txt
│   ├── 02-项目与容器部署分析.txt
│   ├── 03-确认后的部署执行.txt
│   └── 04-服务器只读体检.txt
└── assets/
    └── SOURCES.md
```
