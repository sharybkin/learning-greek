// js/game.js — Flashcard learning module (Quizlet-style)
window.Game = (function () {
    // DOM elements
    let gameCard, gameWord, gameTranslation, gameWordFront;
    let playAudioIcon, autoplayAudioCheckbox;
    let lessonFilterContainer, lessonFilterButton, lessonFilterValue, lessonFilterDropdown;
    let btnRemember, btnForget;
    let fcProgressText, fcProgressFill, fcComplete, fcResetBtn;
    let gameScene, gameControls;
    let mixSetting, mixWordsCheckbox, mixedBadge;
    let settingsBtn, settingsModal, closeSettingsBtn;

    // State
    let currentWord = null;
    let allWords = [];       // [{greek, russian, lessonIndex, wordIndex, id}, ...]
    let wordQueue = [];      // current queue of words to study
    let totalWordsCount = 0; // total words for current session
    let learnedCount = 0;    // words learned in current session

    let currentGameMode = 'audio';   // 'audio', 'ru-gr', 'gr-ru'

    function getCurrentStudyType() {
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        const selectedCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):checked');
        if (allCheckbox && allCheckbox.checked) {
            return 'review';
        }
        if (selectedCheckboxes.length === 0 || selectedCheckboxes.length === LESSONS.length) {
            return 'review';
        }
        return 'lesson';
    }

    function init(elements) {
        gameCard = elements.gameCard;
        gameWord = elements.gameWord;
        gameTranslation = elements.gameTranslation;
        gameWordFront = elements.gameWordFront;
        playAudioIcon = elements.playAudioIcon;
        autoplayAudioCheckbox = elements.autoplayAudioCheckbox;
        lessonFilterContainer = elements.lessonFilterContainer;
        lessonFilterButton = elements.lessonFilterButton;
        lessonFilterValue = elements.lessonFilterValue;
        lessonFilterDropdown = elements.lessonFilterDropdown;
        btnRemember = elements.btnRemember;
        btnForget = elements.btnForget;
        fcProgressText = elements.fcProgressText;
        fcProgressFill = elements.fcProgressFill;
        fcComplete = elements.fcComplete;
        fcResetBtn = elements.fcResetBtn;
        gameScene = elements.gameScene;
        gameControls = elements.gameControls;
        mixSetting = elements.mixSetting;
        mixWordsCheckbox = elements.mixWordsCheckbox;
        mixedBadge = elements.mixedBadge;

        settingsBtn = document.getElementById('settingsBtn');
        settingsModal = document.getElementById('settingsModal');
        closeSettingsBtn = document.getElementById('closeSettingsBtn');

        allWords = buildAllWords();
        populateLessonFilter();
        setupEventListeners();
        restoreLastLesson();
    }

    // Build flat array of all words with IDs
    function buildAllWords() {
        const words = [];
        window.LESSONS.forEach((lesson, lessonIndex) => {
            lesson.words.forEach((word, wordIndex) => {
                words.push({
                    greek: word.greek,
                    russian: word.russian,
                    lessonIndex,
                    wordIndex,
                    id: `${lessonIndex}:${wordIndex}`
                });
            });
        });
        return words;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ---- localStorage helpers ----

    function getStorageKey() {
        if (getCurrentStudyType() === 'review') {
            return `fc_${currentGameMode}_review`;
        }
        const selectedLessons = getSelectedLessonIndices();
        const lessonKey = selectedLessons.sort((a, b) => a - b).join('-');
        return `fc_${currentGameMode}_lesson_${lessonKey}`;
    }

    function getLearnedSet() {
        const key = getStorageKey();
        try {
            const data = localStorage.getItem(key);
            return data ? new Set(JSON.parse(data)) : new Set();
        } catch {
            return new Set();
        }
    }

    function saveLearnedSet(learnedSet) {
        const key = getStorageKey();
        localStorage.setItem(key, JSON.stringify([...learnedSet]));
    }

    function clearLearnedSet() {
        const key = getStorageKey();
        localStorage.removeItem(key);
    }

    function saveLastLesson() {
        const selected = getSelectedLessonIndices();
        if (selected.length > 0 && selected.length < LESSONS.length) {
            localStorage.setItem('fc_last_lesson', JSON.stringify(selected));
        } else {
            localStorage.removeItem('fc_last_lesson');
        }
    }

    function restoreLastLesson() {
        try {
            const data = localStorage.getItem('fc_last_lesson');
            if (!data) return;
            const indices = JSON.parse(data);
            if (!Array.isArray(indices) || indices.length === 0) return;

            // Uncheck all, then check the saved ones
            const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
            const checkboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"])');

            allCheckbox.checked = false;
            checkboxes.forEach(cb => {
                cb.checked = indices.includes(parseInt(cb.value));
            });

            // Check if all are selected → check "all"
            if (indices.length >= LESSONS.length) {
                allCheckbox.checked = true;
                checkboxes.forEach(cb => cb.checked = true);
            }

            updateLessonFilterButtonText();
        } catch {
            // ignore
        }
    }

    // ---- Lesson filter ----

    function populateLessonFilter() {
        if (!lessonFilterDropdown || !window.LESSONS) return;
        lessonFilterDropdown.innerHTML = '';

        const allOption = createCheckboxOption('all', 'Все уроки', true);
        lessonFilterDropdown.appendChild(allOption);

        const sortedLessons = LESSONS.map((lesson, index) => ({
            ...lesson, 
            originalIndex: index,
            mainLesson: Math.floor(lesson.lesson)
        })).sort((a, b) => {
            if (a.mainLesson !== b.mainLesson) {
                return a.mainLesson - b.mainLesson;
            }
            return a.lesson - b.lesson; 
        });

        sortedLessons.forEach((lesson) => {
            const option = createCheckboxOption(lesson.originalIndex, Sidebar.getDisplayTitle(lesson), true);
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

    function getSelectedLessonIndices() {
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        const selectedCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:checked');

        if (allCheckbox.checked || selectedCheckboxes.length === 0) {
            return LESSONS.map((_, i) => i);
        }

        return Array.from(selectedCheckboxes)
            .map(cb => parseInt(cb.value))
            .filter(v => !isNaN(v));
    }

    // ---- Flashcard session ----

    function startSession() {
        const learnedSet = getLearnedSet();
        const studyType = getCurrentStudyType();

        // Handle mix settings visibility
        if (mixSetting) {
            if (studyType === 'lesson') {
                mixSetting.classList.remove('disabled-setting');
                if (mixWordsCheckbox) mixWordsCheckbox.disabled = false;
            } else {
                mixSetting.classList.add('disabled-setting');
                if (mixWordsCheckbox) mixWordsCheckbox.disabled = true;
            }
        }

        // Get words for the current context
        let sessionWords;
        if (studyType === 'review') {
            sessionWords = [...allWords];
        } else {
            const selectedLessons = getSelectedLessonIndices();
            sessionWords = allWords.filter(w => selectedLessons.includes(w.lessonIndex));
        }

        // Filter out already learned words
        const unlearnedWords = sessionWords.filter(w => !learnedSet.has(w.id));

        // Word mixing (only in lesson mode)
        let mixedWords = [];
        if (studyType === 'lesson' && mixWordsCheckbox && mixWordsCheckbox.checked) {
            mixedWords = getMixWords(sessionWords);
        }

        totalWordsCount = sessionWords.length;
        learnedCount = sessionWords.length - unlearnedWords.length;

        // Build queue from unlearned + mixed
        wordQueue = [...unlearnedWords, ...mixedWords];
        shuffleArray(wordQueue);

        updateProgress();

        if (totalWordsCount > 0 && learnedCount >= totalWordsCount) {
            showComplete();
        } else if (wordQueue.length === 0) {
            showComplete();
        } else {
            hideComplete();
            // Pass false for isNext to prevent audio auto-play on load
            showNextCard(false, false);
        }

        saveLastLesson();
    }

    function getMixWords(currentSessionWords) {
        const currentIds = new Set(currentSessionWords.map(w => w.id));

        // Get unlearned words from review mode for other lessons
        const reviewKey = `fc_${currentGameMode}_review`;
        let reviewLearned = new Set();
        try {
            const data = localStorage.getItem(reviewKey);
            if (data) reviewLearned = new Set(JSON.parse(data));
        } catch { /* ignore */ }

        // Words from other lessons that are NOT learned in review
        const otherUnlearned = allWords.filter(w =>
            !currentIds.has(w.id) && !reviewLearned.has(w.id)
        );

        if (otherUnlearned.length === 0) return [];

        // 10% of current lesson size, min 3, max 10
        const count = Math.min(
            Math.max(3, Math.ceil(currentSessionWords.length * 0.1)),
            10,
            otherUnlearned.length
        );

        shuffleArray(otherUnlearned);
        return otherUnlearned.slice(0, count).map(w => ({ ...w, isMixed: true }));
    }

    function handleRemember() {
        if (!currentWord) return;

        if (!currentWord.isMixed) {
            // Mark as learned for the current session
            const learnedSet = getLearnedSet();
            learnedSet.add(currentWord.id);
            saveLearnedSet(learnedSet);
            learnedCount++;
        } else {
            // If it's a mixed word from review mode, record the progress there
            const reviewKey = `fc_${currentGameMode}_review`;
            let reviewLearned = new Set();
            try {
                const data = localStorage.getItem(reviewKey);
                if (data) reviewLearned = new Set(JSON.parse(data));
            } catch { /* ignore */ }
            reviewLearned.add(currentWord.id);
            localStorage.setItem(reviewKey, JSON.stringify([...reviewLearned]));
        }

        updateProgress();
        advanceToNext();
    }

    function handleForget() {
        if (!currentWord) return;

        // Put word back in queue
        wordQueue.unshift(currentWord);

        advanceToNext();
    }

    function advanceToNext() {
        if (totalWordsCount > 0 && learnedCount >= totalWordsCount) {
            showComplete();
            return;
        }
        if (wordQueue.length === 0) {
            showComplete();
            return;
        }
        showNextCard(true, true);
    }

    function showNextCard(animate, isNext = true) {
        if (totalWordsCount > 0 && learnedCount >= totalWordsCount) {
            showComplete();
            return;
        }
        if (wordQueue.length === 0) {
            showComplete();
            return;
        }

        if (animate) {
            gameCard.classList.add('no-transition');
            gameCard.classList.remove('is-flipped');
            void gameCard.offsetHeight;
            gameCard.classList.remove('no-transition');

            gameCard.classList.add('hide-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('hide-animation');
                loadNewWord(isNext);
                gameCard.classList.add('intro-animation');
                gameCard.addEventListener('animationend', () => {
                    gameCard.classList.remove('intro-animation');
                }, { once: true });
            }, { once: true });
        } else {
            loadNewWord(isNext);
            gameCard.classList.add('intro-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('intro-animation');
            }, { once: true });
        }
    }

    function loadNewWord(isNext = true) {
        currentWord = wordQueue.pop();

        if (currentWord && currentWord.isMixed) {
            if (mixedBadge) mixedBadge.classList.remove('hidden');
        } else {
            if (mixedBadge) mixedBadge.classList.add('hidden');
        }

        if (!currentWord) {
            gameWord.textContent = 'Нет слов';
            gameTranslation.textContent = '';
            gameWordFront.textContent = '';
            playAudioIcon.classList.add('hidden');
            return;
        }

        playAudioIcon.classList.remove('hidden');
        gameWord.textContent = '';
        gameTranslation.textContent = '';
        gameWordFront.textContent = '';

        const mode = currentGameMode;

        if (mode === 'audio') {
            playAudioIcon.classList.remove('hidden');
            gameWord.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;

            if (autoplayAudioCheckbox.checked && isNext) {
                setTimeout(() => Speech.speak(currentWord.greek), 100);
            }
        } else if (mode === 'ru-gr') {
            gameWordFront.textContent = currentWord.russian;
            gameWord.textContent = currentWord.greek;
            playAudioIcon.classList.add('hidden');
        } else if (mode === 'gr-ru') {
            gameWordFront.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;
            playAudioIcon.classList.add('hidden');
        }
        gameCard.classList.remove('is-flipped');
    }

    // ---- Progress UI ----

    function updateProgress() {
        const percent = totalWordsCount > 0 ? Math.round((learnedCount / totalWordsCount) * 100) : 0;
        fcProgressText.textContent = `Выучено: ${learnedCount} / ${totalWordsCount}`;
        fcProgressFill.style.width = `${percent}%`;
    }

    function showComplete() {
        gameScene.classList.add('hidden');
        gameControls.classList.add('hidden');
        fcComplete.classList.remove('hidden');
    }

    function hideComplete() {
        gameScene.classList.remove('hidden');
        gameControls.classList.remove('hidden');
        fcComplete.classList.add('hidden');
    }

    function handleReset() {
        clearLearnedSet();
        startSession();
    }

    // ---- UI visibility ----

    function updateAutoplayVisibility(gameMode) {
        const autoplayAudioCheckbox = document.getElementById('autoplayAudio');
        if (autoplayAudioCheckbox) {
            const settingGroup = autoplayAudioCheckbox.closest('.setting-group');
            if (settingGroup) {
                if (gameMode === 'audio') {
                    settingGroup.style.display = 'flex';
                } else {
                    settingGroup.style.display = 'none';
                }
            }
        }
    }

    function flipCard() {
        gameCard.classList.toggle('is-flipped');
    }

    // ---- Event listeners ----

    function setupEventListeners() {
        // Card flip
        if (gameCard) gameCard.addEventListener('click', flipCard);

        // Audio play
        if (playAudioIcon) playAudioIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentWord) Speech.speak(currentWord.greek);
        });

        // Remember / Forget
        if (btnRemember) btnRemember.addEventListener('click', handleRemember);
        if (btnForget) btnForget.addEventListener('click', handleForget);

        // Reset
        if (fcResetBtn) fcResetBtn.addEventListener('click', handleReset);

        // Game mode buttons
        document.querySelectorAll('.game-mode-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.game-mode-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentGameMode = button.dataset.mode;
                updateAutoplayVisibility(currentGameMode);
                startSession();
            });
        });

        // Mix words checkbox
        if (mixWordsCheckbox) {
            mixWordsCheckbox.addEventListener('change', () => {
                startSession();
            });
        }

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

        // Settings Modal
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('hidden');
            });
        }
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
            });
        }
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.add('hidden');
                }
            });
        }
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
        startSession();
    }

    return {
        init,
        startSelfCheck: startSession,
        updateAutoplayVisibility
    };
})();
