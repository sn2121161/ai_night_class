# Windows 本地安装并启动 Grafana：给执行模型的提示词

你现在是一名 Windows 系统运维助手。请在当前这台 Windows 电脑上实际完成 Grafana 的安装、配置、启动和验证，而不是只给出说明。默认把 Grafana 运行在 `3008` 端口；如果我随后指定其他端口，以我指定的端口为准。

## 执行原则

1. 先检查系统架构、Windows 版本、PowerShell 版本、当前用户是否有管理员权限，以及 `3008` 端口是否被占用。
2. 优先使用 Grafana 官方 Windows 安装包；如果无法使用安装包，再使用官方 ZIP 包。
3. 只从 Grafana 官方网站下载安装文件。不要使用来源不明的镜像、脚本或二进制文件。
4. 需要管理员授权、UAC 确认、登录信息或人工点击时，明确告诉我需要做什么，并等待我完成；其余步骤请你自行执行。
5. 不要修改 `defaults.ini`。配置必须写入 `conf\custom.ini`；如果文件不存在，就从 `conf\sample.ini` 复制生成。
6. 保留每一步执行的命令、结果和最终路径，失败时读取日志并继续排查，直到本机浏览器可以访问 Grafana。
7. 不要删除电脑上已有的 Grafana、数据库或看板数据。如果发现已有安装，先报告版本、路径、运行状态和端口，再决定是复用、升级还是并行安装。

## 目标状态

- Grafana 安装完成。
- HTTP 端口为 `3008`。
- Grafana 能稳定启动。
- 浏览器可访问 `http://localhost:3008/`。
- `http://localhost:3008/api/health` 返回数据库状态正常。
- 如果具备管理员权限，将 Grafana 注册为 Windows 服务并设为自动启动；如果暂时不能注册服务，先以前台进程启动，并给出后续注册服务的准确步骤。

## 执行步骤

### 1. 环境检查

使用 PowerShell 检查：

```powershell
$PSVersionTable.PSVersion
[Environment]::Is64BitOperatingSystem
[Security.Principal.WindowsPrincipal]::new(
  [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Get-NetTCPConnection -LocalPort 3008 -ErrorAction SilentlyContinue
Get-Process grafana* -ErrorAction SilentlyContinue
Get-Service *grafana* -ErrorAction SilentlyContinue
```

同时搜索常见安装位置，例如：

```powershell
$candidates = @(
  'C:\Program Files\GrafanaLabs\grafana',
  'C:\Grafana',
  'C:\grafana'
)
$candidates | Where-Object { Test-Path $_ }
```

如果端口已被占用，先识别占用进程并报告，不要直接结束进程。若占用者正是现有 Grafana，验证其状态后优先复用。

### 2. 下载和安装

打开 Grafana 官方 Windows 下载页，选择当前稳定版和 Windows 64 位版本：

[Grafana Windows 官方下载页](https://grafana.com/grafana/download?platform=windows)

优先下载官方安装包并执行安装。如果只能使用 ZIP 包：

1. 下载官方 ZIP。
2. 对下载文件执行解除阻止：

```powershell
Unblock-File -Path '<下载的 Grafana ZIP 完整路径>'
```

3. 解压到明确、无版本歧义的目录，例如 `C:\Grafana`。
4. 记录实际 Grafana 根目录，后续命令都基于该目录执行，不要假定路径。

### 3. 配置端口

在实际 Grafana 根目录下执行：

```powershell
Set-Location '<Grafana 根目录>'
if (-not (Test-Path '.\conf\custom.ini')) {
  Copy-Item '.\conf\sample.ini' '.\conf\custom.ini'
}
```

编辑 `conf\custom.ini`，确保存在以下有效配置，行首不能有分号：

```ini
[server]
http_addr = 127.0.0.1
http_port = 3008
```

如果需要让局域网其他设备访问，在征得我同意后再把 `http_addr` 改为 `0.0.0.0`，并按最小范围创建 Windows 防火墙入站规则。仅供本机使用时不要开放公网或局域网端口。

### 4. 启动 Grafana

先检查实际可执行文件：

```powershell
Get-ChildItem '.\bin\grafana*.exe'
```

新版本优先尝试：

```powershell
.\bin\grafana.exe server --homepath '<Grafana 根目录>' --config '<Grafana 根目录>\conf\custom.ini'
```

如果安装包提供的是旧版 `grafana-server.exe`，则执行：

```powershell
.\bin\grafana-server.exe --homepath '<Grafana 根目录>' --config '<Grafana 根目录>\conf\custom.ini'
```

先保持进程运行并观察控制台日志。确认没有插件签名、数据库迁移、端口占用或目录权限错误。

### 5. 注册为 Windows 服务

若当前具有管理员权限，按照 Grafana 官方建议使用 NSSM 将已验证可运行的命令注册为服务。NSSM 也必须从其官方来源下载。

注册前确认以下三项：

- Application：实际存在的 `grafana.exe` 或 `grafana-server.exe`
- Startup directory：Grafana 根目录
- Arguments：与前台启动验证成功时完全一致的 `server`、`--homepath` 和 `--config` 参数

服务名称使用 `Grafana`，启动类型设为 Automatic，并把标准输出和错误输出写到可定位的日志目录。随后执行：

```powershell
Start-Service Grafana
Get-Service Grafana
```

如果机器不允许使用 NSSM，不要伪造成功状态；先以前台或后台进程方式运行，并说明限制。

### 6. 验证

执行：

```powershell
Invoke-RestMethod 'http://localhost:3008/api/health'
Test-NetConnection localhost -Port 3008
```

然后打开：

`http://localhost:3008/`

首次登录通常使用用户名 `admin`、密码 `admin`，系统会要求修改密码。密码由我本人输入，你不要记录或回显密码。

### 7. 失败排查

如果无法启动，依次检查：

1. `3008` 端口是否被其他进程占用。
2. 启动命令中的根目录和配置文件路径是否真实存在。
3. `custom.ini` 中 `[server]` 段是否正确，`http_port` 前是否仍有分号。
4. Grafana 日志目录和控制台错误。
5. 数据目录、日志目录、插件目录是否有写权限。
6. Windows 服务的 Application、Startup directory 和 Arguments 是否与前台测试命令一致。
7. 安全软件是否拦截进程；不要擅自关闭安全软件，只报告检测结果。

## 安装并使用 Business Charts（Apache ECharts）面板

Grafana 启动并通过健康检查后，继续完成 Business Charts 面板的安装和操作验证。Business Charts 是 Grafana 的可视化面板插件，插件 ID 为：

```text
volkovlabs-echarts-panel
```

它负责把 Grafana 数据源的查询结果绘制成 ECharts 图表。PostgreSQL、Infinity、CSV、Prometheus 等仍然是数据源，Business Charts 不替代数据源。

### 8. 检查版本和现有插件

先记录 Grafana 版本，并查找当前安装包实际提供的 CLI：

```powershell
Set-Location '<Grafana 根目录>'
.\bin\grafana.exe --version
Get-ChildItem '.\bin\grafana*.exe'
```

不要盲目安装最新版插件。先到 Grafana 官方插件目录确认 Business Charts 当前版本与本机 Grafana 的兼容关系：

[Business Charts 官方插件页](https://grafana.com/grafana/plugins/volkovlabs-echarts-panel/)

如果最新版不兼容，安装官方页面列出的兼容版本，并在最终报告中注明选择依据。

### 9. 使用命令行安装插件

先停止 Grafana 服务，避免安装过程中仍在加载插件文件：

```powershell
Stop-Service Grafana -ErrorAction SilentlyContinue
```

如果安装包中存在新版 `grafana.exe`，执行：

```powershell
.\bin\grafana.exe cli `
  --homepath '<Grafana 根目录>' `
  --pluginsDir '<Grafana 根目录>\data\plugins' `
  plugins install volkovlabs-echarts-panel
```

如果安装包提供的是旧版 `grafana-cli.exe`，执行：

```powershell
.\bin\grafana-cli.exe `
  --homepath '<Grafana 根目录>' `
  --pluginsDir '<Grafana 根目录>\data\plugins' `
  plugins install volkovlabs-echarts-panel
```

如果 `custom.ini` 的 `[paths]` 段指定了其他 `plugins` 目录，以实际配置为准。安装后列出插件进行核对：

```powershell
.\bin\grafana.exe cli `
  --homepath '<Grafana 根目录>' `
  --pluginsDir '<实际插件目录>' `
  plugins ls
```

确认结果中出现 `volkovlabs-echarts-panel`。随后重新启动：

```powershell
Start-Service Grafana
Get-Service Grafana
Invoke-RestMethod 'http://localhost:3008/api/health'
```

如果 Grafana 没有注册为服务，就使用前面已经验证成功的前台启动命令重启 Grafana。

也可以使用 Grafana 管理页面安装：登录后进入 **Administration → Plugins and data → Plugins**，搜索 **Business Charts**，打开插件详情并点击 **Install**。只有管理员可以安装插件。安装完成后仍需按当前启动方式重启 Grafana。

### 10. 在看板中创建 Business Charts 面板

在浏览器中按下面步骤操作：

1. 打开目标 Dashboard，点击右上角 **Edit** 或 **Add → Visualization**。
2. 选择数据源，例如 PostgreSQL 或 Infinity。
3. 写查询并先确认查询结果中包含要绘图的维度字段和数值字段。例如 `date` 和 `value`。
4. 在右侧 **Visualization** 列表中选择 **Business Charts**。
5. 打开 Business Charts 的 **Charts Function** 编辑区。部分版本还提供 **Visual Editor**，可以先用可视化编辑器生成基础配置，再到 Charts Function 调整。
6. 粘贴与实际字段名称匹配的 ECharts 配置，点击 **Apply**。
7. 调整面板标题、图例、颜色、坐标轴、提示框和单位。
8. 保存 Dashboard，刷新页面确认图表仍能正常加载。

### 11. 最小可用 ECharts 示例

下面示例从 Grafana 返回的第一个 DataFrame 中自动查找一个分类字段和一个数值字段，生成柱状图。先确保数据源查询已经返回数据：

```javascript
const frame = context.panel.data.series[0];

if (!frame) {
  return {
    title: { text: '暂无数据', left: 'center' },
  };
}

const categoryField = frame.fields.find(
  (field) => field.type === 'string' || field.type === 'time'
);
const valueField = frame.fields.find(
  (field) => field.type === 'number'
);

if (!categoryField || !valueField) {
  return {
    title: { text: '请检查维度字段和数值字段', left: 'center' },
  };
}

const categories = Array.from(categoryField.values).map((value) => {
  if (categoryField.type === 'time') {
    return new Date(value).toLocaleDateString('zh-CN');
  }
  return String(value);
});

const values = Array.from(valueField.values);

return {
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  grid: { left: 56, right: 24, top: 50, bottom: 50 },
  xAxis: {
    type: 'category',
    data: categories,
    axisLabel: { rotate: categories.length > 12 ? 35 : 0 },
  },
  yAxis: { type: 'value', scale: true },
  series: [
    {
      name: valueField.name,
      type: 'bar',
      data: values,
      barMaxWidth: 36,
      itemStyle: {
        color: '#5794F2',
        borderRadius: [4, 4, 0, 0],
      },
    },
  ],
};
```

如果希望固定字段，应该用字段名查找，避免查询字段顺序变化后画错数据。例如：

```javascript
const dateField = frame.fields.find((field) => field.name === 'date');
const priceField = frame.fields.find((field) => field.name === '兆易创新');
```

不要把来源不明的 JavaScript 直接粘贴到 Charts Function。Business Charts 中的脚本会在浏览器内运行，应只使用经过检查的代码。

### 12. Business Charts 验证和排错

完成后至少验证：

1. 插件列表中能看到 `volkovlabs-echarts-panel`，状态正常且没有签名错误。
2. 新增面板的 Visualization 列表中能选择 Business Charts。
3. 查询检查器中能看到数据源返回的数据。
4. Charts Function 没有 JavaScript 异常，浏览器刷新后图表仍存在。
5. Grafana 服务日志中没有插件加载失败信息。

常见问题处理：

- **找不到 Business Charts**：确认插件安装目录与 Grafana 实际 `plugins` 路径一致，并重启 Grafana。
- **插件被禁用或签名无效**：删除损坏的插件目录后，从 Grafana 官方插件目录重新安装已签名版本；不要通过允许未签名插件来绕过问题。
- **面板显示 No data**：先检查数据源查询，不要先修改 ECharts 代码。
- **字段为 undefined**：查看 Query inspector 返回的字段名称，并修改 `frame.fields.find(...)`。
- **服务重启后插件消失**：检查服务账号对插件目录是否拥有读取权限，以及是否使用了另一套 Grafana 根目录或数据目录。
- **插件版本不兼容**：根据 Grafana 官方插件页选择兼容版本，使用 `plugins install volkovlabs-echarts-panel <版本号>` 安装指定版本。

## 最终交付格式

完成后请向我报告：

- Grafana 版本
- 安装根目录
- 配置文件路径
- 启动方式：Windows 服务或普通进程
- 服务名称与运行状态
- 实际监听地址和端口
- 健康检查返回结果
- 浏览器访问地址
- 日志路径
- 本次执行过的关键命令
- Business Charts 插件版本、安装目录和加载状态
- 新建的 Business Charts 测试面板名称及使用的数据源
- 尚未完成的事项或需要我处理的步骤

只有当健康检查成功、浏览器能打开登录页面，并且 Business Charts 测试面板能够显示查询数据时，才可以宣布任务完成。
