## /public/script.js

```js
// --- STATE ---
let score = 0;
let currentQuestionIndex = 0;
let quizData = []; // Filled at runtime
let thunderTimer = null;

// --- DOM ---
const startBtn = document.getElementById('start-btn');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const resultEl = document.getElementById('result');
const progressEl = document.getElementById('progress');
const lightningOverlay = document.getElementById('lightning-overlay');
const sfxToggle = document.getElementById('sfx-toggle');
const flashToggle = document.getElementById('flash-toggle');
let audioPreloaded = false;

startBtn.addEventListener('click', startQuiz);

// Restore user prefs
const PREFS_KEY = 'haunted_prefs_v1';
const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
if (typeof prefs.sfxEnabled === 'boolean') sfxToggle.checked = prefs.sfxEnabled;
if (typeof prefs.flashEnabled === 'boolean') flashToggle.checked = prefs.flashEnabled;

[sfxToggle, flashToggle].forEach(el => el.addEventListener('change', () => {
  const newPrefs = { sfxEnabled: sfxToggle.checked, flashEnabled: flashToggle.checked };
  localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
}));

// Preload sounds quietly after page load/idle for smooth first play
window.addEventListener('load', () => {
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 500));
  idle(() => preloadAudio());
});
}));

// --- UTIL ---
const shuffle = (arr) => arr.map(v => [Math.random(), v])
  .sort((a,b) => a[0]-b[0])
  .map(([,v]) => v);

function updateProgress() {
  if (!quizData.length) return;
  const total = quizData.length;
  progressEl.textContent = `Question ${Math.min(currentQuestionIndex + 1, total)} / ${total}`;
}

function setLoading(isLoading) {
  startBtn.disabled = isLoading;
  startBtn.classList.toggle('loading', isLoading);
}

// --- SFX ---
const audio = {
  enabled: () => sfxToggle.checked,
  pool: {},
  play(name, { volume = 0.9 } = {}) {
    if (!this.enabled()) return;
    let el;
    if (Array.isArray(this.pool[name])) {
      el = this.pool[name][Math.floor(Math.random() * this.pool[name].length)].cloneNode();
    } else {
      el = this.pool[name]?.cloneNode();
    }
    if (!el) return;
    el.volume = volume;
    el.play().catch(() => {});
  }
};

function initAudio() {
  // Try multiple extensions to support .mp3, .wav, .aiff
  function sound(pathBase, exts = ['.mp3', '.wav', '.aiff']) {
    for (const ext of exts) {
      try {
        const audio = new Audio(`${pathBase}${ext}`);
        if (audio) return audio;
      } catch {}
    }
    return null;
  }

  audio.pool.click = sound('/public/sfx/click');
  audio.pool.correct = sound('/public/sfx/correct');
  audio.pool.wrong = sound('/public/sfx/wrong');
  audio.pool.victory = sound('/public/sfx/victory');
  audio.pool.thunder = [sound('/public/sfx/thunder1'), sound('/public/sfx/thunder2')];
}

function preloadAudio() {
  if (audioPreloaded) return;
  if (!audio.pool.click) initAudio();
  const list = [
    audio.pool.click,
    audio.pool.correct,
    audio.pool.wrong,
    audio.pool.victory,
    ...(Array.isArray(audio.pool.thunder) ? audio.pool.thunder : [audio.pool.thunder])
  ].filter(Boolean);

  for (const el of list) {
    try {
      el.preload = 'auto';
      // Ensure the browser starts fetching
      el.load();
    } catch {}
  }
  audioPreloaded = true;
}
    }
    return null;
  }

  audio.pool.click = sound('/public/sfx/click');
  audio.pool.correct = sound('/public/sfx/correct');
  audio.pool.wrong = sound('/public/sfx/wrong');
  audio.pool.victory = sound('/public/sfx/victory');
  audio.pool.thunder = [sound('/public/sfx/thunder1'), sound('/public/sfx/thunder2')];
}

function scheduleAtmosphericThunder() {
  clearTimeout(thunderTimer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minMs = 10000, maxMs = 20000;
  const next = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  thunderTimer = setTimeout(() => {
    if (!document.hidden) {
      if (!reduced && flashToggle.checked) lightningFlash();
      audio.play('thunder', { volume: 0.65 });
    }
    scheduleAtmosphericThunder();
  }, next);
}

function cancelAtmosphericThunder() { clearTimeout(thunderTimer); }

function lightningFlash() {
  if (!flashToggle.checked) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  lightningOverlay.classList.remove('flash');
  void lightningOverlay.offsetWidth;
  lightningOverlay.classList.add('flash');
}

// --- CORE ---
async function startQuiz() {
  if (!audio.pool.click) initAudio();
  audio.play('click', { volume: 0.5 });

  score = 0;
  currentQuestionIndex = 0;
  resultEl.classList.add('hidden');
  startBtn.classList.add('hidden');
  setLoading(true);

  questionEl.textContent = 'Summoning the spirits… please wait…';
  optionsEl.innerHTML = '';
  progressEl.textContent = '';

  const API_URL = '/api/generate-questions';
  const FALLBACK_URL = '/public/data/sample-questions.json';

  try {
    const res = await fetch(API_URL, { method: 'POST' });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    quizData = Array.isArray(data) ? data : (data?.questions || []);
    if (!quizData.length) throw new Error('No questions returned');
  } catch (err) {
    console.warn('API failed, using fallback sample JSON:', err);
    const res = await fetch(FALLBACK_URL);
    quizData = await res.json();
  } finally {
    setLoading(false);
  }

  quizData = quizData.map(q => ({
    question: String(q.question || '').trim(),
    options: shuffle([...(q.options || [])].slice(0,4)),
    answer: String(q.answer || '').trim(),
  })).slice(0, 10);

  if (!quizData.length) {
    questionEl.textContent = '💀 Failed to summon questions. Try again later.';
    startBtn.textContent = 'Try Again';
    startBtn.classList.remove('hidden');
    return;
  }

  scheduleAtmosphericThunder();
  renderQuestion(quizData[currentQuestionIndex]);
}

function renderQuestion(q) {
  updateProgress();
  questionEl.textContent = q ? `Question ${currentQuestionIndex + 1}/${quizData.length}: ${q.question}` : '';
  optionsEl.innerHTML = '';

  (q.options || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.dataset.correct = (opt === q.answer);
    btn.setAttribute('aria-label', `Answer ${i+1}: ${opt}`);
    btn.addEventListener('click', handleAnswerClick);
    btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') btn.click(); });
    optionsEl.appendChild(btn);
  });

  const first = optionsEl.querySelector('button');
  if (first) first.focus();
}

function handleAnswerClick(e) {
  const selectedBtn = e.currentTarget;
  const isCorrect = selectedBtn.dataset.correct === 'true';

  Array.from(optionsEl.children).forEach(btn => btn.disabled = true);

  if (isCorrect) {
    score++;
    selectedBtn.classList.add('correct');
    audio.play('correct', { volume: 0.9 });
    if (Math.random() < 0.25) lightningFlash();
  } else {
    selectedBtn.classList.add('incorrect');
    const correctEl = Array.from(optionsEl.children).find(b => b.dataset.correct === 'true');
    if (correctEl) correctEl.classList.add('reveal');
    audio.play('wrong', { volume: 0.8 });
  }

  setTimeout(advanceQuiz, 800);
}

function advanceQuiz() {
  currentQuestionIndex++;
  if (currentQuestionIndex < quizData.length) {
    renderQuestion(quizData[currentQuestionIndex]);
  } else {
    showResult();
  }
}

function showResult() {
  questionEl.textContent = '';
  optionsEl.innerHTML = '';

  const total = quizData.length;
  let message = '';
  if (score === total) message = '👑 Monster Mash Monarch! A perfect haul!';
  else if (score >= 0.7 * total) message = '🎃 Pumpkin Master! Massive candy haul.';
  else if (score >= 0.4 * total) message = '👻 Ghostly Good! You survived the night.';
  else message = '💀 Better luck next haunt! The witches turned you into a toad.';

  resultEl.innerHTML = `<h2>Your Score: ${score}/${total}</h2><p>${message}</p>`;
  resultEl.classList.remove('hidden');

  audio.play('victory', { volume: 0.9 });
  cancelAtmosphericThunder();

  startBtn.textContent = 'Play Again';
  startBtn.classList.remove('hidden');
  startBtn.disabled = false;
}
```
