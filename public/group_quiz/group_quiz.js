let quizzes = [];
let currentQuizIndex = 0;
let score = 0;

let config = { time_limit: 10 };
let timer;
let timeLeft = 0;

const params = new URLSearchParams(location.search);
const genre = params.get("genre");
const level = params.get("level");
const type = "GROUP"; // 固定でOK

const modal = document.getElementById("modal");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");

window.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();

  if (genre && level) {
    const csvPath = `../../data/${genre}/GROUP_${level}.csv`;
    fetch(csvPath)
      .then(res => res.text())
      .then(text => {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        quizzes = parseQuizzes(lines);

        const key = getProgressKey();
        const hasProgress = localStorage.getItem(`${key}_index`);

        if (hasProgress) {
          document.getElementById("modal").style.display = "flex";
        } else {
          showQuiz(quizzes[0]);
        }
      });
  }
});

async function loadConfig() {
  try {
    const res = await fetch("../../data/config.yaml");
    const text = await res.text();
    config = jsyaml.load(text);
  } catch (e) {
    console.warn("config.yaml の読み込みに失敗しました。デフォルト値を使用します。");
  }
}

function getProgressKey() {
  return `progress_${genre}_${type}_${level}`;
}

function saveProgress() {
  const key = getProgressKey();
  localStorage.setItem(`${key}_index`, currentQuizIndex);
  localStorage.setItem(`${key}_score`, score);
}

function loadProgress() {
  const key = getProgressKey();
  currentQuizIndex = parseInt(localStorage.getItem(`${key}_index`) || "0");
  score = parseInt(localStorage.getItem(`${key}_score`) || "0");
}

function clearProgress() {
  const key = getProgressKey();
  localStorage.removeItem(`${key}_index`);
  localStorage.removeItem(`${key}_score`);
}

document.getElementById("pauseBtn").addEventListener("click", () => {
  saveProgress();
  alert("進捗を保存しました。");
  window.location.href = "../index.html"; // スタートページへ戻る
});

document.getElementById("resumeBtn").addEventListener("click", () => {
  modal.style.display = "none";
  loadProgress();
  showQuiz(quizzes[currentQuizIndex]);
});

document.getElementById("restartBtn").addEventListener("click", () => {
  modal.style.display = "none";
  clearProgress();
  currentQuizIndex = 0;
  score = 0;
  showQuiz(quizzes[currentQuizIndex]);
});


function parseQuizzes(lines) {
  const quizList = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("グループ数")) {
      const count = parseInt(lines[i].split(",")[1]);
      i++;
      const groupSet = [];
      for (let j = 0; j < count && i < lines.length; j++, i++) {
        const [groupName, ...items] = lines[i].split(",").map(x => x.trim());
        groupSet.push({ name: groupName, items });
      }
      quizList.push(groupSet);
    } else {
      i++;
    }
  }
  return quizList;
}

function showQuiz(groupSet) {
  const container = document.getElementById("quizContainer");
  const message = document.getElementById("message");
  const nextBtn = document.getElementById("nextBtn");
  const timerDiv = document.getElementById("timer");

  clearInterval(timer);
  container.innerHTML = "";
  message.textContent = "";
  nextBtn.style.display = "none";

  // タイマー初期化
  timeLeft = config.time_limit || 10;
  timerDiv.textContent = `残り時間: ${timeLeft}秒`;
  timer = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `残り時間: ${timeLeft}秒`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      autoCheckAnswer(groupSet); // 時間切れで自動判定
    }
  }, 1000);

  const allItems = groupSet.flatMap(group => group.items);
  const shuffled = shuffle([...allItems]);

  const itemArea = document.createElement("div");
  shuffled.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = item;
    div.draggable = true;
    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", item);
    });
    itemArea.appendChild(div);
  });

  const groupArea = document.createElement("div");
  groupSet.forEach(group => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "group";
    groupDiv.dataset.name = group.name;
    const title = document.createElement("h3");
    title.textContent = group.name;
    groupDiv.appendChild(title);
    groupDiv.addEventListener("dragover", (e) => e.preventDefault());
    groupDiv.addEventListener("drop", (e) => {
      e.preventDefault();
      const itemText = e.dataTransfer.getData("text/plain");
      const item = [...document.querySelectorAll(".item")].find(el => el.textContent === itemText);
      if (item && !groupDiv.contains(item)) groupDiv.appendChild(item);
    });
    groupArea.appendChild(groupDiv);
  });

  const checkBtn = document.createElement("button");
  checkBtn.textContent = "答え合わせ";
  checkBtn.onclick = () => {
    const result = checkAnswer(groupSet);

    if (result.correct) {
      message.innerHTML = "✅ 正解！";
      score++;
    } else {
      message.innerHTML = `❌ 不正解…（${result.total}中${result.correctCount}正解）<br><br><strong>模範解答：</strong><br>`;
      groupSet.forEach(group => {
        message.innerHTML += `<strong>${group.name}</strong>: ${group.items.join("、")}<br>`;
      });
    }

    saveProgress(); // ← 進捗保存している場合
    nextBtn.style.display = currentQuizIndex + 1 < quizzes.length ? "inline" : "none";
    checkBtn.disabled = true;
  };

  container.appendChild(document.createElement("h2")).textContent = "アイテム";
  container.appendChild(itemArea);
  container.appendChild(document.createElement("h2")).textContent = "グループ";
  container.appendChild(groupArea);
  container.appendChild(checkBtn);
}

document.getElementById("nextBtn").addEventListener("click", () => {
  currentQuizIndex++;
  if (currentQuizIndex < quizzes.length) {
    showQuiz(quizzes[currentQuizIndex]);
  }
});

function checkAnswer(groupSet) {
  let correctCount = 0;
  let total = 0;
  groupSet.forEach(group => {
    const groupDiv = [...document.querySelectorAll(".group")].find(g => g.dataset.name === group.name);
    const dropped = [...groupDiv.querySelectorAll(".item")].map(el => el.textContent);
    total += group.items.length;
    group.items.forEach(item => {
      if (dropped.includes(item)) correctCount++;
    });
  });
  return { correct: correctCount === total, correctCount, total };
}

function autoCheckAnswer(groupSet) {
  const message = document.getElementById("message");
  const result = checkAnswer(groupSet);

  message.innerHTML = `⏰ 時間切れ！<br>（${result.total}中${result.correctCount}正解）<br><br><strong>模範解答：</strong><br>`;
  groupSet.forEach(group => {
    message.innerHTML += `<strong>${group.name}</strong>: ${group.items.join("、")}<br>`;
  });

  saveProgress();
  document.getElementById("nextBtn").style.display = currentQuizIndex + 1 < quizzes.length ? "inline" : "none";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
