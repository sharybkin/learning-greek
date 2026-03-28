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
    let shuffleWordsCheckbox;
    let settingsBtn, settingsModal, closeSettingsBtn;
    let settingsResetCurrentBtn, settingsResetAllBtn;

    // State
    let currentWord = null;
    let allWords = [];       // [{greek, russian, lessonIndex, wordIndex, id}, ...]
    let wordQueue = [];      // current queue of words to study
    let totalWordsCount = 0; // total words for current session
    let learnedCount = 0;    // words learned in current session
    let mixPool = [];         // pool of mixed words to insert at intervals
    let lessonWordsSinceLastMix = 0; // counter for interval-based mixing

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
        shuffleWordsCheckbox = document.getElementById('shuffleWords');

        settingsBtn = document.getElementById('settingsBtn');
        settingsModal = document.getElementById('settingsModal');
        closeSettingsBtn = document.getElementById('closeSettingsBtn');
        settingsResetCurrentBtn = document.getElementById('settingsResetCurrentBtn');
        settingsResetAllBtn = document.getElementById('settingsResetAllBtn');

        allWords = buildAllWords();
        populateLessonFilter();
        setupEventListeners();
        restoreSettings();
        restoreGameMode();
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

    // ---- Settings & mode persistence ----

    function saveGameMode() {
        localStorage.setItem('fc_game_mode', currentGameMode);
    }

    function restoreGameMode() {
        const saved = localStorage.getItem('fc_game_mode');
        if (!saved) return;
        currentGameMode = saved;
        document.querySelectorAll('.game-mode-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === saved);
        });
        updateAutoplayVisibility(saved);
    }

    function saveSettings() {
        const settings = {
            shuffleWords: shuffleWordsCheckbox ? shuffleWordsCheckbox.checked : false,
            mixWords: mixWordsCheckbox ? mixWordsCheckbox.checked : true,
            autoplayAudio: autoplayAudioCheckbox ? autoplayAudioCheckbox.checked : true
        };
        localStorage.setItem('fc_settings', JSON.stringify(settings));
    }

    function restoreSettings() {
        try {
            const data = localStorage.getItem('fc_settings');
            if (!data) return;
            const settings = JSON.parse(data);
            if (shuffleWordsCheckbox && settings.shuffleWords !== undefined) {
                shuffleWordsCheckbox.checked = settings.shuffleWords;
            }
            if (mixWordsCheckbox && settings.mixWords !== undefined) {
                mixWordsCheckbox.checked = settings.mixWords;
            }
            if (autoplayAudioCheckbox && settings.autoplayAudio !== undefined) {
                autoplayAudioCheckbox.checked = settings.autoplayAudio;
            }
        } catch { /* ignore */ }
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
            const leafCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):not([value^="main-"])');
            const mainHeaders = lessonFilterDropdown.querySelectorAll('input[value^="main-"]');

            allCheckbox.checked = false;
            leafCheckboxes.forEach(cb => {
                cb.checked = indices.includes(parseInt(cb.value));
            });

            // Sync main-lesson group headers
            mainHeaders.forEach(mainCb => {
                const mainLesson = mainCb.dataset.mainLesson;
                const subOptions = lessonFilterDropdown.querySelectorAll(`.custom-select-sub-option[data-main-lesson="${mainLesson}"] input[type="checkbox"]`);
                mainCb.checked = subOptions.length > 0 && Array.from(subOptions).every(cb => cb.checked);
            });

            // Check if all are selected → check "all"
            if (indices.length >= LESSONS.length) {
                allCheckbox.checked = true;
                leafCheckboxes.forEach(cb => cb.checked = true);
                mainHeaders.forEach(cb => cb.checked = true);
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

        // Group lessons by main lesson number
        const grouped = {};
        LESSONS.forEach((lesson, index) => {
            const mainLesson = Math.floor(lesson.lesson);
            if (!grouped[mainLesson]) grouped[mainLesson] = [];
            grouped[mainLesson].push({ ...lesson, originalIndex: index });
        });

        Object.keys(grouped).sort((a, b) => a - b).forEach(mainLesson => {
            const subLessons = grouped[mainLesson].sort((a, b) => a.lesson - b.lesson);
            const hasMultiple = subLessons.length > 1;

            if (hasMultiple) {
                // Add group header with "whole lesson" checkbox
                const isSpecial = parseInt(mainLesson) >= 900;
                const headerLabel = isSpecial
                    ? subLessons[0].title
                    : `Урок ${mainLesson}`;
                const groupHeader = createCheckboxOption(
                    `main-${mainLesson}`,
                    headerLabel,
                    true
                );
                groupHeader.classList.add('custom-select-group-header');
                const cb = groupHeader.querySelector('input');
                cb.dataset.mainLesson = mainLesson;
                lessonFilterDropdown.appendChild(groupHeader);
            }

            subLessons.forEach((lesson) => {
                const option = createCheckboxOption(
                    lesson.originalIndex,
                    Sidebar.getDisplayTitle(lesson),
                    true
                );
                if (hasMultiple) {
                    option.classList.add('custom-select-sub-option');
                    option.dataset.mainLesson = mainLesson;
                }
                lessonFilterDropdown.appendChild(option);
            });
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
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        // Only count leaf checkboxes (not "all", not "main-*" group headers)
        const leafCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):not([value^="main-"])');
        const checkedLeaf = Array.from(leafCheckboxes).filter(cb => cb.checked);

        if (allCheckbox.checked || checkedLeaf.length === 0 || checkedLeaf.length === leafCheckboxes.length) {
            lessonFilterValue.textContent = 'Все уроки';
            return;
        }

        if (checkedLeaf.length === 1) {
            const id = checkedLeaf[0].value;
            const lesson = LESSONS.find((l, i) => i == id);
            if (lesson) {
                lessonFilterValue.textContent = Sidebar.getDisplayTitle(lesson);
            }
        } else {
            // Check if a whole main lesson is selected (all its sub-lessons)
            const mainLessonHeaders = lessonFilterDropdown.querySelectorAll('input[value^="main-"]:checked');
            if (mainLessonHeaders.length === 1) {
                const header = mainLessonHeaders[0];
                const label = lessonFilterDropdown.querySelector(`label[for="lesson-${header.value}"]`);
                lessonFilterValue.textContent = label ? label.textContent : `📚 Урок ${header.dataset.mainLesson}`;
            } else {
                lessonFilterValue.textContent = `Выбрано: ${checkedLeaf.length}`;
            }
        }
    }

    function getSelectedLessonIndices() {
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        // Only consider leaf checkboxes (not group headers)
        const leafCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):not([value^="main-"])');
        const selectedLeaf = Array.from(leafCheckboxes).filter(cb => cb.checked);

        if (allCheckbox.checked || selectedLeaf.length === 0) {
            return LESSONS.map((_, i) => i);
        }

        return selectedLeaf
            .map(cb => parseInt(cb.value))
            .filter(v => !isNaN(v));
    }

    // ---- Flashcard session ----

    function startSession() {
        const learnedSet = getLearnedSet();
        const studyType = getCurrentStudyType();

        // Reset mix pool
        mixPool = [];
        lessonWordsSinceLastMix = 0;

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

        // Word mixing: store in pool for interval-based insertion (only in lesson mode)
        if (studyType === 'lesson' && mixWordsCheckbox && mixWordsCheckbox.checked) {
            mixPool = getMixWords(sessionWords);
        }

        totalWordsCount = sessionWords.length;
        learnedCount = sessionWords.length - unlearnedWords.length;

        // Build queue from unlearned words only (mixed words come from mixPool at intervals)
        wordQueue = [...unlearnedWords];
        wordQueue.reverse(); // Reverse so pop() returns words in forward order
        if (!shuffleWordsCheckbox || shuffleWordsCheckbox.checked) {
            shuffleArray(wordQueue);
        }

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

        // Mix counter: count every user response
        lessonWordsSinceLastMix++;
        if (lessonWordsSinceLastMix >= 5 && mixPool.length > 0) {
            wordQueue.push(mixPool.pop());
            lessonWordsSinceLastMix = 0;
        }

        if (!currentWord.isMixed) {
            // Mark as learned
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

        // Mix counter: count every user response
        lessonWordsSinceLastMix++;
        if (lessonWordsSinceLastMix >= 5 && mixPool.length > 0) {
            wordQueue.push(mixPool.pop());
            lessonWordsSinceLastMix = 0;
        }

        // Mixed words: don't return to queue — just skip to next
        if (!currentWord.isMixed) {
            wordQueue.unshift(currentWord);
        }

        updateProgress();
        advanceToNext();
    }

    function advanceToNext() {
        if (totalWordsCount > 0 && learnedCount >= totalWordsCount) {
            showComplete();
            return;
        }
        // If lesson words are exhausted but mixPool still has words, drain them
        if (wordQueue.length === 0 && mixPool.length > 0) {
            wordQueue.push(mixPool.pop());
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
                saveGameMode();
                startSession();
            });
        });

        // Mix words checkbox
        if (mixWordsCheckbox) {
            mixWordsCheckbox.addEventListener('change', () => {
                saveSettings();
                startSession();
            });
        }

        // Shuffle words checkbox
        if (shuffleWordsCheckbox) {
            shuffleWordsCheckbox.addEventListener('change', () => {
                saveSettings();
                startSession();
            });
        }

        // Autoplay audio checkbox
        if (autoplayAudioCheckbox) {
            autoplayAudioCheckbox.addEventListener('change', () => {
                saveSettings();
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

                // If clicked on label, prevent the browser from firing a second
                // synthetic click on the checkbox (which would double-toggle it).
                // We'll toggle it manually below instead.
                if (e.target.tagName === 'LABEL') {
                    e.preventDefault();
                }

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
        
        if (settingsResetCurrentBtn) {
            settingsResetCurrentBtn.addEventListener('click', () => {
                if (confirm('Уверены, что хотите сбросить прогресс текущего набора?')) {
                    handleReset();
                    settingsModal.classList.add('hidden');
                }
            });
        }

        if (settingsResetAllBtn) {
            settingsResetAllBtn.addEventListener('click', () => {
                if (confirm('Внимание! Вы собираетесь сбросить ВЕСЬ прогресс по ВСЕМ урокам.\nЭто действие нельзя отменить. Продолжить?')) {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('fc_')) {
                            if (key !== 'fc_last_lesson') {
                                keysToRemove.push(key);
                            }
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    startSession();
                    settingsModal.classList.add('hidden');
                }
            });
        }
    }

    function handleFilterChange(changedCheckbox) {
        const allCheckbox = lessonFilterDropdown.querySelector('input[value="all"]');
        const allSubCheckboxes = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"])');
        const mainLessonCheckboxes = lessonFilterDropdown.querySelectorAll('input[data-main-lesson]');

        if (changedCheckbox.value === 'all') {
            // Toggle everything
            allSubCheckboxes.forEach(cb => cb.checked = allCheckbox.checked);
        } else if (changedCheckbox.dataset.mainLesson && changedCheckbox.value.startsWith('main-')) {
            // Clicked a "whole lesson" group header
            const mainLesson = changedCheckbox.dataset.mainLesson;
            const subOptions = lessonFilterDropdown.querySelectorAll(`.custom-select-sub-option[data-main-lesson="${mainLesson}"] input[type="checkbox"]`);
            subOptions.forEach(cb => cb.checked = changedCheckbox.checked);
            // Update global "all" state
            const leafCbs = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):not([value^="main-"])');
            allCheckbox.checked = Array.from(leafCbs).every(cb => cb.checked);
        } else {
            // Clicked a sub-lesson: sync group header
            const parentMainLesson = changedCheckbox.closest('.custom-select-sub-option')?.dataset.mainLesson;
            if (parentMainLesson) {
                const groupHeaderCb = lessonFilterDropdown.querySelector(`input[value="main-${parentMainLesson}"]`);
                if (groupHeaderCb) {
                    const subOptions = lessonFilterDropdown.querySelectorAll(`.custom-select-sub-option[data-main-lesson="${parentMainLesson}"] input[type="checkbox"]`);
                    const allSubChecked = Array.from(subOptions).every(cb => cb.checked);
                    groupHeaderCb.checked = allSubChecked;
                }
            }
            // Update global "all" state
            const leafCbs = lessonFilterDropdown.querySelectorAll('input[type="checkbox"]:not([value="all"]):not([value^="main-"])');
            allCheckbox.checked = Array.from(leafCbs).every(cb => cb.checked);
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
