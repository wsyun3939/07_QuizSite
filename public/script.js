// script.js
let questions = [];
let currentIndex = 0;
let score = 0;
let timer;
let timeLeft;
let config = {
  time_limit: 10,
  shuffle_questions: false,
  enable_images: false,
  enable_audio: false
};
let selectedGenre = '';
let selectedLevel = '';

const startBtn = document.getElementById('start-button');
const resetBtn = document.getElementById('reset-button');
const genreSelect = document.getElementById('genre-select');
const levelSelect = document.getElementById('level-select');
const quizSection = document.getElementById('quiz-section');
const questionDiv = document.getElementById('question');
const choicesDiv = document.getElementById('choices');
const feedbackDiv = document.getElementById('feedback');
const scoreDiv = document.getElementById('score');
const timerDiv = document.getElementById('timer');
const nextBtn = document.getElementById('next-button');
const pauseBtn = document.getElementById('pause-button');
const modal = document.getElementById('start-modal');
const resumeBtn = document.getElementById('resume-button');
const restartBtn = document.getElementById('restart-button');
const mainButtons = document.getElementById('main-buttons');

window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  showMainButtons();
});

resumeBtn.addEventListener('click', async () => {
  modal.style.display = 'none';
  loadProgress();
  await loadCSV();
  startQuiz();
});

restartBtn.addEventListener('click', async () => {
  modal.style.display = 'none';
  clearProgress();
  await loadCSV();
  startQuiz();
});

startBtn.addEventListener('click', async () => {
  selectedGenre = genreSelect.value;
  selectedLevel = levelSelect.value;
  await loadCSV();
  const progressKey = getProgressKey();
  const hasProgress = localStorage.getItem(`${progressKey}_index`);
  if (hasProgress) {
    modal.style.display = 'flex';
  } else {
    startQuiz();
  }
});

resetBtn.addEventListener('click', () => {
  if (confirm('保存された進捗をリセットしますか？')) {
    clearProgress();
    alert('進捗をリセットしました。');
    location.reload();
  }
});

function startQuiz() {
  mainButtons.style.display = 'none';
  quizSection.style.display = 'block';
  showQuestion();
}

async function loadConfig() {
  try {
    const res = await fetch('../data/config.yaml');
    const yamlText = await res.text();
    const loadedConfig = jsyaml.load(yamlText);
    Object.assign(config, loadedConfig);
  } catch (e) {
    console.warn('config.yaml 読み込み失敗。デフォルト設定を使用します。');
  }
}

async function loadCSV() {
  selectedGenre = genreSelect.value;
  selectedLevel = levelSelect.value;
  const csvPath = `../data/${selectedGenre}/MCQ_${selectedLevel}.csv`;
  const res = await fetch(csvPath);
  const text = await res.text();
  parseCSV(text);
  if (config.shuffle_questions) shuffle(questions);
}

function parseCSV(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  questions = [];
  for (let i = 0; i + 3 < lines.length; i += 4) {
    const qLine = lines[i].split(',').map(s => s.trim());
    const opt2 = lines[i + 1].split(',')[1]?.trim() || '';
    const opt3 = lines[i + 2].split(',')[1]?.trim() || '';
    const opt4 = lines[i + 3].split(',')[1]?.trim() || '';
    const media = qLine[4]?.trim() || '';
    if (!qLine[0] || !qLine[1] || !qLine[2]) continue;
    questions.push({
      question: qLine[0],
      choices: [qLine[1], opt2, opt3, opt4],
      correct: qLine[2],
      media: media
    });
  }
}

function showQuestion() {
  if (!questions[currentIndex]) {
    endQuiz();
    return;
  }
  clearInterval(timer);
  const q = questions[currentIndex];
  timeLeft = config.time_limit;
  timerDiv.textContent = `残り時間: ${timeLeft}秒`;
  timer = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `残り時間: ${timeLeft}秒`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      feedbackDiv.textContent = `時間切れ！ 正解: ${q.correct}`;
      nextBtn.style.display = 'inline-block';
    }
  }, 1000);
  questionDiv.innerHTML = q.question;
  if (config.enable_images && q.media.endsWith('.jpg')) {
    questionDiv.innerHTML += `<br><img src="../${q.media}" style="max-width:100%;">`;
  } else if (config.enable_audio && q.media.endsWith('.mp3')) {
    questionDiv.innerHTML += `<br><audio controls src="../${q.media}"></audio>`;
  }
  choicesDiv.innerHTML = '';
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.onclick = () => checkAnswer(choice);
    choicesDiv.appendChild(btn);
  });
  scoreDiv.textContent = `スコア: ${score}`;
}

function checkAnswer(selected) {
  clearInterval(timer);
  const q = questions[currentIndex];
  if (selected === q.correct) {
    feedbackDiv.textContent = '◯ 正解！';
    score++;
  } else {
    feedbackDiv.textContent = `× 不正解！ 正解: ${q.correct}`;
  }
  scoreDiv.textContent = `スコア: ${score}`;
  nextBtn.style.display = 'inline-block';
}

nextBtn.addEventListener('click', () => {
  currentIndex++;
  showQuestion();
});

pauseBtn.addEventListener('click', () => {
  saveProgress();
  alert('進捗を保存しました');
  quizSection.style.display = 'none';
  mainButtons.style.display = 'flex';
});

function saveProgress() {
  const key = getProgressKey();
  localStorage.setItem(`${key}_index`, currentIndex);
  localStorage.setItem(`${key}_score`, score);
}

function loadProgress() {
  const key = getProgressKey();
  currentIndex = parseInt(localStorage.getItem(`${key}_index`)) || 0;
  score = parseInt(localStorage.getItem(`${key}_score`)) || 0;
  selectedGenre = localStorage.getItem('quizGenre') || genreSelect.value;
  selectedLevel = localStorage.getItem('quizLevel') || levelSelect.value;
  genreSelect.value = selectedGenre;
  levelSelect.value = selectedLevel;
  scoreDiv.textContent = score;
}

function clearProgress() {
  const key = getProgressKey();
  localStorage.removeItem(`${key}_index`);
  localStorage.removeItem(`${key}_score`);
}

function getProgressKey() {
  return `progress_${genreSelect.value}_${levelSelect.value}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function endQuiz() {
  questionDiv.textContent = '終了！お疲れさまでした';
  choicesDiv.innerHTML = '';
  feedbackDiv.textContent = `最終スコア: ${score} / ${questions.length}`;
  timerDiv.textContent = '';
  nextBtn.style.display = 'none';
}

function showMainButtons() {
  mainButtons.style.display = 'flex';
}
