const slides = [...document.querySelectorAll('.slide')];
const deck = document.querySelector('#deck');
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
let interactionTimers = [];

function indexFromHash() {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  if (!match) return 0;
  return Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1));
}

function clearInteractionTimers() {
  interactionTimers.forEach((timer) => window.clearTimeout(timer));
  interactionTimers = [];
}

function later(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  interactionTimers.push(timer);
  return timer;
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

function replayCurrentSlide() {
  const slide = slides[currentIndex];
  slide.classList.remove('active');
  void slide.offsetWidth;
  slide.classList.add('active');
}

function showSlide(index, { updateHash = true } = {}) {
  clearInteractionTimers();
  const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
  slides[currentIndex]?.classList.remove('active');
  currentIndex = nextIndex;
  slides[currentIndex].classList.add('active');

  const title = slides[currentIndex].dataset.title || `第 ${currentIndex + 1} 页`;
  const progress = ((currentIndex + 1) / slides.length) * 100;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  progressBar.style.width = `${progress}%`;
  document.title = `${title}｜第5课`;

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
    button.className = slide.classList.contains('appendix') ? 'appendix-thumb' : '';
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
    // Some browsers block fullscreen for file:// pages. Static-server mode works reliably.
  }
}

document.querySelector('#prevSlide').addEventListener('click', previousSlide);
document.querySelector('#nextSlide').addEventListener('click', nextSlide);
document.querySelector('#openOverview').addEventListener('click', openOverview);
document.querySelector('#replayAnimation').addEventListener('click', replayCurrentSlide);
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

// API phone-call demo.
const phoneDemo = document.querySelector('#phoneDemo');
const callApiButton = document.querySelector('#callApi');
const callPacket = document.querySelector('#callPacket');
const callStatus = document.querySelector('#callStatus');

callApiButton.addEventListener('click', () => {
  clearInteractionTimers();
  phoneDemo.classList.remove('calling');
  void phoneDemo.offsetWidth;
  phoneDemo.classList.add('calling');
  callApiButton.disabled = true;
  callPacket.textContent = 'POST /api/products';
  callStatus.textContent = '接通中…';

  later(() => { callPacket.textContent = 'JSON：商品数据'; callStatus.textContent = '验证请求内容'; }, 950);
  later(() => { callPacket.textContent = 'DB：保存商品'; callStatus.textContent = '执行固定 SOP'; }, 1850);
  later(() => { callPacket.textContent = '201 Created'; callStatus.textContent = '已回复：发布成功'; }, 2850);
  later(() => { callApiButton.disabled = false; phoneDemo.classList.remove('calling'); }, 3900);
});

// Tampered-price demo.
const clientPrice = document.querySelector('#clientPrice');
const submitOrder = document.querySelector('#submitOrder');
const priceVerdict = document.querySelector('#priceVerdict');
const trustedPrice = document.querySelector('.trusted-price');

submitOrder.addEventListener('click', () => {
  const submitted = Number(clientPrice.value);
  trustedPrice.classList.remove('rejected');
  void trustedPrice.offsetWidth;
  trustedPrice.classList.add('rejected');

  if (submitted === 299) {
    priceVerdict.textContent = '价格一致，后端按 ¥299 下单';
  } else {
    priceVerdict.textContent = `拒绝前端价格 ¥${Number.isFinite(submitted) ? submitted : 0}，按 ¥299 重新计算`;
  }
});

// End-to-end request animation.
const flowSteps = [...document.querySelectorAll('[data-flow-step]')];
const runFlow = document.querySelector('#runFlow');
const flowResult = document.querySelector('#flowResult');

runFlow.addEventListener('click', () => {
  clearInteractionTimers();
  runFlow.disabled = true;
  flowSteps.forEach((step) => step.classList.remove('processing', 'done'));
  flowResult.className = 'flow-result';
  flowResult.innerHTML = '<span>●</span> 请求已发出';

  flowSteps.forEach((step, index) => {
    later(() => {
      flowSteps.forEach((item) => item.classList.remove('processing'));
      step.classList.add('processing');
      if (index > 0) flowSteps[index - 1].classList.add('done');
    }, index * 760);
  });

  later(() => {
    flowSteps.forEach((step) => {
      step.classList.remove('processing');
      step.classList.add('done');
    });
    flowResult.className = 'flow-result success';
    flowResult.innerHTML = '<span>●</span> 商品 #24 已发布，前端列表已更新';
    runFlow.disabled = false;
  }, flowSteps.length * 760);
});

// Frontend/backend/database sorting quiz.
const answerNames = {
  frontend: '前端：展示与交互',
  backend: '后端：信任与业务规则',
  database: '数据库：持久保存',
};

document.querySelectorAll('#sortingQuiz button').forEach((button) => {
  const original = button.querySelector('b').textContent;
  button.dataset.originalLabel = original;
  button.addEventListener('click', () => {
    const isRevealed = button.classList.toggle('revealed');
    button.querySelector('b').textContent = isRevealed
      ? answerNames[button.dataset.answer]
      : button.dataset.originalLabel;
  });
});

buildOverview();
showSlide(indexFromHash(), { updateHash: !window.location.hash });
