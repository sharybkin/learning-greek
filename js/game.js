// js/game.js — Self-check game module
window.Game = (function () {
    let gameCard, gameWord, gameTranslation, gameWordFront;
    let nextWordBtn, playAudioIcon, autoplayAudioCheckbox;
    let lessonFilterContainer, lessonFilterButton, lessonFilterValue, lessonFilterDropdown;

    let currentWord = null;
    let allWords = [];
    let filteredWords = [];
    let wordQueue = [];

    function init(elements) {
        gameCard = elements.gameCard;
        gameWord = elements.gameWord;
        gameTranslation = elements.gameTranslation;
        gameWordFront = elements.gameWordFront;
        nextWordBtn = elements.nextWordBtn;
        playAudioIcon = elements.playAudioIcon;
        autoplayAudioCheckbox = elements.autoplayAudioCheckbox;
        lessonFilterContainer = elements.lessonFilterContainer;
        lessonFilterButton = elements.lessonFilterButton;
        lessonFilterValue = elements.lessonFilterValue;
        lessonFilterDropdown = elements.lessonFilterDropdown;

        allWords = getAllWords();
        populateLessonFilter();
        setupEventListeners();
    }

    function getAllWords() {
        return window.LESSONS.flatMap(lesson => lesson.words);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function populateLessonFilter() {
        if (!lessonFilterDropdown || !window.LESSONS) return;
        lessonFilterDropdown.innerHTML = '';

        const allOption = createCheckboxOption('all', 'Все уроки', true);
        lessonFilterDropdown.appendChild(allOption);

        LESSONS.forEach((lesson, index) => {
            const option = createCheckboxOption(index, Sidebar.getDisplayTitle(lesson), true);
            lessonFilterDropdown.appendChild(option);
        });
        updateLessonFilterButtonText();
    }

    function createCheckboxOption(value, text, checked = false) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-select-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.checked = checked;
        checkbox.id = `lesson-${value}`;

        const label = document.createElement('label');
        label.htmlFor = `lesson-${value}`;
        label.textContent = text;

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);

        return optionDiv;
    }

    function updateLessonFilterButtonText() {
        const checkboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:checked');
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');

        if (allCheckbox.checked || checkboxes.length === 0 || checkboxes.length === LESSONS.length + 1) {
            lessonFilterValue.textContent = 'Все уроки';
            return;
        }

        if (checkboxes.length === 1) {
            const id = checkboxes[0].id.replace('lesson-', '');
            const lesson = LESSONS.find((l, i) => i == id);
            if (lesson) {
                lessonFilterValue.textContent = Sidebar.getDisplayTitle(lesson);
            }
        } else {
            lessonFilterValue.textContent = `Выбрано: ${checkboxes.length}`;
        }
    }

    function updateFilteredWords() {
        const selectedCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:checked');
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');

        if (allCheckbox.checked || selectedCheckboxes.length === 0) {
            filteredWords = allWords;
        } else {
            const selectedLessons = Array.from(selectedCheckboxes)
                .map(cb => cb.value)
                .filter(value => value !== 'all');

            filteredWords = selectedLessons.flatMap(index => LESSONS[index].words);
        }
        wordQueue = [...filteredWords];
        shuffleArray(wordQueue);
    }

    function getNextWordFromQueue() {
        if (wordQueue.length === 0) {
            if (filteredWords.length === 0) {
                return null;
            }
            console.log("Queue is empty, refilling and shuffling.");
            wordQueue = [...filteredWords];
            shuffleArray(wordQueue);
        }
        return wordQueue.pop();
    }

    function startSelfCheck(isNext = false, gameMode = null) {
        if (!isNext) {
            updateFilteredWords();
        }

        const mode = gameMode || document.querySelector('.game-mode-button.active').dataset.mode;

        if (isNext) {
            gameCard.classList.add('no-transition');
            gameCard.classList.remove('is-flipped');
            void gameCard.offsetHeight;
            gameCard.classList.remove('no-transition');

            gameCard.classList.add('hide-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('hide-animation');
                loadNewWord(mode, isNext);
                gameCard.classList.add('intro-animation');
            }, { once: true });
        } else {
            loadNewWord(mode, isNext);
        }
    }

    function loadNewWord(gameMode, isNext = false) {
        currentWord = getNextWordFromQueue();

        if (!currentWord) {
            gameWord.textContent = 'Нет слов';
            gameTranslation.textContent = 'Выберите урок';
            gameWordFront.textContent = '';
            playAudioIcon.classList.add('hidden');
            return;
        }

        playAudioIcon.classList.remove('hidden');
        gameWord.textContent = '';
        gameTranslation.textContent = '';
        gameWordFront.textContent = '';

        if (gameMode === 'audio') {
            playAudioIcon.classList.remove('hidden');
            gameWord.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;

            if (autoplayAudioCheckbox.checked && isNext) {
                setTimeout(() => Speech.speak(currentWord.greek), 100);
            }
        } else if (gameMode === 'ru-gr') {
            gameWordFront.textContent = currentWord.russian;
            gameWord.textContent = currentWord.greek;
            playAudioIcon.classList.add('hidden');
        } else if (gameMode === 'gr-ru') {
            gameWordFront.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;
            playAudioIcon.classList.add('hidden');
        }
        gameCard.classList.remove('is-flipped');
    }

    function flipCard() {
        gameCard.classList.toggle('is-flipped');
    }

    function updateAutoplayVisibility(gameMode) {
        const autoplaySetting = document.querySelector('.autoplay-setting');
        if (autoplaySetting) {
            if (gameMode === 'audio') {
                autoplaySetting.parentElement.style.visibility = 'visible';
            } else {
                autoplaySetting.parentElement.style.visibility = 'hidden';
            }
        }
    }

    function setupEventListeners() {
        if (gameCard) gameCard.addEventListener('click', flipCard);
        if (playAudioIcon) playAudioIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            Speech.speak(currentWord.greek);
        });
        if (nextWordBtn) nextWordBtn.addEventListener('click', () => startSelfCheck(true));

        // Game mode buttons
        document.querySelectorAll('.game-mode-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.game-mode-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const newMode = button.dataset.mode;
                updateAutoplayVisibility(newMode);
                startSelfCheck(false, newMode);
            });
        });

        // Lesson filter
        if (lessonFilterButton) {
            lessonFilterButton.addEventListener('click', () => {
                lessonFilterDropdown.classList.toggle('hidden');
                lessonFilterContainer.classList.toggle('open');
            });
        }

        if (lessonFilterDropdown) {
            lessonFilterDropdown.addEventListener('click', (e) => {
                const option = e.target.closest('.custom-select-option');
                if (!option) return;

                const checkbox = option.querySelector('input[type="checkbox"]');
                if (!checkbox) return;

                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }

                handleFilterChange(checkbox);
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (lessonFilterContainer && !lessonFilterContainer.contains(e.target)) {
                lessonFilterDropdown.classList.add('hidden');
                lessonFilterContainer.classList.remove('open');
            }
        });
    }

    function handleFilterChange(changedCheckbox) {
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        const checkboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"])');

        if (changedCheckbox.value === 'all') {
            checkboxes.forEach(cb => cb.checked = allCheckbox.checked);
        } else {
            allCheckbox.checked = Array.from(checkboxes).every(cb => cb.checked);
        }

        updateLessonFilterButtonText();
        startSelfCheck();
    }

    return {
        init,
        startSelfCheck,
        updateAutoplayVisibility
    };
})();
