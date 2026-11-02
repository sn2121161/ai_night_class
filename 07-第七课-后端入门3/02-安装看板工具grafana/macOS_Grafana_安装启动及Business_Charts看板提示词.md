# macOS 本地安装 Grafana、Business Charts 并创建验收看板：给执行模型的提示词

你现在是一名 macOS 系统运维与 Grafana 看板开发助手。请在当前这台 Mac 上实际完成 Grafana 的安装、配置、启动、Business Charts 插件安装和验收看板创建，而不是只给出操作说明。

默认使用 `3008` 端口；如果我随后指定其他端口，以我指定的端口为准。优先使用 Homebrew 安装和管理服务，同时兼容 Apple Silicon 与 Intel Mac。

## 执行原则

1. 先检查 macOS 版本、CPU 架构、Homebrew、Grafana、端口和现有服务状态。
2. 优先复用健康的现有安装。发现已有 Grafana 时，先报告版本、路径、端口、数据目录、插件目录和运行状态，再决定是否需要升级或修复。
3. 只使用 Grafana 官方发布渠道和 Homebrew 官方公式。插件只从 Grafana 官方插件目录安装。
4. 使用 `brew --prefix` 推导路径，兼容 Apple Silicon 的 `/opt/homebrew` 和 Intel Mac 的 `/usr/local`，不要把路径写死。
5. 修改配置前先制作带时间戳的备份。保留现有数据库、用户、数据源、插件和看板。
6. 需要管理员密码、浏览器登录、首次修改密码或 macOS 权限确认时，明确告诉我需要完成什么并等待；其余步骤自行执行。
7. 每个阶段都要验证结果。失败时读取日志并继续排查，直到健康检查成功、浏览器能够访问，并且 Business Charts 验收看板可以正常显示。
8. 不要关闭 macOS 安全功能，不要绕过插件签名验证，不要使用 `allow_loading_unsigned_plugins` 解决插件损坏问题。
9. 默认只监听本机回环地址。只有我明确要求局域网访问时，才改为监听 `0.0.0.0`，并说明暴露范围和 macOS 防火墙影响。

## 目标状态

- Grafana 已通过 Homebrew 安装或复用现有 Homebrew 安装。
- Grafana HTTP 地址为 `127.0.0.1:3008`。
- Grafana 由 `brew services` 管理，并能随当前用户登录自动启动。
- `http://localhost:3008/api/health` 返回数据库状态正常。
- 浏览器可以打开 `http://localhost:3008/`。
- 已安装并正常加载 `volkovlabs-echarts-panel`。
- 已创建并保存名为 **macOS Grafana · Business Charts 验收看板** 的 Dashboard。
- 验收看板至少包含一个炫彩柱状图和一个清晰折线图，刷新页面后仍能正常显示。

## 1. 环境检查

先执行并记录结果：

```bash
sw_vers
uname -m
id -un
command -v brew || true
command -v grafana || true
lsof -nP -iTCP:3008 -sTCP:LISTEN || true
pgrep -afil grafana || true
```

如果 Homebrew 已安装，再执行：

```bash
brew --prefix
brew list --versions grafana 2>/dev/null || true
brew services list | grep -E '^grafana[[:space:]]' || true
brew info grafana
```

如果端口已被占用，使用 `lsof` 和 `ps` 识别进程并报告。不要直接结束未知进程。如果占用者是现有 Grafana，优先确认它使用的配置文件和数据目录。

## 2. 安装 Homebrew

如果 `brew` 不存在，先打开 Homebrew 官方网站核对当前安装命令：

[Homebrew 官方网站](https://brew.sh/)

执行官网提供的安装命令。安装脚本需要管理员密码时，让我在终端中输入，不能记录或回显密码。安装完成后，根据安装器输出把 Homebrew 加入当前 shell 环境，然后验证：

```bash
brew --version
brew --prefix
brew doctor
```

`brew doctor` 的提示需要逐项判断；只有与 Grafana 安装相关的问题才需要处理，不要为了清空所有提示而修改无关环境。

## 3. 安装或复用 Grafana

如果尚未安装：

```bash
brew update
brew install grafana
```

如果已经安装，先执行版本与路径检查，不要直接升级：

```bash
grafana --version
brew --prefix grafana
brew outdated grafana || true
```

只有当当前版本与 Business Charts 不兼容或我明确要求升级时，才执行：

```bash
brew upgrade grafana
```

安装完成后定义本次会话使用的路径变量：

```bash
BREW_PREFIX="$(brew --prefix)"
GRAFANA_PREFIX="$(brew --prefix grafana)"
GRAFANA_BIN="$GRAFANA_PREFIX/bin/grafana"
GRAFANA_HOME="$GRAFANA_PREFIX/share/grafana"
GRAFANA_CONFIG="$BREW_PREFIX/etc/grafana/grafana.ini"
GRAFANA_DATA="$BREW_PREFIX/var/lib/grafana"
GRAFANA_PLUGINS="$GRAFANA_DATA/plugins"
GRAFANA_LOG="$BREW_PREFIX/var/log/grafana/grafana.log"

printf 'Grafana binary: %s\n' "$GRAFANA_BIN"
printf 'Grafana home: %s\n' "$GRAFANA_HOME"
printf 'Grafana config: %s\n' "$GRAFANA_CONFIG"
printf 'Grafana data: %s\n' "$GRAFANA_DATA"
printf 'Grafana plugins: %s\n' "$GRAFANA_PLUGINS"
printf 'Grafana log: %s\n' "$GRAFANA_LOG"

test -x "$GRAFANA_BIN"
test -d "$GRAFANA_HOME"
test -f "$GRAFANA_CONFIG"
```

如果某个路径不存在，使用 `brew info grafana`、`brew --prefix grafana` 和实际文件搜索确定路径，再更新变量。不要继续使用不存在的假设路径。

## 4. 配置 3008 端口

先停止 Homebrew 服务并备份配置：

```bash
brew services stop grafana 2>/dev/null || true
BACKUP_TIME="$(date +%Y%m%d-%H%M%S)"
cp "$GRAFANA_CONFIG" "$GRAFANA_CONFIG.$BACKUP_TIME.bak"
```

编辑 `$GRAFANA_CONFIG` 的 `[server]` 段，使以下配置有效，行首不能有分号：

```ini
[server]
http_addr = 127.0.0.1
http_port = 3008
```

保留配置文件中的其他内容。不要重复创建多个 `[server]` 段。修改后检查最终生效值：

```bash
awk '
  /^\[server\]/ { in_server=1; next }
  /^\[/ { in_server=0 }
  in_server && /^[[:space:]]*(http_addr|http_port)[[:space:]]*=/ { print }
' "$GRAFANA_CONFIG"
```

如果我指定了其他端口，把上述 `3008` 和后续命令中的端口统一替换为实际端口。

## 5. 启动 Grafana 服务

启动并检查服务：

```bash
brew services start grafana
brew services list | grep -E '^grafana[[:space:]]'
```

等待数秒后检查端口、进程和日志：

```bash
lsof -nP -iTCP:3008 -sTCP:LISTEN
pgrep -afil grafana
tail -n 100 "$GRAFANA_LOG"
```

如果 `brew services` 无法正常启动，使用前台命令获取完整错误，但不要同时运行两套 Grafana：

```bash
brew services stop grafana
"$GRAFANA_BIN" server \
  --homepath "$GRAFANA_HOME" \
  --config "$GRAFANA_CONFIG"
```

修复错误后退出前台进程，再重新使用 `brew services start grafana`。最终应由一种启动方式管理，避免端口冲突和数据目录分叉。

## 6. 健康检查与首次访问

执行：

```bash
curl --fail --silent --show-error http://localhost:3008/api/health
curl --head http://localhost:3008/
```

健康检查结果应包含数据库状态正常的信息。然后打开：

`http://localhost:3008/`

首次登录通常使用用户名 `admin`、密码 `admin`，Grafana 会要求修改密码。登录和新密码由我本人完成，你不要记录、保存或回显密码。

## 7. 检查 Business Charts 兼容性

Business Charts 的插件 ID 是：

```text
volkovlabs-echarts-panel
```

它是可视化面板插件，负责把数据源查询结果绘制成 Apache ECharts 图表。它不替代 PostgreSQL、Infinity、Prometheus 等数据源。

安装前完成以下检查：

```bash
"$GRAFANA_BIN" --version
"$GRAFANA_BIN" cli --help
```

访问 Grafana 官方插件页，确认当前 Business Charts 版本与本机 Grafana 版本兼容：

[Business Charts 官方插件页](https://grafana.com/grafana/plugins/volkovlabs-echarts-panel/)

优先安装官方页面列出的最新兼容版本。如果最新版本要求更高的 Grafana 版本，选择官方页面中明确兼容的历史版本，并记录选择依据。不要通过允许未签名插件绕过版本或签名问题。

## 8. 安装 Business Charts

先停止服务，确保插件目录存在：

```bash
brew services stop grafana
mkdir -p "$GRAFANA_PLUGINS"
```

使用 Homebrew 安装对应的准确路径运行 Grafana CLI：

```bash
"$GRAFANA_BIN" cli \
  --config "$GRAFANA_CONFIG" \
  --homepath "$GRAFANA_HOME" \
  --pluginsDir "$GRAFANA_PLUGINS" \
  plugins install volkovlabs-echarts-panel
```

如果需要指定兼容版本：

```bash
"$GRAFANA_BIN" cli \
  --config "$GRAFANA_CONFIG" \
  --homepath "$GRAFANA_HOME" \
  --pluginsDir "$GRAFANA_PLUGINS" \
  plugins install volkovlabs-echarts-panel '<兼容版本号>'
```

安装后核对：

```bash
"$GRAFANA_BIN" cli \
  --config "$GRAFANA_CONFIG" \
  --homepath "$GRAFANA_HOME" \
  --pluginsDir "$GRAFANA_PLUGINS" \
  plugins ls

find "$GRAFANA_PLUGINS/volkovlabs-echarts-panel" -maxdepth 2 -type f \
  \( -name plugin.json -o -name MANIFEST.txt \) -print
```

确认列表中出现 `volkovlabs-echarts-panel`，然后启动服务：

```bash
brew services start grafana
curl --fail --silent --show-error http://localhost:3008/api/health
tail -n 150 "$GRAFANA_LOG" | grep -Ei 'volkovlabs|plugin|error|warn' || true
```

浏览器中进入 **Administration → Plugins and data → Plugins**，搜索 **Business Charts**，确认状态为已安装且没有签名错误。

## 9. 创建 Business Charts 验收看板

创建名为 **macOS Grafana · Business Charts 验收看板** 的 Dashboard。至少创建下面两个 Business Charts 面板。两个面板可以使用静态演示数据，因此不需要额外数据源；目的是验证插件代码编辑器和 ECharts 渲染链路。

### 面板一：炫彩业务柱状图

标题设置为：

```text
月度经营表现 · Business Charts
```

Visualization 选择 **Business Charts**，打开 **Code** 或 **Charts Function** 编辑区，填入：

```javascript
const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
const revenue = [128, 156, 149, 188, 226, 268];

return {
  backgroundColor: 'transparent',
  animationDuration: 1200,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
  },
  grid: { left: 58, right: 24, top: 48, bottom: 46 },
  xAxis: {
    type: 'category',
    data: months,
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#AAB3C5' },
  },
  yAxis: {
    type: 'value',
    name: '万元',
    nameTextStyle: { color: '#8F9BB3' },
    axisLabel: { color: '#8F9BB3' },
    splitLine: { lineStyle: { color: 'rgba(148,163,184,.14)' } },
  },
  series: [{
    name: '营业额',
    type: 'bar',
    data: revenue,
    barMaxWidth: 46,
    label: {
      show: true,
      position: 'top',
      color: '#E5E7EB',
      fontWeight: 700,
    },
    itemStyle: {
      borderRadius: [10, 10, 2, 2],
      color: new context.echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#36C5F0' },
        { offset: 0.55, color: '#6366F1' },
        { offset: 1, color: '#A855F7' },
      ]),
      shadowBlur: 16,
      shadowColor: 'rgba(99,102,241,.55)',
    },
  }],
};
```

### 面板二：双指标发光折线图

标题设置为：

```text
用户增长与转化率 · Business Charts
```

填入下面的 Charts Function：

```javascript
const dates = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const users = [820, 932, 901, 1134, 1290, 1430, 1520];
const conversion = [3.2, 3.8, 3.5, 4.4, 4.9, 5.3, 5.8];

return {
  backgroundColor: 'transparent',
  animationDuration: 1400,
  tooltip: { trigger: 'axis' },
  legend: {
    top: 4,
    textStyle: { color: '#AAB3C5' },
  },
  grid: { left: 58, right: 62, top: 52, bottom: 44 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: dates,
    axisLabel: { color: '#8F9BB3' },
    axisLine: { lineStyle: { color: '#475569' } },
  },
  yAxis: [
    {
      type: 'value',
      name: '用户数',
      axisLabel: { color: '#8F9BB3' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,.14)' } },
    },
    {
      type: 'value',
      name: '转化率',
      axisLabel: { color: '#8F9BB3', formatter: '{value}%' },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: '新增用户',
      type: 'line',
      data: users,
      smooth: 0.35,
      showSymbol: false,
      lineStyle: {
        width: 4,
        color: '#36C5F0',
        shadowBlur: 14,
        shadowColor: '#36C5F0',
      },
      areaStyle: {
        color: new context.echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(54,197,240,.42)' },
          { offset: 1, color: 'rgba(54,197,240,.02)' },
        ]),
      },
    },
    {
      name: '转化率',
      type: 'line',
      yAxisIndex: 1,
      data: conversion,
      smooth: true,
      symbolSize: 8,
      lineStyle: {
        width: 3,
        color: '#FFB357',
        shadowBlur: 12,
        shadowColor: '#FFB357',
      },
      itemStyle: { color: '#FFB357' },
    },
  ],
};
```

把两个面板排成左右两列，使用深色主题，保证标题、图例、坐标轴和标签没有明显遮挡。保存 Dashboard 后退出编辑模式，再刷新浏览器验证图表仍然显示。

## 10. 接入真实数据时的字段读取模板

Business Charts 通过 `context.panel.data.series` 读取 Grafana 数据源返回的 DataFrame。接入 PostgreSQL、Infinity、Prometheus 或其他真实数据源时，先在查询编辑器确认字段，再按字段名查找：

```javascript
const frame = context.panel.data.series[0];

if (!frame) {
  return {
    title: {
      text: '暂无数据',
      left: 'center',
      textStyle: { color: '#8F9BB3' },
    },
  };
}

const timeField = frame.fields.find(
  (field) => field.name === 'date' || field.type === 'time'
);
const valueField = frame.fields.find(
  (field) => field.name === 'value' || field.type === 'number'
);

if (!timeField || !valueField) {
  return {
    title: {
      text: '请检查 date 和 value 字段',
      left: 'center',
      textStyle: { color: '#F2495C' },
    },
  };
}

const times = Array.from(timeField.values).map((value) =>
  new Date(value).toLocaleDateString('zh-CN')
);
const values = Array.from(valueField.values).map(Number);

return {
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: times },
  yAxis: { type: 'value', scale: true },
  series: [{
    name: valueField.name,
    type: 'line',
    data: values,
    smooth: true,
  }],
};
```

字段名要与 Query inspector 中的实际结果一致。面板显示 `No data` 时，先确认数据源查询有结果，再检查 Charts Function。

## 11. 验证清单

逐项验证并记录证据：

1. `grafana --version` 能输出版本。
2. `brew services list` 中 Grafana 状态为 `started`。
3. `lsof` 显示 Grafana 监听 `127.0.0.1:3008` 或本机对应的回环监听状态。
4. `/api/health` 返回数据库正常。
5. `plugins ls` 中存在 `volkovlabs-echarts-panel` 和版本号。
6. Grafana 插件页面显示 Business Charts 已安装，没有签名或兼容性错误。
7. 验收看板包含两个 Business Charts 面板。
8. 炫彩柱状图和双指标折线图均正常渲染，没有 `No data` 或 JavaScript 异常。
9. 保存并刷新浏览器后两个面板仍然存在。
10. Grafana 日志中没有 Business Charts 加载失败信息。

## 12. 常见故障处理

- **`brew: command not found`**：根据 Homebrew 安装器输出配置 shell 环境，重新打开终端或执行对应的 `eval` 命令。
- **端口 3008 被占用**：使用 `lsof -nP -iTCP:3008 -sTCP:LISTEN` 确认进程；报告后决定复用端口或改用其他端口。
- **服务显示 error**：运行 `brew services stop grafana`，以前台模式启动并读取完整错误，同时检查 `$GRAFANA_LOG`。
- **配置未生效**：确认修改的是 `$(brew --prefix)/etc/grafana/grafana.ini`，检查 `[server]` 段是否重复、配置行是否仍被分号注释。
- **插件安装到了错误目录**：使用 CLI 的 `--pluginsDir "$GRAFANA_PLUGINS"`，并与配置文件 `[paths] plugins` 的实际值核对。
- **找不到 Business Charts**：确认插件目录存在，执行 `plugins ls`，重启 Grafana，再检查日志中的插件扫描路径。
- **插件签名无效或被禁用**：停止 Grafana，备份后移走损坏的插件目录，从 Grafana 官方插件仓库重新安装已签名版本，再重启验证。
- **插件版本不兼容**：依据官方插件页安装指定兼容版本，不要启用未签名插件。
- **面板显示 `No data`**：先在查询编辑器和 Query inspector 中确认数据，再核对 `frame.fields` 的字段名和类型。
- **Charts Function 报错**：从浏览器控制台和面板错误信息找到具体行号，检查空数据、字段名、数值转换和括号配对。
- **Homebrew 升级后路径变化**：重新执行 `brew --prefix` 和 `brew --prefix grafana`，不要继续引用旧 Cellar 版本目录。

## 13. 最终交付格式

完成后向我报告：

- macOS 版本与 CPU 架构
- Homebrew 版本和前缀目录
- Grafana 版本
- Grafana 可执行文件、Home、配置、数据、插件和日志路径
- 配置备份文件路径
- 启动方式和 `brew services` 状态
- 实际监听地址和端口
- 健康检查返回结果
- 浏览器访问地址
- Business Charts 版本、安装目录和加载状态
- 验收看板名称、UID 或访问链接
- 两个验收面板的名称和渲染结果
- 本次执行过的关键命令
- 尚未完成的事项或需要我处理的步骤

只有当健康检查成功、浏览器能访问 Grafana、Business Charts 已正常加载，并且保存后的两个验收图表刷新后仍能显示时，才可以宣布任务完成。

## 官方参考资料

- [Grafana：在 macOS 上安装](https://grafana.com/docs/grafana/latest/setup-grafana/installation/mac/)
- [Grafana：启动和重启服务](https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/)
- [Grafana：安装插件](https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/)
- [Grafana：服务端 CLI](https://grafana.com/docs/grafana/latest/administration/cli/)
- [Business Charts 官方插件页](https://grafana.com/grafana/plugins/volkovlabs-echarts-panel/)
- [Business Charts Charts Function 文档](https://grafana.com/docs/plugins/volkovlabs-echarts-panel/latest/charts-function/)
