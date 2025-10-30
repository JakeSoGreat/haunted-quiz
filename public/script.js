// --- CONFIGURATION ---
let score = 0;
let currentQuestionIndex = 0; 
const totalQuestions = 10; // Updated to 10 questions per team decision
let quizData = []; // Array to hold all 10 questions fetched from the proxy

// --- DOM ELEMENTS ---
const startBtn = document.getElementById('start-btn');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const resultEl = document.getElementById('result');

startBtn.addEventListener('click', startQuiz);

// --- QUIZ CORE FUNCTIONS ---

async function startQuiz() {
  score = 0;
  currentQuestionIndex = 0;
  
  // Update UI for loading state
  resultEl.classList.add('hidden');
  startBtn.classList.add('hidden');
  
  questionEl.textContent = 'Summoning the spirits... please wait...';
  optionsEl.innerHTML = '';
  
  const PROXY_URL = '../api/generate-question.json'; 

  try {
    const res = await fetch(PROXY_URL);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch quiz (Status: ${res.status})`);
    }

    // This array holds the 10 question objects returned from the proxy
    quizData = await res.json(); 
    
    // Start the quiz by rendering the first question
    renderQuestion(quizData[currentQuestionIndex]);
    
  } catch (error) {
    questionEl.textContent = '💀 Failed to summon questions. Check the console and proxy server URL.';
    console.error("Error fetching quiz data:", error);
    startBtn.textContent = 'Try Again';
    startBtn.classList.remove('hidden'); 
  }
}

function renderQuestion(data) {
  // Display the current question text and index
  questionEl.textContent = `Question ${currentQuestionIndex + 1}/${totalQuestions}: ${data.question}`;
  optionsEl.innerHTML = ''; 

  // Create button for each option
  (data.options || []).forEach(option => {
    const btn = document.createElement('button');
    btn.textContent = option;
    // We attach the correct answer to every button's dataset for easy checking
    btn.setAttribute('data-answer', data.answer);
    btn.addEventListener('click', handleAnswerClick);
    optionsEl.appendChild(btn);
  });
}

function handleAnswerClick(event) {
  const selectedBtn = event.currentTarget;
  const selectedAnswer = selectedBtn.textContent;
  const correctAnswer = selectedBtn.getAttribute('data-answer');
  
  // Disable all options immediately to prevent multiple clicks
  Array.from(optionsEl.children).forEach(btn => btn.disabled = true);

  if (selectedAnswer === correctAnswer) {
    score++;
    selectedBtn.style.backgroundColor = 'var(--green-color)'; // Visual feedback
  } else {
    selectedBtn.style.backgroundColor = 'var(--orange-color)';
    // Highlight the correct answer for the user
    const correctEl = Array.from(optionsEl.children).find(btn => btn.textContent === correctAnswer);
    if (correctEl) {
        correctEl.style.border = '2px solid var(--green-color)';
    }
  }
  
  // Pause for visual feedback, then move to the next state
  setTimeout(advanceQuiz, 800);
}

function advanceQuiz() {
  currentQuestionIndex++;

  if (currentQuestionIndex < totalQuestions) {
    renderQuestion(quizData[currentQuestionIndex]);
  } else {
    showResult();
  }
}

function showResult() {
  questionEl.textContent = '';
  optionsEl.innerHTML = '';

  let message = '';
  if (score === totalQuestions) message = '👑 Monster Mash King/Queen! A perfect 10/10 haul!';
  else if (score >= 7) message = '🎃 Pumpkin Master! You earned a massive candy haul.';
  else if (score >= 4) message = '👻 Ghostly Good! You survived the night with a few scares.';
  else message = '💀 Better luck next haunt! The witches turned you into a toad.';

  // Display the final score and message
  resultEl.innerHTML = `<h2>Your Score: ${score}/${totalQuestions}</h2><p>${message}</p>`;
  resultEl.classList.remove('hidden');
  
  // Reset button for a new game
  startBtn.textContent = 'Play Again';
  startBtn.classList.remove('hidden');
}

// --- SFX ---
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