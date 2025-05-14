const startBtn = document.getElementById('start-button');
const genreSelect = document.getElementById('genre-select');
const typeSelect = document.getElementById('type-select');
const levelSelect = document.getElementById('level-select');

startBtn.addEventListener('click', () => {
  const genre = genreSelect.value;
  const type = typeSelect.value;
  const level = levelSelect.value;

  if (type === "GROUP") {
    window.location.href = `group_quiz/group_quiz.html?genre=${genre}&level=${level}`;
  } else if (type === "MCQ") {
    window.location.href = `mcq_quiz/mcq_quiz.html?genre=${genre}&level=${level}`;
  }
});

document.getElementById("progress-button").addEventListener("click", () => {
  window.location.href = "progress.html";
});

