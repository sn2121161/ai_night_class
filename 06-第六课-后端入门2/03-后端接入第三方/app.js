const deck = document.querySelector('#deck');
const sourceSlides = [...document.querySelectorAll('.slide')];
const slideOrder = [0, 1, 2, 8, 3, 9, 5, 6, 7, 10, 11, 14, 12, 13, 4, 15, 16];
const slides = slideOrder.map((index) => sourceSlides[index]);
const firstDeckControl = deck.querySelector('.deck-progress');
slides.forEach((slide) => deck.insertBefore(slide, firstDeckControl));
const progressBar = document.querySelector('#progressBar');
const slideCounter = document.querySelector('#slideCounter');
const overviewDialog = document.querySelector('#overviewDialog');
const overviewGrid = document.querySelector('#overviewGrid');
const notesPanel = document.querySelector('#notesPanel');
const notesContent = document.querySelector('#notesContent');
const appendixIndex = slides.findIndex((slide) => slide.classList.contains('appendix'));

let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let timers = [];

function later(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  timers.push(timer);
  return timer;
}

function clearTimers() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
}

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

function resetCurrentInteraction() {
  const resetName = slides[currentIndex].dataset.reset;
  const resetter = resetters[resetName];
  if (resetter) resetter();
}

function replayCurrentSlide() {
  clearTimers();
  resetCurrentInteraction();
  const slide = slides[currentIndex];
  slide.classList.remove('active');
  void slide.offsetWidth;
  slide.classList.add('active');
}

function showSlide(index, { updateHash = true } = {}) {
  clearTimers();
  const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
  slides[currentIndex]?.classList.remove('active');
  currentIndex = nextIndex;
  slides[currentIndex].classList.add('active');
  resetCurrentInteraction();

  const title = slides[currentIndex].dataset.title || `第 ${currentIndex + 1} 页`;
  const progress = ((currentIndex + 1) / slides.length) * 100;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  progressBar.style.width = `${progress}%`;
  document.title = `${title}｜第7课`;

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
  const nextState = typeof force === 'boolean' ? force : !notesPanel.classList.contains('open');
  notesPanel.classList.toggle('open', nextState);
  notesPanel.setAttribute('aria-hidden', String(!nextState));
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    // file:// pages can block fullscreen in some browsers; static-server mode is reliable.
  }
}

// API contract reveal.
const contractParts = [...document.querySelectorAll('[data-contract-step]')];
const contractStepLabel = document.querySelector('#contractStepLabel');
const contractStepTitle = document.querySelector('#contractStepTitle');
const contractStepText = document.querySelector('#contractStepText');
const contractEmpty = document.querySelector('#contractEmpty');
const contractExampleLabel = document.querySelector('#contractExampleLabel');
const contractExampleText = document.querySelector('#contractExampleText');
const nextContractStep = document.querySelector('#nextContractStep');
let contractStep = -1;
const contractCopy = [
  ['01 · 平台入口', '先创建第三方应用或机器人', '在飞书或企业微信开放平台创建应用，获得后端可以调用的消息入口。', '可选平台', '飞书 / 企业微信'],
  ['02 · 身份凭证', '让平台识别我们的后端', 'Webhook 地址、App ID、Secret 或 Token 只保存在自己的服务端。', '凭证位置', '仅服务端保存'],
  ['03 · 消息请求', '订单成功后，再组装消息', '把订单号、商品、金额和门店组成 JSON，由自己的后端发送。', '请求示例', 'POST message { orderId: 2048, amount: 299 }'],
  ['04 · 发送结果', '确认消息有没有送出去', '读取平台返回码；成功记录日志，失败进入重试，但不能把订单回滚。', '处理结果', 'ok → 已发送 / error → 记录并重试'],
  ['05 · 可选回调', '需要交互时，再接收平台回调', '纯提醒到发送结果即可；点击卡片或审批等操作才需要平台反向通知后端。', '交互示例', '点击“查看订单” → 自己的后端'],
];

function resetContract() {
  contractStep = -1;
  contractParts.forEach((part) => part.classList.remove('visible', 'current'));
  contractEmpty.classList.remove('is-hidden');
  contractStepLabel.textContent = '业务问题';
  contractStepTitle.textContent = '用户下单后，商家怎样第一时间知道？';
  contractStepText.textContent = '自己的后端要把“订单创建成功”转换成一条企业 IM 消息。';
  contractExampleLabel.textContent = '订单事件';
  contractExampleText.textContent = '等待连接消息平台';
  nextContractStep.textContent = '接通第一层';
}

nextContractStep.addEventListener('click', () => {
  if (contractStep === contractCopy.length - 1) {
    resetContract();
    return;
  }
  contractStep += 1;
  contractEmpty.classList.add('is-hidden');
  contractParts.forEach((part, index) => {
    part.classList.toggle('visible', index <= contractStep);
    part.classList.toggle('current', index === contractStep);
  });
  [contractStepLabel.textContent, contractStepTitle.textContent, contractStepText.textContent, contractExampleLabel.textContent, contractExampleText.textContent] = contractCopy[contractStep];
  nextContractStep.textContent = contractStep === contractCopy.length - 1 ? '重新开始' : '接通下一层';
});

// Platform explorer.
const platformButtons = [...document.querySelectorAll('[data-platform]')];
const platformKicker = document.querySelector('#platformKicker');
const platformTitle = document.querySelector('#platformTitle');
const platformText = document.querySelector('#platformText');
const platformUse = document.querySelector('#platformUse');
const platformData = {
  location: ['地图与位置', '高德 · 百度地图 · 腾讯位置服务', '提供地图展示、地址搜索、经纬度转换、路线规划与配送范围判断。', '门店地图 · 收货地址 · 配送路线'],
  weather: ['天气数据', '和风天气 · 高德天气', '提供实时天气、逐小时预报、空气质量和灾害预警等数据。', '配送提醒 · 到店天气 · 风险提示'],
  message: ['企业通信', '飞书 · 企业微信 · 钉钉', '通过机器人、群消息和消息卡片，把业务事件主动送到员工面前。', '新订单 · 库存预警 · 售后提醒'],
  payment: ['支付交易', '微信支付 · 支付宝 · 银联', '提供下单、收银、退款、回调和对账等交易能力。', '支付状态 · 退款 · 财务对账'],
  commerce: ['电商渠道', '淘宝 · 京东 · 抖音电商', '开放商品、库存、订单、发货和售后数据，连接多个销售渠道。', '渠道订单 · 多店铺 · 库存同步'],
  logistics: ['物流快递', '顺丰 · 菜鸟 · 快递100', '提供寄件下单、电子面单、运单查询、轨迹订阅和异常提醒。', '发货 · 物流时间轴 · 异常件'],
  cloud: ['云与 AI', 'OSS / COS · 百炼 · 千帆 · 混元', '提供文件存储、图片处理、OCR、内容生成、智能客服与内容审核。', '商品图片 · AI 客服 · 评论审核'],
};

function selectPlatform(key) {
  const [kicker, title, text, use] = platformData[key];
  platformButtons.forEach((button) => button.classList.toggle('active', button.dataset.platform === key));
  platformKicker.textContent = kicker;
  platformTitle.textContent = title;
  platformText.textContent = text;
  platformUse.textContent = use;
}

platformButtons.forEach((button) => button.addEventListener('click', () => selectPlatform(button.dataset.platform)));

// Mock map.
const mapPins = [...document.querySelectorAll('.map-pin')];
const storeName = document.querySelector('#storeName');
const storeAddress = document.querySelector('#storeAddress');
const storeDistance = document.querySelector('#storeDistance');
const storeHours = document.querySelector('#storeHours');
const storeAbility = document.querySelector('#storeAbility');
const storeData = {
  xinbei: ['新北体验店', '常州市新北区太湖东路 9 号', '2.4 km', '10:00–21:00', '到店自提 · 路线规划'],
  tianning: ['天宁旗舰店', '常州市天宁区延陵中路 88 号', '4.8 km', '09:30–22:00', '现货充足 · 当日配送'],
  wujin: ['武进仓储店', '常州市武进区湖塘镇广电中路 12 号', '8.1 km', '09:00–18:00', '仓库自提 · 大件配送'],
};

function selectStore(key) {
  const [name, address, distance, hours, ability] = storeData[key];
  mapPins.forEach((pin) => pin.classList.toggle('active', pin.dataset.store === key));
  storeName.textContent = name;
  storeAddress.textContent = address;
  storeDistance.textContent = distance;
  storeHours.textContent = hours;
  storeAbility.textContent = ability;
}

mapPins.forEach((pin) => pin.addEventListener('click', () => selectStore(pin.dataset.store)));

// Weather chained API reveal.
const weatherSteps = [...document.querySelectorAll('[data-weather-step]')];
const weatherArrows = [...document.querySelectorAll('#weatherFlow > i')];
const weatherResult = document.querySelector('#weatherResult');
const nextWeatherStep = document.querySelector('#nextWeatherStep');
let weatherStep = 0;
const weatherNextLabels = ['查询城市编码', '查询天气', '展示提醒'];

function resetWeather() {
  weatherStep = 0;
  weatherSteps.forEach((step, index) => {
    step.classList.toggle('visible', index === 0);
    step.classList.toggle('current', index === 0);
  });
  weatherArrows.forEach((arrow) => arrow.classList.remove('visible'));
  weatherResult.classList.remove('visible');
  nextWeatherStep.textContent = weatherNextLabels[0];
}

nextWeatherStep.addEventListener('click', () => {
  if (weatherStep === weatherSteps.length - 1) {
    resetWeather();
    return;
  }
  weatherStep += 1;
  weatherSteps.forEach((step, index) => {
    step.classList.toggle('visible', index <= weatherStep);
    step.classList.toggle('current', index === weatherStep);
  });
  weatherArrows.forEach((arrow, index) => arrow.classList.toggle('visible', index < weatherStep));
  if (weatherStep === weatherSteps.length - 1) {
    weatherResult.classList.add('visible');
    nextWeatherStep.textContent = '重新运行';
  } else {
    nextWeatherStep.textContent = weatherNextLabels[weatherStep];
  }
});

// Order-to-message demo.
const placeOrder = document.querySelector('#placeOrder');
const orderStages = [...document.querySelectorAll('[data-order-stage]')];
const notificationCard = document.querySelector('#notificationCard');
const orderDemoStatus = document.querySelector('#orderDemoStatus');

function resetOrderDemo() {
  clearTimers();
  orderStages.forEach((stage) => stage.classList.remove('active', 'done'));
  notificationCard.classList.remove('visible');
  orderDemoStatus.textContent = '等待下单';
  orderDemoStatus.classList.remove('success');
  placeOrder.disabled = false;
  placeOrder.textContent = '模拟下单';
}

placeOrder.addEventListener('click', () => {
  resetOrderDemo();
  placeOrder.disabled = true;
  placeOrder.textContent = '处理中…';
  const labels = ['前端正在提交 POST /orders', '后端校验数据库中的真实价格和库存', '订单 #2048 已保存，业务已经成功', '机器人 Webhook 已发送群提醒'];
  orderStages.forEach((stage, index) => {
    later(() => {
      orderStages.forEach((item, itemIndex) => {
        item.classList.toggle('active', itemIndex === index);
        if (itemIndex < index) item.classList.add('done');
      });
      orderDemoStatus.textContent = labels[index];
      if (index === orderStages.length - 1) {
        notificationCard.classList.add('visible');
        orderStages[index].classList.add('done');
        orderDemoStatus.classList.add('success');
        placeOrder.disabled = false;
        placeOrder.textContent = '再次演示';
      }
    }, index * 950);
  });
});

// Complete flow reveal.
const fullSteps = [...document.querySelectorAll('[data-full-step]')];
const nextFullStep = document.querySelector('#nextFullStep');
const fullFlowCaption = document.querySelector('#fullFlowCaption');
let fullStep = 0;
const fullCaptions = [
  '用户在前端选择门店，不直接决定订单是否成立。',
  '地图平台提供位置数据，可以替换，但要遵守平台合同。',
  '天气平台提供实时数据，后端可以缓存和兜底。',
  '自己的后端执行价格、库存和订单规则，是业务真相的入口。',
  '数据库保存订单，刷新页面后仍能查询。',
  '企业通信负责触达人；通知失败不应抹掉已经成功的订单。',
];

function resetFullFlow() {
  fullStep = 0;
  fullSteps.forEach((step, index) => {
    step.classList.toggle('visible', index === 0);
    step.classList.toggle('current', index === 0);
  });
  fullFlowCaption.textContent = fullCaptions[0];
  nextFullStep.textContent = '下一步';
}

nextFullStep.addEventListener('click', () => {
  if (fullStep === fullSteps.length - 1) {
    resetFullFlow();
    return;
  }
  fullStep += 1;
  fullSteps.forEach((step, index) => {
    step.classList.toggle('visible', index <= fullStep);
    step.classList.toggle('current', index === fullStep);
  });
  fullFlowCaption.textContent = fullCaptions[fullStep];
  nextFullStep.textContent = fullStep === fullSteps.length - 1 ? '重新开始' : '下一步';
});

// Admin UI mapping.
const adminButtons = [...document.querySelectorAll('[data-admin]')];
const adminKicker = document.querySelector('#adminKicker');
const adminTitle = document.querySelector('#adminTitle');
const adminVisual = document.querySelector('#adminVisual');
const adminText = document.querySelector('#adminText');
const adminData = {
  dashboard: ['首页仪表盘', '今天需要关注什么？', ['新订单 12', '雨天配送 3', '物流异常 1'], '地图、天气和通知把外部变化变成经营待办。'],
  orders: ['订单中心', '订单现在在哪里？', ['收货地图', '支付状态', '物流时间轴'], '把位置、支付和物流结果放进同一张订单详情。'],
  inventory: ['库存中心', '哪些商品需要处理？', ['可售库存', '预警阈值', '群提醒'], '库存低于阈值后，通过企业通信主动提醒负责人。'],
  system: ['系统管理', '第三方平台如何配置？', ['API Key', 'Webhook', '调用日志'], '集中管理凭证、开关、错误记录和重试结果。'],
};

function selectAdmin(key) {
  const [kicker, title, visuals, text] = adminData[key];
  adminButtons.forEach((button) => button.classList.toggle('active', button.dataset.admin === key));
  adminKicker.textContent = kicker;
  adminTitle.textContent = title;
  adminVisual.innerHTML = visuals.map((item) => `<span>${item}</span>`).join('');
  adminText.textContent = text;
}

adminButtons.forEach((button) => button.addEventListener('click', () => selectAdmin(button.dataset.admin)));

// Future platform comparison.
const futureButtons = [...document.querySelectorAll('[data-future]')];
const futureKicker = document.querySelector('#futureKicker');
const futureTitle = document.querySelector('#futureTitle');
const futureText = document.querySelector('#futureText');
const futureUse = document.querySelector('#futureUse');
const futureData = {
  taobao: ['电商渠道同步', '淘宝商品与订单进入自己的后台', '同步商品、库存、订单、发货与售后，让一个后台管理多个销售渠道。', '订单来源 · 渠道库存 · 多店铺看板'],
  sf: ['单一承运商深度能力', '直接向顺丰下单并管理运单', '接入寄件下单、电子面单、运单路由和配送服务，适合真实履约。', '发货操作 · 运单号 · 电子面单'],
  kuaidi: ['多快递聚合查询', '用一套接口展示多家物流轨迹', '根据运单查询或订阅物流状态，统一呈现运输时间轴与异常变化。', '物流时间轴 · 签收状态 · 异常提醒'],
};

function selectFuture(key) {
  const [kicker, title, text, use] = futureData[key];
  futureButtons.forEach((button) => button.classList.toggle('active', button.dataset.future === key));
  futureKicker.textContent = kicker;
  futureTitle.textContent = title;
  futureText.textContent = text;
  futureUse.textContent = use;
}

futureButtons.forEach((button) => button.addEventListener('click', () => selectFuture(button.dataset.future)));

const resetters = {
  'api-parts': resetContract,
  'platform-tabs': () => selectPlatform('location'),
  'map-demo': () => selectStore('xinbei'),
  'weather-flow': resetWeather,
  'order-demo': resetOrderDemo,
  'full-flow': resetFullFlow,
  'admin-tabs': () => selectAdmin('dashboard'),
  'future-tabs': () => selectFuture('taobao'),
};

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
