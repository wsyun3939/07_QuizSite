let questions = [];
let currentIndex = 0;
let score = 0;
let timer;
let timeLeft = 10;
const timeLimit = 10;

const questionDiv = document.getElementById("question");
const choicesDiv = document.getElementById("choices");
const feedbackDiv = document.getElementById("feedback");
const scoreDiv = document.getElementById("score");
const timerDiv = document.getElementById("timer");
const nextBtn = document.getElementById("next-button");
const pauseBtn = document.getElementById("pause-button");

// クエリパラメータ取得
const params = new URLSearchParams(window.location.search);
const genre = params.get("genre");
const level = params.get("level");

const modal = document.getElementById("modal");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadCSV();
    loadProgress();  // startQuiz前に呼ぶ

    const key = getProgressKey();
    const hasProgress = localStorage.getItem(`${key}_index`);

    if (hasProgress) {
      document.getElementById("modal").style.display = "flex";
    } else {
      showQuiz(questions[0]);
    }
  } catch (e) {
    alert("CSVの読み込みに失敗しました。");
  }
});

document.getElementById("resumeBtn").addEventListener("click", () => {
  modal.style.display = "none";
  loadProgress();
  showQuiz(questions[currentIndex]);
});

document.getElementById("restartBtn").addEventListener("click", () => {
  modal.style.display = "none";
  clearProgress();
  currentIndex = 0;
  score = 0;
  showQuiz(questions[currentIndex]);
});

function getProgressKey() {
  return `progress_${genre}_MCQ_${level}`;
}

function saveProgress() {
  const key = getProgressKey();
  localStorage.setItem(`${key}_index`, currentIndex);
  localStorage.setItem(`${key}_score`, score);
}

function loadProgress() {
  const key = getProgressKey();
  currentIndex = parseInt(localStorage.getItem(`${key}_index`)) || 0;
  score = parseInt(localStorage.getItem(`${key}_score`)) || 0;
}

function clearProgress() {
  const key = getProgressKey();
  localStorage.removeItem(`${key}_index`);
  localStorage.removeItem(`${key}_score`);
}


async function loadCSV() {
  const path = `../../data/${genre}/MCQ_${level}.csv`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("CSVファイルが見つかりません");
  const text = await res.text();
  parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split("\n").map(line => line.trim()).filter(line => line);
  questions = [];
  for (let i = 0; i + 3 < lines.length; i += 4) {
    const qLine = lines[i].split(',').map(s => s.trim());
    const opt2 = lines[i + 1].split(',')[1]?.trim() || '';
    const opt3 = lines[i + 2].split(',')[1]?.trim() || '';
    const opt4 = lines[i + 3].split(',')[1]?.trim() || '';
    if (!qLine[0] || !qLine[1] || !qLine[2]) continue;
    questions.push({
      question: qLine[0],
      choices: shuffle([qLine[1], opt2, opt3, opt4]),
      correct: qLine[2],
    });
  }
}

function showQuiz(groupSet) {

  clearInterval(timer);
  const q = groupSet;
  questionDiv.innerHTML = q.question;
  choicesDiv.innerHTML = '';
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';
  scoreDiv.textContent = `スコア: ${score}`;
  timeLeft = timeLimit;
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

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.onclick = () => checkAnswer(choice);
    choicesDiv.appendChild(btn);
  });
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

nextBtn.addEventListener("click", () => {
  currentIndex++;
  showQuiz(questions[currentIndex]);
});

pauseBtn.addEventListener("click", () => {
  saveProgress();
  alert("進捗を保存しました");
  window.location.href = "../index.html"; // スタートページへ戻る
});


function endQuiz() {
  questionDiv.textContent = '終了！お疲れさまでした';
  choicesDiv.innerHTML = '';
  feedbackDiv.textContent = `最終スコア: ${score} / ${questions.length}`;
  timerDiv.textContent = '';
  nextBtn.style.display = 'none';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
