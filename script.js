document.addEventListener('DOMContentLoaded', () => {
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timer;
    let timeLeft = 10;

    const questionDiv = document.querySelector('.question');
    const choicesDiv = document.querySelector('.choices');
    const resultDiv = document.querySelector('.result');
    const nextBtn = document.querySelector('.next-btn');
    const timerDiv = document.querySelector('.timer');
    const timerSpan = document.getElementById('timer');
    const loadBtn = document.getElementById('loadBtn');
    const csvFileInput = document.getElementById('csvFile');

    loadBtn.addEventListener('click', () => {
        const file = csvFileInput.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                const lines = text.trim().split('\n');
                questions = lines.map(line => {
                    const [question, ...choices] = line.split(',');
                    const trimmedChoices = choices.map(c => c.trim());
                    const correctAnswer = trimmedChoices[0];
                    const shuffledChoices = shuffleArray(trimmedChoices);
                    const correctIndex = shuffledChoices.indexOf(correctAnswer);

                    return {
                        question: question.trim(),
                        choices: shuffledChoices,
                        correctIndex: correctIndex
                    };
                });
                startQuiz();
            };
            reader.readAsText(file);
        } else {
            alert('CSVファイルを選択してください。');
        }
    });

    function shuffleArray(array) {
        return array
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    }

    function startQuiz() {
        currentQuestionIndex = 0;
        score = 0;
        showQuestion();
    }

    function startTimer() {
        timeLeft = 10;
        timerSpan.textContent = timeLeft;
        timerDiv.style.display = 'block';

        timer = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(timer);
                handleTimeUp();
            }
        }, 1000);
    }

    function showQuestion() {
        const current = questions[currentQuestionIndex];
        questionDiv.textContent = `Q${currentQuestionIndex + 1}: ${current.question}`;
        choicesDiv.innerHTML = '';
        resultDiv.textContent = '';
        nextBtn.style.display = 'none';

        current.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.classList.add('choice-btn');
            button.textContent = choice;
            button.addEventListener('click', () => handleAnswer(index === current.correctIndex));
            choicesDiv.appendChild(button);
        });

        startTimer();
    }

    function handleAnswer(isCorrect) {
        clearInterval(timer);

        if (isCorrect) {
            resultDiv.textContent = '◯ 正解！';
            resultDiv.style.color = 'green';
            score++;
        } else {
            resultDiv.textContent = '✕ 不正解';
            resultDiv.style.color = 'red';
        }

        document.querySelectorAll('.choice-btn').forEach(btn => btn.disabled = true);
        nextBtn.style.display = 'inline-block';
    }

    function handleTimeUp() {
        resultDiv.textContent = '時間切れ ✕ 不正解';
        resultDiv.style.color = 'red';

        document.querySelectorAll('.choice-btn').forEach(btn => btn.disabled = true);
        nextBtn.style.display = 'inline-block';
    }

    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion();
        } else {
            showFinalResult();
        }
    });

    function showFinalResult() {
        questionDiv.textContent = '全問終了！お疲れさまでした。';
        choicesDiv.innerHTML = '';
        resultDiv.innerHTML = `あなたのスコアは <strong>${score} / ${questions.length}</strong> です。`;
        resultDiv.style.color = 'black';
        nextBtn.style.display = 'none';
        timerDiv.style.display = 'none';
    }
});
