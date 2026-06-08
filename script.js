let allQuestions = [];
let testQuestions = [];
let currentQuestionIndex = 0;
let correctAnswersCount = 0;
let selectedAnswerIndex = null;

// Инициализация темы и состояния при загрузке
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadState();
});

// Логика переключения темы
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = 'light';
    
    if (currentTheme !== 'dark') {
        newTheme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('bio_quiz_theme', newTheme);
    updateThemeButtonText(newTheme);
});

function initTheme() {
    const savedTheme = localStorage.getItem('bio_quiz_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButtonText(savedTheme);
}

function updateThemeButtonText(theme) {
    themeToggleBtn.textContent = theme === 'dark' ? '☀️ Светлая тема' : '🌙 Темная тема';
}

// Чтение и парсинг файла
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('file-name').textContent = `Выбран файл: ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        parseQuestions(event.target.result);
    };
    reader.readAsText(file, 'UTF-8');
});

function parseQuestions(text) {
    allQuestions = [];
    const blocks = text.split(/(?=\b\d+\.\s)/); 

    blocks.forEach(block => {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 3) return;

        const questionText = lines[0].replace(/^\d+\.\s*/, '');
        const options = [];

        for (let i = 1; i < lines.length; i++) {
            let line = lines[i];
            if (/^[а-яёA-Za-z]\)/.test(line)) {
                let isCorrect = false;
                if (line.includes('[ОТВЕТ:')) {
                    isCorrect = true;
                    line = line.replace(/\s*\[ОТВЕТ:\s*.*\]/g, '');
                }
                options.push({ text: line, isCorrect: isCorrect });
            }
        }

        if (options.length > 0) {
            allQuestions.push({ question: questionText, options: options });
        }
    });

    if (allQuestions.length === 0) {
        alert("Не удалось распознать вопросы в файле. Проверьте формат текста.");
        return;
    }

    const count = Math.min(allQuestions.length, 20);
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    testQuestions = shuffled.slice(0, count);
    
    currentQuestionIndex = 0;
    correctAnswersCount = 0;
    selectedAnswerIndex = null;

    saveState();
    startQuiz();
}

function startQuiz() {
    document.getElementById('upload-box').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'block';
    document.getElementById('result-box').style.display = 'none';
    showQuestion();
}

function showQuestion() {
    const nextBtn = document.getElementById('next-btn');
    const qData = testQuestions[currentQuestionIndex];
    
    document.getElementById('question-counter').textContent = `Вопрос ${currentQuestionIndex + 1} из ${testQuestions.length}`;
    document.getElementById('score-counter').textContent = `Правильно: ${correctAnswersCount}`;
    document.getElementById('progress').style.width = `${(currentQuestionIndex / testQuestions.length) * 100}%`;
    document.getElementById('question-text').textContent = qData.question;
    
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    
    qData.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.className = 'option-item';
        li.textContent = option.text;
        li.addEventListener('click', () => selectOption(index));
        optionsList.appendChild(li);
    });

    if (selectedAnswerIndex !== null) {
        restoreVisualAnswer(selectedAnswerIndex);
    } else {
        nextBtn.style.display = 'none';
    }
}

function selectOption(index) {
    if (selectedAnswerIndex !== null) return;
    selectedAnswerIndex = index;
    
    const qData = testQuestions[currentQuestionIndex];
    const isCorrect = qData.options[index].isCorrect;
    
    if (isCorrect) {
        correctAnswersCount++;
    }
    
    saveState();
    restoreVisualAnswer(index);
}

function restoreVisualAnswer(selectedIndex) {
    const items = document.querySelectorAll('.option-item');
    const nextBtn = document.getElementById('next-btn');
    const qData = testQuestions[currentQuestionIndex];
    
    items.forEach((item, idx) => {
        item.classList.add('disabled');
        if (idx === selectedIndex) {
            item.classList.add(qData.options[idx].isCorrect ? 'correct' : 'wrong');
        } else if (qData.options[idx].isCorrect) {
            item.classList.add('correct');
        }
    });
    
    document.getElementById('score-counter').textContent = `Правильно: ${correctAnswersCount}`;
    nextBtn.style.display = 'block';
    nextBtn.textContent = (currentQuestionIndex === testQuestions.length - 1) ? "Посмотреть итоги" : "Следующий вопрос";
}

document.getElementById('next-btn').addEventListener('click', () => {
    if (selectedAnswerIndex === null) return;
    
    currentQuestionIndex++;
    selectedAnswerIndex = null;
    
    if (currentQuestionIndex < testQuestions.length) {
        saveState();
        showQuestion();
    } else {
        showResult();
    }
});

function showResult() {
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'block';
    
    document.getElementById('final-score').textContent = `${correctAnswersCount} / ${testQuestions.length}`;
    
    const percent = (correctAnswersCount / testQuestions.length) * 100;
    let comment = '';
    if (percent === 100) comment = 'Идеально! Отличный уровень знаний!';
    else if (percent >= 80) comment = 'Великолепный результат! Прекрасная подготовка.';
    else if (percent >= 50) comment = 'Хорошо, но есть куда стремиться. Повторите темы.';
    else comment = 'Стоит уделить больше времени теории и пройти тест заново.';
    
    document.getElementById('result-comment').textContent = comment;
    localStorage.removeItem('bio_quiz_state');
}

function resetQuiz() {
    localStorage.removeItem('bio_quiz_state');
    location.reload();
}

function saveState() {
    const state = {
        testQuestions: testQuestions,
        currentQuestionIndex: currentQuestionIndex,
        correctAnswersCount: correctAnswersCount,
        selectedAnswerIndex: selectedAnswerIndex
    };
    localStorage.setItem('bio_quiz_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('bio_quiz_state');
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        testQuestions = state.testQuestions;
        currentQuestionIndex = state.currentQuestionIndex;
        correctAnswersCount = state.correctAnswersCount;
        selectedAnswerIndex = state.selectedAnswerIndex;
        
        if (testQuestions && testQuestions.length > 0) {
            const badge = document.getElementById('restore-badge');
            badge.style.display = 'inline-block';
            setTimeout(() => { startQuiz(); }, 1000);
        }
    } catch (e) {
        localStorage.removeItem('bio_quiz_state');
    }
}
