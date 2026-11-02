const deck = document.querySelector('#deck');
const slides = [...document.querySelectorAll('.slide')];
const progressBar = document.querySelector('#progressBar');
const slideCounter = document.querySelector('#slideCounter');
const overviewDialog = document.querySelector('#overviewDialog');
const overviewGrid = document.querySelector('#overviewGrid');
const notesPanel = document.querySelector('#notesPanel');
const notesContent = document.querySelector('#notesContent');
const copyToast = document.querySelector('#copyToast');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hasGsap = typeof window.gsap !== 'undefined';

let currentIndex = -1;
let touchStartX = 0;
let touchStartY = 0;
let toastTimer;
let animations = [];

function indexFromHash() {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  if (!match) return 0;
  return Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1));
}

function clearAnimations(slide) {
  animations.forEach((animation) => animation.kill());
  animations = [];
  if (!slide || !hasGsap) return;
  gsap.killTweensOf(slide);
  gsap.killTweensOf(slide.querySelectorAll('*'));
  gsap.set([slide, ...slide.querySelectorAll('[data-animate], .packing-tags span, .image-wrap, .wire, .run-box, .benefit-icon, .shop-front')], { clearProps: 'all' });
}

function playAmbientAnimations(slide) {
  if (!hasGsap || reduceMotion.matches) return;
  const index = slides.indexOf(slide);

  if (index === 0) {
    animations.push(gsap.to(slide.querySelector('#shopSign'), {
      rotation: 2,
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1,
    }));
  }

  if (index === 1) {
    const image = slide.querySelector('.image-wrap');
    const tags = slide.querySelectorAll('.packing-tags span');
    animations.push(gsap.fromTo(image,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 0.85, delay: 0.25, ease: 'power3.inOut', clearProps: 'clipPath' },
    ));
    animations.push(gsap.fromTo(tags,
      { y: -12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.13, delay: 0.9, ease: 'back.out(1.8)' },
    ));
    animations.push(gsap.to(tags, {
      y: -4,
      duration: 1.3,
      stagger: 0.18,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1.7,
    }));
  }

  if (index === 2) {
    animations.push(gsap.from(slide.querySelectorAll('.benefit-icon'), {
      rotation: -35,
      scale: 0.6,
      transformOrigin: '50% 50%',
      duration: 0.65,
      stagger: 0.1,
      delay: 0.25,
      ease: 'back.out(1.7)',
      clearProps: 'transform',
    }));
  }

  if (index === 3) {
    animations.push(gsap.fromTo(slide.querySelector('.wire'),
      { scaleY: 0 },
      { scaleY: 1, duration: 0.55, delay: 0.5, ease: 'power2.out' },
    ));
    const boxes = slide.querySelectorAll('.run-box');
    const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.4, delay: 1.2 });
    loop.to(boxes, { backgroundColor: 'rgba(49,87,213,0.2)', duration: 0.4, stagger: 0.12, ease: 'power2.out' })
      .to(boxes, { backgroundColor: 'rgba(49,87,213,0.07)', duration: 0.4, stagger: 0.12, ease: 'power2.inOut' });
    animations.push(loop);
  }

  if (index === 4) {
    animations.push(gsap.fromTo(slide.querySelector('.terminal-card code'),
      { opacity: 0.25 },
      { opacity: 1, duration: 0.75, delay: 0.55, ease: 'power2.out' },
    ));
  }
}

function animateSlide(slide, direction = 1) {
  if (!hasGsap || reduceMotion.matches) return;
  const items = slide.querySelectorAll('[data-animate]');
  const timeline = gsap.timeline();
  timeline.fromTo(slide,
    { autoAlpha: 0, x: direction * 32 },
    { autoAlpha: 1, x: 0, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,visibility,transform' },
  );
  timeline.from(items, {
    autoAlpha: 0,
    y: 24,
    duration: 0.5,
    stagger: 0.075,
    ease: 'power3.out',
    clearProps: 'opacity,visibility,transform',
  }, '-=0.12');
  animations.push(timeline);
  playAmbientAnimations(slide);
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

function showSlide(index, { updateHash = true, replay = false } = {}) {
  const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
  if (nextIndex === currentIndex && !replay) return;
  const previous = slides[currentIndex];
  const direction = currentIndex < 0 || nextIndex >= currentIndex ? 1 : -1;
  clearAnimations(previous);
  previous?.classList.remove('active');

  currentIndex = nextIndex;
  const slide = slides[currentIndex];
  slide.classList.add('active');
  animateSlide(slide, direction);

  const title = slide.dataset.title || `第 ${currentIndex + 1} 页`;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  progressBar.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
  document.title = `${title}｜第8课`;
  if (updateHash) history.replaceState(null, '', `#slide-${currentIndex + 1}`);
  updateNotes();
  updateOverview();
}

function nextSlide() { showSlide(currentIndex + 1); }
function previousSlide() { showSlide(currentIndex - 1); }
function replayCurrentSlide() { showSlide(currentIndex, { replay: true }); }

function buildOverview() {
  const fragment = document.createDocumentFragment();
  slides.forEach((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
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
    showToast('浏览器阻止了全屏，请使用浏览器的全屏功能');
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  copyToast.textContent = message;
  copyToast.classList.add('visible');
  toastTimer = window.setTimeout(() => copyToast.classList.remove('visible'), 1800);
}

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

document.querySelector('#copyDemoPrompt').addEventListener('click', async () => {
  try {
    await copyText(document.querySelector('#demoPrompt').textContent.trim());
    showToast('已复制完整提示词');
  } catch {
    showToast('复制失败，请手动选择提示词');
  }
});

const shopDemo = document.querySelector('#shopDemo');
const demoSwitch = document.querySelector('#demoSwitch');
demoSwitch.addEventListener('click', () => {
  const isLive = shopDemo.classList.toggle('is-live');
  demoSwitch.setAttribute('aria-checked', String(!isLive));
  document.querySelector('#demoValue').textContent = `DEMO_MODE=${!isLive}`;
  document.querySelector('#demoModeLabel').textContent = isLive ? '正式运行 LIVE' : '演示模式 ON';
  document.querySelector('#shopSign').textContent = isLive ? '正常营业' : '试营业展示';
  if (hasGsap && !reduceMotion.matches) {
    gsap.fromTo('.shop-front', { scale: 0.96 }, { scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform' });
    gsap.fromTo('.prompt-flow span', { opacity: 0.45 }, { opacity: 1, duration: 0.3, stagger: 0.06, clearProps: 'opacity' });
  }
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
  if (overviewDialog.open || (isTyping && event.key !== 'Escape')) return;
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

reduceMotion.addEventListener('change', () => replayCurrentSlide());

buildOverview();
showSlide(indexFromHash(), { updateHash: !window.location.hash });
