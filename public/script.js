let questions = [];
let currentIndex = 0;
let score = 0;
let timer;
let timeLeft = 10;

const csvInput = document.getElementById('csvFileInput');
const quizContainer = document.getElementById('quiz-container');
const questionElement = document.getElementById('question');
const choicesElement = document.getElementById('choices');
const resultElement = document.getElementById('result');
const scoreElement = document.getElementById('score');
const nextButton = document.getElementById('next-button');
const timerElement = document.getElementById('timer');
const pauseButton = document.getElementById('pause-button');

csvInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            parseCSV(csvText);
            loadProgress();
            showQuestion();
            quizContainer.style.display = 'block';
        };
        reader.readAsText(file);
    }
});

function parseCSV(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    for (let i = 0; i < lines.length; i += 5) {
        const [qText, choice1, correct] = lines[i].split(',').map(s => s.trim());
        const choice2 = lines[i + 1].split(',')[1].trim();
        const choice3 = lines[i + 2].split(',')[1].trim();
        const choice4 = lines[i + 3].split(',')[1].trim();
        questions.push({
            question: qText,
            choices: [choice1, choice2, choice3, choice4],
            correct: correct
        });
    }
}

function showQuestion() {
    clearInterval(timer);
    timeLeft = 10;
    timerElement.textContent = `残り時間: ${timeLeft}秒`;
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `残り時間: ${timeLeft}秒`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            resultElement.textContent = `時間切れ！ 正解: ${questions[currentIndex].correct}`;
            nextButton.style.display = 'inline-block';
        }
    }, 1000);

    const currentQuestion = questions[currentIndex];
    questionElement.textContent = currentQuestion.question;
    choicesElement.innerHTML = '';
    resultElement.textContent = '';
    nextButton.style.display = 'none';

    currentQuestion.choices.forEach(choice => {
        const li = document.createElement('li');
        li.textContent = choice;
        li.addEventListener('click', () => handleAnswer(choice));
        choicesElement.appendChild(li);
    });
}

function handleAnswer(selected) {
    clearInterval(timer);
    const correct = questions[currentIndex].correct;
    if (selected === correct) {
        resultElement.textContent = '◯ 正解！';
        score++;
        scoreElement.textContent = score;
    } else {
        resultElement.textContent = `× 不正解！ 正解: ${correct}`;
    }
    nextButton.style.display = 'inline-block';
}

nextButton.addEventListener('click', () => {
    currentIndex++;
    if (currentIndex < questions.length) {
        showQuestion();
    } else {
        questionElement.textContent = '終了！お疲れさまでした';
        choicesElement.innerHTML = '';
        resultElement.textContent = `最終スコア: ${score} / ${questions.length}`;
        timerElement.textContent = '';
        nextButton.style.display = 'none';
    }
});

pauseButton.addEventListener('click', () => {
    saveProgress();
    alert('進捗を保存しました');
});

function saveProgress() {
    localStorage.setItem('quizCurrentIndex', currentIndex);
    localStorage.setItem('quizScore', score);
}

function loadProgress() {
    const savedIndex = parseInt(localStorage.getItem('quizCurrentIndex'));
    const savedScore = parseInt(localStorage.getItem('quizScore'));
    if (!isNaN(savedIndex)) currentIndex = savedIndex;
    if (!isNaN(savedScore)) score = savedScore;
    scoreElement.textContent = score;
}