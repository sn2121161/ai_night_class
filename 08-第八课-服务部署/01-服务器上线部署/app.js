const deck = document.querySelector('#deck');
const slides = [...document.querySelectorAll('.slide')];
const progressBar = document.querySelector('#progressBar');
const slideCounter = document.querySelector('#slideCounter');
const overviewDialog = document.querySelector('#overviewDialog');
const overviewGrid = document.querySelector('#overviewGrid');
const notesPanel = document.querySelector('#notesPanel');
const notesContent = document.querySelector('#notesContent');
const copyToast = document.querySelector('#copyToast');
const appendixIndex = slides.findIndex((slide) => slide.classList.contains('appendix'));

let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let toastTimer;

function indexFromHash() {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  if (!match) return 0;
  return Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1));
}

function updateNotes() {
  const note = slides[currentIndex].querySelector('.speaker-note');
  notesContent.textContent = note?.textContent.trim() || '本页没有额外讲师备注。';
}

function updateOverview() {
  overviewGrid.querySelectorAll('button').forEach((button, index) => {
    button.classList.toggle('current', index === currentIndex);
  });
}

function resetRevealGroup(group) {
  const items = [...group.querySelectorAll('[data-reveal-item]')];
  const conclusion = group.querySelector('[data-reveal-conclusion]');
  const name = group.dataset.revealGroup;
  const button = document.querySelector(`[data-reveal-next="${name}"]`);

  group.dataset.revealStep = '-1';
  group.classList.remove('is-complete');
  items.forEach((item) => item.classList.remove('is-visible', 'is-current'));
  conclusion?.classList.remove('is-visible');

  if (button) {
    if (!button.dataset.initialLabel) button.dataset.initialLabel = button.textContent.trim();
    button.textContent = button.dataset.initialLabel;
  }
}

function advanceRevealGroup(name) {
  const group = document.querySelector(`[data-reveal-group="${name}"]`);
  if (!group) return;
  const items = [...group.querySelectorAll('[data-reveal-item]')];
  const conclusion = group.querySelector('[data-reveal-conclusion]');
  const button = document.querySelector(`[data-reveal-next="${name}"]`);
  let step = Number(group.dataset.revealStep ?? -1);

  if (group.classList.contains('is-complete')) {
    resetRevealGroup(group);
    return;
  }

  if (step < items.length - 1) {
    step += 1;
    group.dataset.revealStep = String(step);
    items.forEach((item, index) => {
      item.classList.toggle('is-visible', index <= step);
      item.classList.toggle('is-current', index === step);
    });
    if (button) button.textContent = step === items.length - 1 && conclusion ? '查看结论' : '下一项';
    return;
  }

  if (conclusion) {
    items.forEach((item) => item.classList.remove('is-current'));
    conclusion.classList.add('is-visible');
    group.classList.add('is-complete');
    if (button) button.textContent = '重新开始';
  } else {
    resetRevealGroup(group);
  }
}

function resetShareLink() {
  const reply = document.querySelector('#shareReply');
  const answer = document.querySelector('#shareAnswer');
  const button = document.querySelector('#shareLink');
  reply.textContent = '等待同学打开…';
  reply.classList.remove('failed');
  answer.classList.remove('visible');
  button.textContent = '发到群里';
}

function resetAddressQuiz() {
  document.querySelectorAll('[data-address-kind]').forEach((button) => button.classList.remove('active'));
  document.querySelector('#addressResult').innerHTML =
    '<small>等待选择</small><strong>点击一个地址</strong><p>先判断地址性质，再讨论能不能从公网访问。</p>';
}

function resetDirection() {
  document.querySelectorAll('[data-direction]').forEach((button) => button.classList.remove('active', 'blocked'));
  document.querySelector('#directionResult').innerHTML =
    '<strong>先选择一个方向</strong><span>出站和入站走的是同一条物理网络，却受不同连接状态影响。</span>';
}

const osData = {
  web: ['常见首选', 'Linux', 'Ubuntu、Debian、Arch Linux 等，适合网站、API、数据库和容器。', 'SSH'],
  enterprise: ['常见选择', 'Windows Server', '适合 IIS、Active Directory、Windows 专用软件和部分企业 .NET 系统。', 'RDP / PowerShell'],
  apple: ['特定任务', 'macOS', '主要用于 iOS/macOS 编译、Xcode 自动化、Apple 平台签名和测试。', 'SSH / 屏幕共享'],
};

function selectOS(key) {
  const [kicker, title, text, access] = osData[key];
  document.querySelectorAll('[data-os]').forEach((button) => {
    button.classList.toggle('active', button.dataset.os === key);
  });
  document.querySelector('#osResult').innerHTML =
    `<small>${kicker}</small><strong>${title}</strong><p>${text}</p><div><span>管理入口</span><b>${access}</b></div>`;
}

const deploymentData = {
  static: ['Nginx / Caddy', '直接托管构建完成的静态文件；通常不需要独立应用运行时。'],
  node: ['Node.js 应用容器', '应用运行 Node.js；公网入口可使用 Nginx/Caddy，服务多时再考虑 Compose。'],
  python: ['Python + Gunicorn/Uvicorn', '根据 Flask、Django 或 FastAPI 选择应用服务器，前面通常增加反向代理。'],
  jar: ['JRE 应用容器', 'JAR 通常使用内置 HTTP 服务器，不需要额外部署外部 Tomcat。'],
  war: ['Tomcat 容器', 'WAR 交给外部 Servlet 容器运行，前面可增加 Nginx/Caddy。'],
};

function selectDeployment(key) {
  const [runtime, text] = deploymentData[key];
  document.querySelectorAll('[data-project]').forEach((button) => {
    button.classList.toggle('active', button.dataset.project === key);
  });
  const proxy = key === 'static' ? '公网静态入口' : 'Nginx / Caddy 反向代理';
  document.querySelector('#deploymentResult').innerHTML =
    `<small>推荐方案</small><strong>${runtime}</strong><b>＋</b><strong>${proxy}</strong><p>${text}</p>`;
}

const resetters = {
  'share-link': resetShareLink,
  'address-quiz': resetAddressQuiz,
  direction: resetDirection,
  'os-selector': () => selectOS('web'),
  'deployment-matcher': () => selectDeployment('jar'),
};

function resetSlide(slide) {
  slide.querySelectorAll('[data-reveal-group]').forEach(resetRevealGroup);
  const resetter = resetters[slide.dataset.reset];
  if (resetter) resetter();
}

function replayCurrentSlide() {
  const slide = slides[currentIndex];
  resetSlide(slide);
  slide.classList.remove('active');
  void slide.offsetWidth;
  slide.classList.add('active');
}

function showSlide(index, { updateHash = true } = {}) {
  const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
  slides[currentIndex]?.classList.remove('active');
  currentIndex = nextIndex;
  const slide = slides[currentIndex];
  slide.classList.add('active');
  resetSlide(slide);

  const title = slide.dataset.title || `第 ${currentIndex + 1} 页`;
  const progress = ((currentIndex + 1) / slides.length) * 100;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  progressBar.style.width = `${progress}%`;
  document.title = `${title}｜第8课`;

  if (updateHash) history.replaceState(null, '', `#slide-${currentIndex + 1}`);
  updateNotes();
  updateOverview();
}

function nextSlide() { showSlide(currentIndex + 1); }
function previousSlide() { showSlide(currentIndex - 1); }

function buildOverview() {
  const fragment = document.createDocumentFragment();
  slides.forEach((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    if (slide.classList.contains('appendix')) button.className = 'appendix-thumb';
    button.innerHTML = `<small>${String(index + 1).padStart(2, '0')}</small>${slide.dataset.title || '未命名页面'}`;
    button.addEventListener('click', () => {
      showSlide(index);
      overviewDialog.close();
    });
    fragment.appendChild(button);
  });
  overviewGrid.appendChild(fragment);
}

function openOverview() {
  if (!overviewDialog.open) overviewDialog.showModal();
  updateOverview();
}

function toggleNotes(force) {
  const open = typeof force === 'boolean' ? force : !notesPanel.classList.contains('open');
  notesPanel.classList.toggle('open', open);
  notesPanel.setAttribute('aria-hidden', String(!open));
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast('浏览器阻止了全屏，请使用静态服务器模式');
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  copyToast.textContent = message;
  copyToast.classList.add('visible');
  toastTimer = window.setTimeout(() => copyToast.classList.remove('visible'), 1800);
}

const promptLibrary = {
  ssh: `你是我的 SSH 配置教练。我想从自己的电脑安全连接一台 Linux 服务器，并配置基于 Ed25519 密钥的 SSH 登录。

请遵守以下要求：

1. 每次只给我一个操作步骤，先说明目的、将执行的命令和预期结果，然后等待我返回结果。
2. 开始时只收集非敏感信息：我的本机系统、服务器系统、服务器地址、SSH 端口和用户名。
3. 先检查我已有的 ~/.ssh 文件，不要覆盖现有密钥。
4. 为这台服务器创建一把用途明确的独立密钥；默认使用 Ed25519。
5. 私钥必须始终保存在本机。不要让我把私钥、服务器密码、密钥口令、Token 或完整配置文件粘贴给你。
6. 如果首次连接需要密码，由我直接在终端交互界面输入，不在聊天中发送。
7. 首次连接前，引导我通过云厂商控制台或其他可信渠道核对服务器主机指纹，不要让我盲目接受未知指纹。
8. 引导我把公钥安装到服务器的 authorized_keys，并检查 .ssh 目录和相关文件权限。
9. 默认使用普通用户，不要默认使用 root；如确实需要 sudo，先解释原因并等待我确认。
10. 在修改 sshd_config、关闭密码登录、调整防火墙或重启 SSH 服务之前，必须先在另一个终端中验证密钥登录成功，并告诉我回退方法。
11. 验证成功后，帮我在 ~/.ssh/config 中配置一个名为 course-server 的连接别名，使用独立密钥并启用 IdentitiesOnly。
12. 遇到错误时，根据当前输出逐项诊断，不要连续尝试高风险修改。
13. 如果输出可能包含公网 IP、用户名、主机名或其他不适合课堂投影的信息，提醒我先打码。

完成后请给我一份简短总结，说明私钥保存位置、已安装的公钥、以后怎样连接、怎样验证密钥认证，以及怎样撤销公钥。

现在请从收集非敏感信息开始。`,

  inspection: `我已经能够通过 SSH 连接 course-server。

请只执行只读命令，为这台服务器生成一份配置检查报告，包括：

- Linux 发行版、版本、内核和 CPU 架构
- CPU 型号和核心数量
- 内存和 Swap
- 磁盘、分区和剩余空间
- 网卡与 IP 地址
- 系统运行时间和当前负载
- 是否存在 GPU
- 已安装的 Python、Node.js、Git 和 Docker 版本
- 当前监听的端口和主要运行服务

请说明每条命令的用途，并用适合初学者的语言解释结果。不要安装软件、修改文件、开放端口、停止或重启服务。不要读取或输出密码、私钥、Token 或 .env 内容。任何需要写入或 sudo 的操作，都必须先征得我的同意。

最后判断这台服务器是否适合部署我们上一节课的代码，以及可能的 CPU、内存、磁盘或网络瓶颈。`,

  analysis: `你现在是我的服务器部署架构顾问。你已经可以通过 SSH 连接服务器，但暂时不要安装软件、修改文件、开放端口、重启服务或执行部署。

请分步骤检查服务器和项目，并为这个项目选择合适的运行环境、容器镜像和部署方式。每完成一个阶段，先汇报发现，再进入下一阶段。

一、检查项目
1. 确认项目目录和需要分析的 Git 分支或版本。
2. 只读取 README、package.json、锁文件、requirements.txt、pyproject.toml、pom.xml、build.gradle、Dockerfile、compose.yaml 等必要文件。
3. 不读取或输出 .env、私钥、Token、数据库密码；只列环境变量名称。
4. 判断项目类型、构建命令、启动命令、监听地址与端口、健康检查、存储、数据库、定时任务和 WebSocket 需求。
5. 检查现有 Dockerfile、Compose、systemd、Nginx、Caddy、Tomcat 或持续部署配置。

二、检查服务器
1. 只读检查系统、架构、CPU、内存、Swap、磁盘和负载。
2. 检查 Docker、Compose、Podman、Nginx、Caddy、Tomcat 和项目运行时。
3. 检查容器、监听端口和已有网站，识别冲突。
4. 不停止、重启、删除或覆盖现有服务。

三、比较方案
比较 systemd、单个 Docker、Docker Compose、Nginx/Caddy 静态托管、JRE 运行 Spring Boot JAR、Tomcat 运行 WAR，以及其他合适方式。不要为了容器而强行使用容器。

特别区分：Docker/Podman 是容器工具；Nginx/Caddy 常用于静态文件、HTTPS 和代理；Tomcat 用于 Java Servlet/WAR；Spring Boot 可执行 JAR 通常使用内置服务器；Compose 管理多个服务、网络和数据卷。

四、输出报告
用表格给出技术栈、构建与启动方式、推荐运行环境或镜像、是否需要代理、是否需要外部 Tomcat、是否需要 Compose、端口、持久化、资源、优缺点和风险。

最后只推荐一个首选方案和一个备选方案，并给出目标架构、预计修改文件、预计命令、验证方法、回退方法和仍需确认的问题。输出后停止，等待我确认，不要执行部署。`,

  deploy: `我已经阅读并确认了你刚才推荐的部署方案。请先复述我确认的方案；如果上下文中没有完整分析报告或仍有未确认事项，请停止并重新进入只读分析阶段，不要猜测。

确认方案后，请一步一步部署。每次只执行一个阶段，先说明目的、命令、影响和回退方法，然后等待我确认或返回结果。

部署前确认项目版本、域名或访问地址、内部与公开端口、数据库与存储、现有服务冲突、备份位置、验收地址和回退条件。

不要覆盖已有配置；修改前先备份。不要让我发送密码、私钥、Token、口令或 .env。未经确认，不修改 SSH，不关闭 SSH 端口，不删除容器、镜像、数据卷、数据库、网站或日志。sudo、安装、开放端口、重启现有服务或写入系统目录都要单独说明并等待确认。

如果使用 Docker/Podman：使用合适的官方基础镜像和明确版本；创建 .dockerignore；适合时使用多阶段构建；尽量非 root 运行；配置健康检查、重启策略和持久化；不把秘密写入镜像或仓库；数据库和管理端口默认不公开。

如果使用 Compose：明确内部网络、公开端口、数据卷、健康检查和服务依赖。使用 Nginx/Caddy 时优先只公开 80/443，应用端口尽量留在内部网络。

如果使用 Nginx/Caddy：保留其他网站配置，按需处理 WebSocket、上传大小、代理头和超时；域名正确后再配置 HTTPS；配置检查通过后再平滑加载。

如果使用 Java：可执行 JAR 优先使用 JRE；只有 WAR 或项目明确要求时才使用外部 Tomcat；设置合理 JVM 内存上限。

每阶段验证构建、镜像、服务状态、健康检查、内部访问、反向代理、公网 HTTPS、日志、重启策略和回退。如果失败，停止并诊断，不连续重启、删除数据、扩大权限或关闭防火墙。

完成后输出最终架构、修改文件、镜像版本、容器/端口/网络/数据卷、启停更新与日志命令、公网地址、更新方法、回退方法、备份恢复建议和剩余风险。

现在请先复述确认的方案和部署前检查清单，不要直接执行第一条写入命令。`,
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('copy failed');
  }
}

document.querySelectorAll('[data-reveal-next]').forEach((button) => {
  button.addEventListener('click', () => advanceRevealGroup(button.dataset.revealNext));
});

document.querySelector('#shareLink').addEventListener('click', () => {
  const reply = document.querySelector('#shareReply');
  const answer = document.querySelector('#shareAnswer');
  reply.textContent = '打不开：这里没有你的程序';
  reply.classList.add('failed');
  answer.classList.add('visible');
  document.querySelector('#shareLink').textContent = '重新演示';
});

const addressData = {
  private: ['RFC 1918 私网地址', 'RFC 1918 规定了192.168号段是专用于内网地址，只在局部网络中有意义，不是公网地址'],
  shared: ['运营商共享地址空间', '100.64.0.0/10 为 CGN 部署保留，由运营商负责运维，不是全球可路由公网地址。'],
  example: ['文档示例地址', '203.0.113.0/24 专门用于文档示例，不应当作真实公网服务器。'],
};

document.querySelectorAll('[data-address-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.addressKind;
    const [title, text] = addressData[key];
    document.querySelectorAll('[data-address-kind]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelector('#addressResult').innerHTML =
      `<small>判断结果</small><strong>${title}</strong><p>${text}</p>`;
  });
});

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => {
    const outbound = button.dataset.direction === 'outbound';
    document.querySelectorAll('[data-direction]').forEach((item) => {
      item.classList.remove('active', 'blocked');
      if (item === button) item.classList.add(outbound ? 'active' : 'blocked');
    });
    document.querySelector('#directionResult').innerHTML = outbound
      ? '<strong>出站可以建立连接</strong><span>家庭设备主动发起请求，NAT 为返回数据保留映射。</span>'
      : '<strong>入站没有明确映射</strong><span>公网请求不知道应该交给哪个家庭、哪台设备和哪个端口。</span>';
  });
});

document.querySelectorAll('[data-os]').forEach((button) => {
  button.addEventListener('click', () => selectOS(button.dataset.os));
});

document.querySelectorAll('[data-project]').forEach((button) => {
  button.addEventListener('click', () => selectDeployment(button.dataset.project));
});

document.querySelectorAll('[data-copy-prompt]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = promptLibrary[button.dataset.copyPrompt];
    if (!text) return;
    try {
      await copyText(text);
      showToast('已复制完整提示词');
    } catch {
      showToast('复制失败，请打开 TXT 文件');
    }
  });
});

document.querySelector('#prevSlide').addEventListener('click', previousSlide);
document.querySelector('#nextSlide').addEventListener('click', nextSlide);
document.querySelector('#openOverview').addEventListener('click', openOverview);
document.querySelector('#replayAnimation').addEventListener('click', replayCurrentSlide);
document.querySelector('#toggleNotes').addEventListener('click', () => toggleNotes());
document.querySelector('#toggleFullscreen').addEventListener('click', toggleFullscreen);
document.querySelector('#closeOverview').addEventListener('click', () => overviewDialog.close());
document.querySelector('#closeNotes').addEventListener('click', () => toggleNotes(false));

overviewDialog.addEventListener('click', (event) => {
  if (event.target === overviewDialog) overviewDialog.close();
});

window.addEventListener('hashchange', () => showSlide(indexFromHash(), { updateHash: false }));

window.addEventListener('keydown', (event) => {
  const tagName = document.activeElement?.tagName;
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
  const isButtonOrLink = ['BUTTON', 'A'].includes(tagName);

  if (event.key === 'Escape' && notesPanel.classList.contains('open')) {
    toggleNotes(false);
    return;
  }
  if (isTyping && event.key !== 'Escape') return;
  if (isButtonOrLink && event.key === ' ') return;

  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    nextSlide();
  } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    previousSlide();
  } else if (event.key === 'Home') {
    event.preventDefault();
    showSlide(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    showSlide(slides.length - 1);
  } else if (event.key.toLowerCase() === 'f') {
    toggleFullscreen();
  } else if (event.key.toLowerCase() === 'o') {
    openOverview();
  } else if (event.key.toLowerCase() === 'n') {
    toggleNotes();
  } else if (event.key.toLowerCase() === 'r') {
    replayCurrentSlide();
  } else if (event.key.toLowerCase() === 'a' && appendixIndex >= 0) {
    showSlide(appendixIndex);
  }
});

deck.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

deck.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY)) return;
  if (deltaX < 0) nextSlide();
  else previousSlide();
}, { passive: true });

buildOverview();
showSlide(indexFromHash(), { updateHash: !window.location.hash });
