let quizzes = [];
let currentQuizIndex = 0;

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const genre = params.get("genre");
  const level = params.get("level");

  if (genre && level) {
    const csvPath = `../../data/${genre}/GROUP_${level}.csv`;
    fetch(csvPath)
      .then(res => {
        if (!res.ok) throw new Error(`CSVファイルが見つかりません: ${csvPath}`);
        return res.text();
      })
      .then(text => {
        const lines = text.split("\n").map(line => line.trim()).filter(l => l);
        quizzes = parseQuizzes(lines);
        currentQuizIndex = 0;
        showQuiz(quizzes[currentQuizIndex]);
      })
      .catch(err => {
        alert(`CSVの読み込みに失敗しました。\n${err.message}`);
      });
  }
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
  container.innerHTML = "";
  message.textContent = "";
  nextBtn.style.display = "none";

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
    message.textContent = result.correct
      ? "正解！"
      : `不正解…（${result.total}中${result.correctCount}正解）`;
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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
