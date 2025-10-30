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

// Guard against missing optional controls (older HTML)
const hasSfxToggle = !!sfxToggle;
const hasFlashToggle = !!flashToggle;

startBtn.addEventListener('click', startQuiz);

// Restore user prefs
const PREFS_KEY = 'haunted_prefs_v1';
const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
if (hasSfxToggle && typeof prefs.sfxEnabled === 'boolean') sfxToggle.checked = prefs.sfxEnabled;
if (hasFlashToggle && typeof prefs.flashEnabled === 'boolean') flashToggle.checked = prefs.flashEnabled;

if (hasSfxToggle) {
  sfxToggle.addEventListener('change', () => {
    const newPrefs = { sfxEnabled: sfxToggle.checked, flashEnabled: hasFlashToggle ? flashToggle.checked : true };
    localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
  });
}
if (hasFlashToggle) {
  flashToggle.addEventListener('change', () => {
    const newPrefs = { sfxEnabled: hasSfxToggle ? sfxToggle.checked : true, flashEnabled: flashToggle.checked };
    localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
  });
}
if (typeof prefs.sfxEnabled === 'boolean') sfxToggle.checked = prefs.sfxEnabled;
if (typeof prefs.flashEnabled === 'boolean') flashToggle.checked = prefs.flashEnabled;

[sfxToggle, flashToggle].forEach(el => el.addEventListener('change', () => {
  const newPrefs = { sfxEnabled: sfxToggle.checked, flashEnabled: flashToggle.checked };
  localStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
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
  enabled: () => (hasSfxToggle ? (sfxToggle?.checked ?? true) : true),
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
  audio.pool.click = new Audio("/public/sfx/click.mp3.wav");
  audio.pool.correct = new Audio("/public/sfx/correct.mp3.wav");
  audio.pool.wrong = new Audio("/public/sfx/wrong.mp3.mp3");
  audio.pool.victory = new Audio("/public/sfx/victory.mp3.wav");
  audio.pool.thunder = [
    new Audio("/public/sfx/thunder1.mp3.wav"),
    new Audio("/public/sfx/thunder2.mp3.aiff"),
  ];
}

function scheduleAtmosphericThunder() {
  clearTimeout(thunderTimer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minMs = 10000, maxMs = 20000;
  const next = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  thunderTimer = setTimeout(() => {
    if (!document.hidden) {
      if (!reduced && (hasFlashToggle ? flashToggle.checked : true)) lightningFlash();
      audio.play('thunder', { volume: 0.65 });
    }
    scheduleAtmosphericThunder();
  }, next);
}

function cancelAtmosphericThunder() { clearTimeout(thunderTimer); }

function lightningFlash() {
  if (hasFlashToggle && !flashToggle.checked) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!lightningOverlay) return;
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
