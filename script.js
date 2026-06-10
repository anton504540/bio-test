let allQuestions = [];
let testQuestions = [];
let currentQuestionIndex = 0;
let correctAnswersCount = 0;
let selectedAnswerIndex = null;
let db = null;

// Инициализация базы данных IndexedDB для сохранения файлов
const dbRequest = indexedDB.open("BioQuizFilesDB", 1);
dbRequest.onupgradeneeded = function(e) {
    let database = e.target.result;
    if (!database.objectStoreNames.contains("files")) {
        database.createObjectStore("files", { keyPath: "name" });
    }
};
dbRequest.onsuccess = function(e) {
    db = e.target.result;
    renderSavedFilesList();
};

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadState();
});

// Логика тем
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
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

// Обработка загрузки нового файла
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const textContent = event.target.result;
        saveFileToDB(file.name, textContent);
        parseQuestions(textContent);
    };
    reader.readAsText(file, 'UTF-8');
});

function saveFileToDB(name, content) {
    if (!db) return;
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.put({ name: name, content: content });
    tx.oncomplete = function() {
        renderSavedFilesList();
    };
}

function renderSavedFilesList() {
    if (!db) return;
    const listElement = document.getElementById('saved-files-list');
    listElement.innerHTML = '';
    
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const request = store.getAll();
    
    request.onsuccess = function() {
        const files = request.result;
        if (files.length === 0) {
            listElement.innerHTML = '<li style="font-size:0.9rem; color:gray;">Пока нет загруженных тестов</li>';
            return;
        }
        files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'file-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name-click';
            nameSpan.textContent = file.name;
            nameSpan.addEventListener('click', () => {
                parseQuestions(file.content);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Удалить';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFileFromDB(file.name);
            });
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            listElement.appendChild(li);
        });
    };
}

function deleteFileFromDB(name) {
    if (!db) return;
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.delete(name);
    tx.oncomplete = function() {
        renderSavedFilesList();
    };
}

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
                line = line.replace(/^[а-яёA-Za-z]\)\s*/, '');
                options.push({ text: line, isCorrect: isCorrect });
            }
        }

        if (options.length > 0) {
            allQuestions.push({ question: questionText, options: options });
        }
    });

    if (allQuestions.length === 0) {
        alert("Не удалось распознать вопросы. Проверьте формат текста.");
        return;
    }

    openQuizSetup();
}
function openQuizSetup() {
    document.getElementById('upload-box').style.display = 'none';
    document.getElementById('setup-box').style.display = 'block';
    document.getElementById('quiz-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'none';
    
    const totalQuestions = allQuestions.length;
    document.getElementById('total-available-text').textContent = `Всего доступно вопросов в файле: ${totalQuestions}`;
    
    const selectElement = document.getElementById('quiz-count-select');
    selectElement.innerHTML = '';
    
    if (totalQuestions <= 10) {
        const option = document.createElement('option');
        option.value = totalQuestions;
        option.textContent = `Все вопросы (${totalQuestions})`;
        selectElement.appendChild(option);
    } else {
        for (let i = 10; i < totalQuestions; i += 10) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} вопросов`;
            selectElement.appendChild(option);
        }
        const optionAll = document.createElement('option');
        optionAll.value = totalQuestions;
        optionAll.textContent = `Все вопросы (${totalQuestions})`;
        selectElement.appendChild(optionAll);
    }
}

document.getElementById('start-quiz-btn').addEventListener('click', () => {
    const selectElement = document.getElementById('quiz-count-select');
    const count = parseInt(selectElement.value, 10);
    
    const shuffledQuestions = [...allQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffledQuestions.slice(0, count);
    
    testQuestions = selectedQuestions.map(q => {
        return {
            question: q.question,
            options: [...q.options].sort(() => 0.5 - Math.random())
        };
    });
    
    currentQuestionIndex = 0;
    correctAnswersCount = 0;
    selectedAnswerIndex = null;

    saveState();
    startQuiz();
});

function cancelSetup() {
    document.getElementById('setup-box').style.display = 'none';
    document.getElementById('upload-box').style.display = 'block';
}

function startQuiz() {
    document.getElementById('setup-box').style.display = 'none';
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
    
    const letters = ['а', 'б', 'в', 'г', 'д', 'е', 'ж'];
    
    qData.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.className = 'option-item';
        const prefix = letters[index] ? `${letters[index]}) ` : '';
        li.textContent = prefix + option.text;
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
    if (qData.options[index].isCorrect) {
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
    else if (percent >= 50) comment = 'Хорошо, но есть куда стремиться.';
    else comment = 'Стоит уделить больше времени теории.';
    
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
        if (!state || !state.testQuestions || state.testQuestions.length === 0) {
            localStorage.removeItem('bio_quiz_state');
            return;
        }
        testQuestions = state.testQuestions;
        currentQuestionIndex = state.currentQuestionIndex;
        correctAnswersCount = state.correctAnswersCount;
        selectedAnswerIndex = state.selectedAnswerIndex;
        
        const badge = document.getElementById('restore-badge');
        if (badge) { badge.style.display = 'inline-block'; }
        setTimeout(() => { startQuiz(); }, 1000);
    } catch (e) {
        localStorage.removeItem('bio_quiz_state');
        location.reload();
    }
}
