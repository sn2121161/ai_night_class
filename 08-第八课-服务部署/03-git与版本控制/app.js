const slides = [...document.querySelectorAll('.slide')];
const deck = document.querySelector('#deck');
const progressBar = document.querySelector('#progressBar');
const slideCounter = document.querySelector('#slideCounter');
const overviewDialog = document.querySelector('#overviewDialog');
const overviewGrid = document.querySelector('#overviewGrid');
const notesPanel = document.querySelector('#notesPanel');
const notesContent = document.querySelector('#notesContent');

let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;

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

function replayCurrentSlide() {
  const slide = slides[currentIndex];
  if (slide.querySelector('#commitDemo')) resetCommitDemo();
  if (slide.querySelector('#branchDemo')) resetBranchDemo();
  slide.classList.remove('active');
  void slide.offsetWidth;
  slide.classList.add('active');
}

function showSlide(index, { updateHash = true } = {}) {
  const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
  slides[currentIndex]?.classList.remove('active');
  currentIndex = nextIndex;
  slides[currentIndex].classList.add('active');

  const title = slides[currentIndex].dataset.title || `第 ${currentIndex + 1} 页`;
  const progress = ((currentIndex + 1) / slides.length) * 100;
  slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  progressBar.style.width = `${progress}%`;
  document.title = `${title}｜Git × AI`;

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
    // file:// 模式下部分浏览器会阻止全屏，导航与内容不受影响。
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

const commitDemo = document.querySelector('#commitDemo');
const demoAdd = document.querySelector('#demoAdd');
const demoCommit = document.querySelector('#demoCommit');
const demoReset = document.querySelector('#demoReset');
const stageFiles = document.querySelector('#stageFiles');
const commitFeedback = document.querySelector('#commitFeedback');

function resetCommitDemo() {
  commitDemo.dataset.state = 'working';
  demoAdd.disabled = false;
  demoCommit.disabled = true;
  stageFiles.textContent = '等待 git add';
  commitFeedback.innerHTML = '先点 <code>git add</code>，把这次要保存的改动放进暂存区。';
}

demoAdd.addEventListener('click', () => {
  if (commitDemo.dataset.state !== 'working') return;
  commitDemo.dataset.state = 'staged';
  demoAdd.disabled = true;
  demoCommit.disabled = false;
  stageFiles.textContent = 'README.md · login.js';
  commitFeedback.innerHTML = '暂存完成：现在点 <code>git commit</code>，时间线上才会出现新节点。';
});

demoCommit.addEventListener('click', () => {
  if (commitDemo.dataset.state !== 'staged') return;
  commitDemo.dataset.state = 'committed';
  demoCommit.disabled = true;
  stageFiles.textContent = '已保存为 C3';
  commitFeedback.innerHTML = '完成：C3 已写入本地历史；这时还没有上传到 GitHub。';
});

demoReset.addEventListener('click', resetCommitDemo);

const branchDemo = document.querySelector('#branchDemo');
const branchCreateButton = document.querySelector('#branchCreateButton');
const branchSwitchButton = document.querySelector('#branchSwitchButton');
const branchCommitButton = document.querySelector('#branchCommitButton');
const branchPointer = document.querySelector('#branchPointer');
const branchFeedback = document.querySelector('#branchFeedback');
const resetBranchButton = document.querySelector('#resetBranchButton');

function resetBranchDemo() {
  branchDemo.dataset.state = 'main';
  branchCreateButton.disabled = false;
  branchSwitchButton.disabled = true;
  branchCommitButton.disabled = true;
  branchPointer.textContent = 'feature-login（未切换）';
  branchFeedback.textContent = '先创建分支指针；这一步不会切换，也不会产生新 Commit。';
  resetBranchButton.hidden = true;
}

branchCreateButton.addEventListener('click', () => {
  if (branchDemo.dataset.state !== 'main') return;
  branchDemo.dataset.state = 'branched';
  branchCreateButton.disabled = true;
  branchSwitchButton.disabled = false;
  branchFeedback.textContent = '分支指针已经建在当前 C3，但 HEAD 仍在 main；下一步再切换。';
  resetBranchButton.hidden = false;
});

branchSwitchButton.addEventListener('click', () => {
  if (branchDemo.dataset.state !== 'branched') return;
  branchDemo.dataset.state = 'switched';
  branchSwitchButton.disabled = true;
  branchCommitButton.disabled = false;
  branchPointer.textContent = 'HEAD → feature-login';
  branchFeedback.textContent = '已经切到 feature-login；历史还没分叉，因为尚未产生新 Commit。';
});

branchCommitButton.addEventListener('click', () => {
  if (branchDemo.dataset.state !== 'switched') return;
  branchDemo.dataset.state = 'committed';
  branchCommitButton.disabled = true;
  branchFeedback.textContent = 'F1、F2 属于 feature-login；main 仍可独立 Commit，并分别 Push 到各自远程分支。';
  resetBranchButton.hidden = false;
});

resetBranchButton.addEventListener('click', resetBranchDemo);

const challengeResult = document.querySelector('#challengeResult');
document.querySelectorAll('#challenge button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('#challenge button').forEach((item) => {
      item.classList.remove('chosen', 'correct', 'wrong');
    });

    const isCorrect = button.dataset.correct === 'true';
    button.classList.add('chosen', isCorrect ? 'correct' : 'wrong');
    challengeResult.className = `challenge-result ${isCorrect ? 'success' : 'danger'}`;
    challengeResult.textContent = isCorrect
      ? '正确：先用 git status 看清现场，再决定是否建分支和让 AI 修改。'
      : '先别动手：运行 git status，确认当前分支和未提交改动。';
  });
});

buildOverview();
showSlide(indexFromHash(), { updateHash: !window.location.hash });
