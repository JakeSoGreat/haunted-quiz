/* 
  === Hack or Treat Quiz - SPA with SFX Integration ===
  Merges SPA functionality with audio effects and visual animations
*/

/* ---------- Global state ---------- */
let questions = [];
let currentIndex = 0;
let score = 0;
let totalQuestions = 10;
let timeLeft = 120;
let timerInterval = null;

/* ---------- DOM Elements ---------- */
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const questionContainer = document.getElementById('questionContainer');
const resultSection = document.getElementById('result');
const finalScoreEl = document.getElementById('finalScore');
const quizSection = document.getElementById('quiz');

/* ---------- SFX and Visual Effects Elements ---------- */
const lightningOverlay = document.getElementById('lightning-overlay');
const sfxToggle = document.getElementById('sfx-toggle');
const flashToggle = document.getElementById('flash-toggle');
let thunderTimer = null;

const hasSfxToggle = !!sfxToggle;
const hasFlashToggle = !!flashToggle;

/* ---------- Audio System ---------- */
const audio = {
  enabled: () => (hasSfxToggle ? sfxToggle?.checked ?? true : true),
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
  },
};

function initAudio() {
  audio.pool.click = new Audio('./sfx/click.mp3.wav');
  audio.pool.correct = new Audio('./sfx/correct.mp3.wav');
  audio.pool.wrong = new Audio('./sfx/wrong.mp3.mp3');
  audio.pool.victory = new Audio('./sfx/victory.mp3.wav');
  audio.pool.thunder = [
    new Audio('./sfx/thunder1.mp3.wav'),
    new Audio('./sfx/thunder2.mp3.aiff'),
  ];
}

/* ---------- Atmospheric Thunder System ---------- */
function scheduleAtmosphericThunder() {
  clearTimeout(thunderTimer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minMs = 10000, maxMs = 20000;
  const next = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  
  thunderTimer = setTimeout(() => {
    if (!document.hidden) {
      if (!reduced && (hasFlashToggle ? flashToggle.checked : true)) {
        lightningFlash();
      }
      audio.play('thunder', { volume: 0.65 });
    }
    scheduleAtmosphericThunder();
  }, next);
}

function cancelAtmosphericThunder() {
  clearTimeout(thunderTimer);
}

function lightningFlash() {
  if (hasFlashToggle && !flashToggle.checked) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!lightningOverlay) return;
  
  lightningOverlay.classList.remove('flash');
  void lightningOverlay.offsetWidth; // Force reflow
  lightningOverlay.classList.add('flash');
}

/* ---------- SPA Navigation Helper ---------- */
function showPage(id) {
  const pages = document.querySelectorAll('.page');
  if (!pages || pages.length === 0) return;
  
  pages.forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('active');
  });
  
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

/* ---------- Load Questions ---------- */
async function loadQuestions() {
  // TOGGLE FOR TESTING vs PRODUCTION
  const IS_TESTING = true; // Set to false before deploying
  
  const url = IS_TESTING 
    ? './generate-question.json'  // Mock data
    : '/api/generate-question';   // Production endpoint
  
  const options = IS_TESTING 
    ? {} 
    : { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' } 
      };

  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
    
    questions = await res.json();
    totalQuestions = Array.isArray(questions) && questions.length ? questions.length : 10;
  } catch (err) {
    console.error('loadQuestions error:', err);
    questions = [];
    totalQuestions = 0;
    throw err; // Re-throw to handle in startQuiz
  }
}

/* ---------- Score & Timer ---------- */
function updateScoreDisplay() {
  if (scoreDisplay) {
    scoreDisplay.textContent = `Score: ${score}/${totalQuestions}`;
  }
}

function startTimer(initial = 120) {
  if (!timerDisplay) return;
  
  clearInterval(timerInterval);
  timeLeft = initial;
  timerDisplay.textContent = `⏱️ ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `⏱️ ${timeLeft}s`;

    if (timeLeft <= 10) {
      timerDisplay.style.color = (timeLeft % 2) ? '#ff0000' : '#ff6666';
    } else {
      timerDisplay.style.color = '';
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endQuiz();
    }
  }, 1000);
}

/* ---------- Render Question ---------- */
function renderQuestion(q) {
  if (!q) {
    endQuiz();
    return;
  }

  if (questionContainer) {
    questionContainer.innerHTML = `
      <div class="quiz-card">
        <h3>${escapeHtml(q.question)}</h3>
        <div class="options">
          ${(q.options || []).map((opt, i) => 
            `<button class="option-btn" onclick="checkAnswer(${i})">${escapeHtml(opt)}</button>`
          ).join('')}
        </div>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- Answer Checking ---------- */
window.checkAnswer = function(selectedIndex) {
  const q = questions[currentIndex];
  if (!q) return;

  // Find correct answer
  let correctIdx = -1;
  if (typeof q.correctIndex === 'number') {
    correctIdx = q.correctIndex;
  } else if (typeof q.answer === 'string') {
    correctIdx = (q.options || []).indexOf(q.answer);
  }

  // Get all option buttons
  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => btn.disabled = true);

  const isCorrect = selectedIndex === correctIdx;
  
  if (isCorrect) {
    score++;
    updateScoreDisplay();
    buttons[selectedIndex].style.backgroundColor = 'var(--green-color)';
    audio.play('correct', { volume: 0.9 });
  } else {
    buttons[selectedIndex].style.backgroundColor = 'var(--orange-color)';
    if (correctIdx >= 0 && buttons[correctIdx]) {
      buttons[correctIdx].style.border = '2px solid var(--green-color)';
    }
    audio.play('wrong', { volume: 0.8 });
  }

  // Advance after delay
  setTimeout(advanceQuiz, 800);
};

/* ---------- Advance Quiz ---------- */
function advanceQuiz() {
  // Exit animation
  if (quizSection) {
    quizSection.classList.remove('transition-in');
    quizSection.classList.add('transition-out');
  }

  const proceed = () => {
    currentIndex++;

    if (currentIndex < totalQuestions && questions[currentIndex]) {
      renderQuestion(questions[currentIndex]);

      // Entrance animation
      requestAnimationFrame(() => {
        if (quizSection) {
          quizSection.classList.remove('transition-out');
          quizSection.classList.add('transition-in');
        }
      });
    } else {
      if (quizSection) {
        quizSection.classList.remove('transition-out', 'transition-in');
      }
      endQuiz();
    }
  };

  // Wait for animation or proceed immediately
  if (quizSection && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    quizSection.addEventListener('animationend', proceed, { once: true });
  } else {
    proceed();
  }
}

/* ---------- End Quiz ---------- */
function endQuiz() {
  clearInterval(timerInterval);
  cancelAtmosphericThunder();

  let message = '';
  if (score === totalQuestions) {
    message = '👑 Monster Mash King/Queen! A perfect 10/10 haul!';
  } else if (score >= 7) {
    message = '🎃 Pumpkin Master! You earned a massive candy haul.';
  } else if (score >= 4) {
    message = '👻 Ghostly Good! You survived the night with a few scares.';
  } else {
    message = '💀 Better luck next haunt! The witches turned you into a toad.';
  }

  if (finalScoreEl) {
    finalScoreEl.innerHTML = `
      <h2>Your Score: ${score}/${totalQuestions}</h2>
      <p>${message}</p>
    `;
  }

  audio.play('victory', { volume: 0.9 });

  showPage('result');
}

/* ---------- Start Quiz ---------- */
async function startQuiz() {
  // Prime audio on user gesture
  if (!audio.pool.click) initAudio();
  audio.play('click', { volume: 0.5 });

  // Reset state
  score = 0;
  currentIndex = 0;
  updateScoreDisplay();

  // Show loading
  showPage('quiz');
  if (questionContainer) {
    questionContainer.innerHTML = '<p>Summoning the spirits... please wait...</p>';
  }

  try {
    await loadQuestions();
    
    if (!questions || questions.length === 0) {
      throw new Error('No questions loaded');
    }

    // Start quiz
    startTimer(120);
    renderQuestion(questions[currentIndex]);

    // Entrance animation
    if (quizSection) {
      quizSection.classList.remove('transition-out');
      quizSection.classList.add('transition-in');
    }

    // Start atmospheric effects
    scheduleAtmosphericThunder();

  } catch (error) {
    console.error('Error starting quiz:', error);
    if (questionContainer) {
      questionContainer.innerHTML = '<p>💀 Failed to summon questions. Check the console.</p>';
    }
    showPage('home');
  }
}

/* ---------- Event Listeners ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Menu toggle (mobile)
  const menuToggle = document.getElementById('menu-toggle');
  const navList = document.getElementById('nav-links');
  if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => navList.classList.toggle('open'));
  }

  // SPA navigation
  const navAnchors = document.querySelectorAll('.navbar a');
  if (navAnchors && navAnchors.length) {
    navAnchors.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = (a.getAttribute('href') || '').replace('#', '');
        if (id) {
          showPage(id);
          cancelAtmosphericThunder();
          clearInterval(timerInterval);
        }
        if (navList) navList.classList.remove('open');
      });
    });
  }

  // Start button
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startQuiz();
    });
  }

  // Restart button
  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('home');
      cancelAtmosphericThunder();
      clearInterval(timerInterval);
    });
  }
});