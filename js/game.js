// js/game.js — Flashcard learning module (Quizlet-style)
window.Game = (function () {
    // DOM elements
    let gameCard, gameWord, gameTranslation, gameWordFront;
    let playAudioIcon, playAudioIconBack, autoplayAudioCheckbox;
    let lessonFilterContainer, lessonFilterButton, lessonFilterValue, lessonFilterDropdown;
    let btnRemember, btnForget;
    let fcProgressText, fcProgressFill, fcProgressFillBlue, fcComplete, fcResetBtn;
    let gameScene, gameControls, swipeHint;
    let mixSetting, mixWordsCheckbox, mixedBadge;
    let examBadgeFront, group1BadgeFront, group2BadgeFront, group3BadgeFront;
    let shuffleWordsCheckbox;
    let settingsBtn, settingsModal, closeSettingsBtn;
    let settingsResetCurrentBtn, settingsResetAllBtn;
    let undoBtn;
    let cardExampleFront, cardExampleBack;
    let historyStack = []; // Stack of { word, type: 'remember' | 'forget', learnedCountBefore }
    let swipeIndicatorsRemember = [];
    let swipeIndicatorsForget = [];
    
    // Swipe tracking
    let swipeStartX = 0;
    let swipeStartY = 0;
    let isDraggingCard = false;
    let dragThresholdPassed = false;
    let dragX = 0;
    let dragY = 0;

    // State
    let currentWord = null;
    let allWords = [];       // [{greek, russian, lessonIndex, wordIndex, id}, ...]
    let wordQueue = [];      // current queue of words to study
    let totalWordsCount = 0; // total words for current session
    let learnedCount = 0;    // words learned in current session
    let seenUnlearnedWords = new Set(); // words seen but not yet learned in current session
    let wordsRemainingInCycle = 0; // count of non-mixed words left before the current cycle restarts
    let mixPool = [];         // pool of mixed words to insert at intervals
    let lessonWordsSinceLastMix = 0; // counter for interval-based mixing
    let isTransitioning = false; // block rapid clicks during animations
    let isFirstLoadOfSession = true;

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
        playAudioIconBack = elements.playAudioIconBack;
        autoplayAudioCheckbox = elements.autoplayAudioCheckbox;
        lessonFilterContainer = elements.lessonFilterContainer;
        lessonFilterButton = elements.lessonFilterButton;
        lessonFilterValue = elements.lessonFilterValue;
        lessonFilterDropdown = elements.lessonFilterDropdown;
        btnRemember = elements.btnRemember;
        btnForget = elements.btnForget;
        fcProgressText = elements.fcProgressText;
        fcProgressFill = elements.fcProgressFill;
        fcProgressFillBlue = elements.fcProgressFillBlue;
        fcComplete = elements.fcComplete;
        fcResetBtn = elements.fcResetBtn;
        gameScene = elements.gameScene;
        gameControls = elements.gameControls;
        swipeHint = document.getElementById('swipeHint');
        mixSetting = elements.mixSetting;
        mixWordsCheckbox = elements.mixWordsCheckbox;
        mixedBadge = elements.mixedBadge;
        examBadgeFront = document.getElementById('examBadgeFront');
        group1BadgeFront = document.getElementById('group1BadgeFront');
        group2BadgeFront = document.getElementById('group2BadgeFront');
        group3BadgeFront = document.getElementById('group3BadgeFront');
        shuffleWordsCheckbox = document.getElementById('shuffleWords');

        settingsBtn = document.getElementById('settingsBtn');
        settingsModal = document.getElementById('settingsModal');
        closeSettingsBtn = document.getElementById('closeSettingsBtn');
        settingsResetCurrentBtn = document.getElementById('settingsResetCurrentBtn');
        settingsResetAllBtn = document.getElementById('settingsResetAllBtn');
        undoBtn = document.getElementById('undoBtn');
        
        swipeIndicatorsRemember = document.querySelectorAll('.indicator-remember');
        swipeIndicatorsForget = document.querySelectorAll('.indicator-forget');
        cardExampleFront = document.getElementById('cardExampleFront');
        cardExampleBack = document.getElementById('cardExampleBack');

        allWords = buildAllWords();
        populateLessonFilter();
        setupEventListeners();
        setupSwipeListeners();
        restoreSettings();
        restoreGameMode();
        restoreLastLesson();
        updateUndoButtonVisibility();
    }

    // Build flat array of all words with IDs
    function buildAllWords() {
        const words = [];
        window.LESSONS.forEach((lesson, lessonIndex) => {
            lesson.words.forEach((word, wordIndex) => {
                words.push({
                    greek: word.greek,
                    russian: word.russian,
                    exam: word.exam === true,
                    group: word.group || 1,
                    example_greek: word.example_greek || '',
                    example_russian: word.example_russian || '',
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
                if (cb.value === 'exam' || cb.value === 'group1' || cb.value === 'group2' || cb.value === 'group3') {
                    cb.checked = indices.includes(cb.value);
                } else {
                    cb.checked = indices.includes(parseInt(cb.value));
                }
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

    function saveQueueState() {
        const key = getStorageKey() + '_state';
        
        if (wordQueue.length === 0 && !currentWord && mixPool.length === 0) {
            localStorage.removeItem(key);
            return;
        }

        const queueToSave = [...wordQueue];
        if (currentWord) {
            queueToSave.push(currentWord);
        }

        const state = {
            queue: queueToSave.map(w => w.id),
            mixPool: mixPool.map(w => w.id),
            seen: Array.from(seenUnlearnedWords),
            sinceMix: lessonWordsSinceLastMix
        };
        localStorage.setItem(key, JSON.stringify(state));
    }

    // ---- Lesson filter ----

    function populateLessonFilter() {
        if (!lessonFilterDropdown || !window.LESSONS) return;
        lessonFilterDropdown.innerHTML = '';

        const allOption = createCheckboxOption('all', 'Все уроки', true);
        lessonFilterDropdown.appendChild(allOption);

        const group1Option = createCheckboxOption('group1', '🥇 Очень частые', true);
        lessonFilterDropdown.appendChild(group1Option);

        const group2Option = createCheckboxOption('group2', '🥈 Частые', true);
        lessonFilterDropdown.appendChild(group2Option);

        const group3Option = createCheckboxOption('group3', '🥉 Редкие', true);
        lessonFilterDropdown.appendChild(group3Option);

        const examOption = createCheckboxOption('exam', '🎓 Экзамен', true);
        lessonFilterDropdown.appendChild(examOption);

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
            const val = checkedLeaf[0].value;
            if (val === 'group1') {
                lessonFilterValue.textContent = '🥇 Очень частые';
            } else if (val === 'group2') {
                lessonFilterValue.textContent = '🥈 Частые';
            } else if (val === 'group3') {
                lessonFilterValue.textContent = '🥉 Редкие';
            } else if (val === 'exam') {
                lessonFilterValue.textContent = '🎓 Экзамен';
            } else {
                const lesson = LESSONS.find((l, i) => i == val);
                if (lesson) {
                    lessonFilterValue.textContent = Sidebar.getDisplayTitle(lesson);
                }
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
            .map(cb => {
                if (cb.value === 'exam' || cb.value === 'group1' || cb.value === 'group2' || cb.value === 'group3') return cb.value;
                return parseInt(cb.value);
            })
            .filter(v => v === 'exam' || v === 'group1' || v === 'group2' || v === 'group3' || !isNaN(v));
    }

    // ---- Flashcard session ----

    function startSession() {
        const learnedSet = getLearnedSet();
        const studyType = getCurrentStudyType();

        // Reset mix pool
        mixPool = [];
        lessonWordsSinceLastMix = 0;
        seenUnlearnedWords.clear();
        historyStack = [];
        updateUndoButtonVisibility();

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
            const selectedVals = getSelectedLessonIndices();
            const includeGroup1 = selectedVals.includes('group1');
            const includeGroup2 = selectedVals.includes('group2');
            const includeGroup3 = selectedVals.includes('group3');
            const includeExam = selectedVals.includes('exam');
            const selectedLessons = selectedVals.filter(v => typeof v === 'number');

            sessionWords = allWords.filter(w => {
                if (includeGroup1 && w.group === 1) return true;
                if (includeGroup2 && w.group === 2) return true;
                if (includeGroup3 && w.group === 3) return true;
                if (includeExam && w.exam) return true;
                if (selectedLessons.includes(w.lessonIndex)) return true;
                return false;
            });
        }

        // Filter out already learned words
        const unlearnedWords = sessionWords.filter(w => !learnedSet.has(w.id));

        const stateKey = getStorageKey() + '_state';
        let loadedState = null;
        try {
            loadedState = JSON.parse(localStorage.getItem(stateKey));
        } catch (e) {}

        if (loadedState && loadedState.queue && loadedState.queue.length > 0) {
            const idMap = new Map();
            allWords.forEach(w => idMap.set(w.id, w));

            wordQueue = loadedState.queue
                .map(id => {
                    const w = idMap.get(id);
                    if (!w) return null;
                    const isSessionWord = sessionWords.some(sw => sw.id === id);
                    return { ...w, isMixed: !isSessionWord };
                })
                .filter(w => w !== null && !learnedSet.has(w.id));

            mixPool = (loadedState.mixPool || [])
                .map(id => idMap.get(id))
                .filter(w => w !== null && !learnedSet.has(w.id))
                .map(w => ({ ...w, isMixed: true }));

            lessonWordsSinceLastMix = loadedState.sinceMix || 0;
            
            seenUnlearnedWords = new Set((loadedState.seen || []).filter(id => {
                return wordQueue.some(w => w.id === id);
            }));

            // Add any new unlearned words that are missing from the loaded queue
            const queueIds = new Set(wordQueue.map(w => w.id));
            const newWords = unlearnedWords.filter(w => !queueIds.has(w.id));
            if (newWords.length > 0) {
                if (!shuffleWordsCheckbox || shuffleWordsCheckbox.checked) {
                    shuffleArray(newWords);
                }
                newWords.reverse().forEach(w => wordQueue.push(w));
            }
        } else {
            // Word mixing: store in pool for interval-based insertion (only in lesson mode)
            if (studyType === 'lesson' && mixWordsCheckbox && mixWordsCheckbox.checked) {
                mixPool = getMixWords(sessionWords);
            }

            // Build queue from unlearned words only
            wordQueue = [...unlearnedWords];
            wordQueue.reverse(); // Reverse so pop() returns words in forward order
            if (!shuffleWordsCheckbox || shuffleWordsCheckbox.checked) {
                shuffleArray(wordQueue);
            }
        }

        totalWordsCount = sessionWords.length;
        learnedCount = sessionWords.length - unlearnedWords.length;

        wordsRemainingInCycle = wordQueue.filter(w => !w.isMixed).length;
        isTransitioning = false;

        updateProgress();

        if (totalWordsCount > 0 && learnedCount >= totalWordsCount) {
            showComplete();
        } else if (wordQueue.length === 0) {
            showComplete();
        } else {
            hideComplete();
            // Pass false for isNext to prevent audio auto-play on load
            showNextCard(false, false);
            triggerNudgeHint();
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
        if (!currentWord || isTransitioning) return;
        isTransitioning = true;

        pushHistory('remember');

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
            seenUnlearnedWords.delete(currentWord.id);
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
        if (!currentWord || isTransitioning) return;
        isTransitioning = true;

        pushHistory('forget');

        // Mix counter: count every user response
        lessonWordsSinceLastMix++;
        if (lessonWordsSinceLastMix >= 5 && mixPool.length > 0) {
            wordQueue.push(mixPool.pop());
            lessonWordsSinceLastMix = 0;
        }

        // Mixed words: don't return to queue — just skip to next
        if (!currentWord.isMixed) {
            seenUnlearnedWords.add(currentWord.id);
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
                    isTransitioning = false;
                }, { once: true });
            }, { once: true });
        } else {
            loadNewWord(isNext);
            gameCard.classList.add('intro-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('intro-animation');
                isTransitioning = false;
            }, { once: true });
        }
    }

    function loadNewWord(isNext = true) {
        if (wordsRemainingInCycle <= 0 && wordQueue.length > 0) {
            seenUnlearnedWords.clear();
            wordsRemainingInCycle = wordQueue.filter(w => !w.isMixed).length;
            updateProgress();
        }

        currentWord = wordQueue.pop();

        if (currentWord && currentWord.isMixed) {
            if (mixedBadge) mixedBadge.classList.remove('hidden');
        } else {
            if (mixedBadge) mixedBadge.classList.add('hidden');
        }

        if (currentWord && currentWord.exam) {
            if (examBadgeFront) examBadgeFront.classList.remove('hidden');
        } else {
            if (examBadgeFront) examBadgeFront.classList.add('hidden');
        }

        if (group1BadgeFront) group1BadgeFront.classList.add('hidden');
        if (group2BadgeFront) group2BadgeFront.classList.add('hidden');
        if (group3BadgeFront) group3BadgeFront.classList.add('hidden');

        if (currentWord && currentWord.group === 1) {
            if (group1BadgeFront) group1BadgeFront.classList.remove('hidden');
        } else if (currentWord && currentWord.group === 2) {
            if (group2BadgeFront) group2BadgeFront.classList.remove('hidden');
        } else if (currentWord && currentWord.group === 3) {
            if (group3BadgeFront) group3BadgeFront.classList.remove('hidden');
        }

        if (currentWord && !currentWord.isMixed) {
            wordsRemainingInCycle--;
        }

        if (!currentWord) {
            gameWord.textContent = 'Нет слов';
            gameTranslation.textContent = '';
            gameWordFront.textContent = '';
            playAudioIcon.classList.add('hidden');
            if (playAudioIconBack) playAudioIconBack.classList.add('hidden');
            return;
        }

        gameWord.textContent = '';
        gameTranslation.textContent = '';
        gameWordFront.textContent = '';
        if (cardExampleFront) { cardExampleFront.textContent = ''; cardExampleFront.classList.add('hidden'); }
        if (cardExampleBack) { cardExampleBack.textContent = ''; cardExampleBack.classList.add('hidden'); }

        const mode = currentGameMode;

        if (mode === 'audio') {
            // Front: speaker icon (plays audio). Show Russian example as a contextual hint.
            // Back: Greek word + Russian translation. Show Greek example.
            playAudioIcon.classList.remove('hidden');
            playAudioIcon.classList.remove('speaker-corner');
            if (playAudioIconBack) playAudioIconBack.classList.add('hidden');
            gameWord.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;

            if (cardExampleFront) {
                cardExampleFront.textContent = currentWord.example_russian || '';
                cardExampleFront.classList.toggle('hidden', !currentWord.example_russian);
            }
            if (cardExampleBack) {
                cardExampleBack.textContent = currentWord.example_greek || '';
                cardExampleBack.classList.toggle('hidden', !currentWord.example_greek);
            }

            if (autoplayAudioCheckbox.checked && isNext) {
                setTimeout(() => Speech.speak(currentWord.greek), 100);
            }
        } else if (mode === 'ru-gr') {
            // Front: Russian word. Show Russian example.
            // Back: Greek word. Show Greek example.
            playAudioIcon.classList.add('hidden');
            playAudioIcon.classList.remove('speaker-corner');
            if (playAudioIconBack) playAudioIconBack.classList.remove('hidden');
            gameWordFront.textContent = currentWord.russian;
            gameWord.textContent = currentWord.greek;

            if (cardExampleFront) {
                cardExampleFront.textContent = currentWord.example_russian || '';
                cardExampleFront.classList.toggle('hidden', !currentWord.example_russian);
            }
            if (cardExampleBack) {
                cardExampleBack.textContent = currentWord.example_greek || '';
                cardExampleBack.classList.toggle('hidden', !currentWord.example_greek);
            }
        } else if (mode === 'gr-ru') {
            // Front: Greek word. Show Greek example.
            // Back: Russian translation. Show Russian example.
            playAudioIcon.classList.remove('hidden');
            playAudioIcon.classList.add('speaker-corner');
            if (playAudioIconBack) playAudioIconBack.classList.add('hidden');
            gameWordFront.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;

            if (cardExampleFront) {
                cardExampleFront.textContent = currentWord.example_greek || '';
                cardExampleFront.classList.toggle('hidden', !currentWord.example_greek);
            }
            if (cardExampleBack) {
                cardExampleBack.textContent = currentWord.example_russian || '';
                cardExampleBack.classList.toggle('hidden', !currentWord.example_russian);
            }
        }
        gameCard.classList.remove('is-flipped');
        
        saveQueueState();
    }

    // ---- Progress UI ----

    function updateProgress() {
        const percent = totalWordsCount > 0 ? Math.round((learnedCount / totalWordsCount) * 100) : 0;
        const blueCount = learnedCount + seenUnlearnedWords.size;
        const bluePercent = totalWordsCount > 0 ? Math.round((blueCount / totalWordsCount) * 100) : 0;
        
        fcProgressText.textContent = `Выучено: ${learnedCount} / ${totalWordsCount}`;
        fcProgressFill.style.width = `${percent}%`;
        if (fcProgressFillBlue) fcProgressFillBlue.style.width = `${bluePercent}%`;
    }

    function showComplete() {
        currentWord = null;
        saveQueueState();
        if (gameScene) gameScene.classList.add('hidden');
        if (gameControls) gameControls.classList.add('hidden');
        if (swipeHint) swipeHint.classList.add('hidden');
        fcComplete.classList.remove('hidden');
    }

    function hideComplete() {
        if (gameScene) gameScene.classList.remove('hidden');
        if (gameControls) gameControls.classList.remove('hidden');
        if (swipeHint) swipeHint.classList.remove('hidden');
        fcComplete.classList.add('hidden');
    }

    function handleReset() {
        clearLearnedSet();
        const stateKey = getStorageKey() + '_state';
        localStorage.removeItem(stateKey);
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
        if (gameCard) gameCard.addEventListener('click', (e) => {
            if (dragThresholdPassed) return;
            flipCard();
        });

        // Audio play (front face — audio mode)
        if (playAudioIcon) playAudioIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentWord) Speech.speak(currentWord.greek);
        });

        // Audio play (back face — ru-gr / gr-ru modes)
        if (playAudioIconBack) playAudioIconBack.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentWord) Speech.speak(currentWord.greek);
        });

        // Remember / Forget
        if (btnRemember) btnRemember.addEventListener('click', handleRemember);
        if (btnForget) btnForget.addEventListener('click', handleForget);

        // Undo
        if (undoBtn) undoBtn.addEventListener('click', handleUndo);

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
                if (currentGameMode === 'audio') {
                    Speech.startKeepAlive();
                } else {
                    Speech.stopKeepAlive();
                }
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

    // ---- Animations & Visual Affordance ----

    function triggerNudgeHint() {
        if (!isFirstLoadOfSession || !gameCard) return;
        isFirstLoadOfSession = false; // only run once per full application life or reset
        
        setTimeout(() => {
            // Ensure we don't overlap animations
            gameCard.classList.add('nudge-hint');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('nudge-hint');
            }, { once: true });
        }, 600); // allow intro-animation (300ms) to fully resolve first
    }

    // ---- History / Undo Logic ----

    function pushHistory(type) {
        if (!currentWord) return;
        
        // Store only last 5 events
        if (historyStack.length >= 5) {
            historyStack.shift();
        }
        
        historyStack.push({
            word: { ...currentWord },
            type: type,
            lessonWordsSinceLastMix: lessonWordsSinceLastMix
        });
        updateUndoButtonVisibility();
    }

    function updateUndoButtonVisibility() {
        if (undoBtn) {
            if (historyStack.length > 0) {
                undoBtn.classList.remove('hidden');
            } else {
                undoBtn.classList.add('hidden');
            }
        }
    }

    function handleUndo() {
        if (historyStack.length === 0 || isTransitioning) return;
        
        const lastAction = historyStack.pop();
        hideComplete();

        // 1. Move current card back onto top of the work queue
        if (currentWord) {
            wordQueue.push(currentWord);
        }

        const word = lastAction.word;

        // 2. Roll back states
        if (lastAction.type === 'remember') {
            if (!word.isMixed) {
                const learnedSet = getLearnedSet();
                learnedSet.delete(word.id);
                saveLearnedSet(learnedSet);
                learnedCount--;
                seenUnlearnedWords.add(word.id); // Restore it back as seen but not learned
            } else {
                const reviewKey = `fc_${currentGameMode}_review`;
                try {
                    const data = localStorage.getItem(reviewKey);
                    if (data) {
                        let reviewLearned = new Set(JSON.parse(data));
                        reviewLearned.delete(word.id);
                        localStorage.setItem(reviewKey, JSON.stringify([...reviewLearned]));
                    }
                } catch (e) {}
            }
        } else if (lastAction.type === 'forget') {
            if (!word.isMixed) {
                seenUnlearnedWords.delete(word.id); // It was added to seen but now we take it back
                // Remove from the back end of the processing where unshift put it
                wordQueue = wordQueue.filter(w => w.id !== word.id);
            }
        }

        lessonWordsSinceLastMix = lastAction.lessonWordsSinceLastMix;

        // 3. Put the historical word explicitly back at the end so pop() picks it next
        wordQueue.push(word);
        
        isTransitioning = true;
        updateProgress();
        updateUndoButtonVisibility();
        
        // Perform card showing routine
        showNextCard(true, false);
    }

    // ---- Swipe Gesture Logic ----

    function setupSwipeListeners() {
        if (!gameCard) return;

        const threshold = window.innerWidth * 0.25; // 25% of viewport width is swipe

        gameCard.addEventListener('touchstart', handleTouchStart, { passive: true });
        gameCard.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameCard.addEventListener('touchend', handleTouchEnd);

        gameCard.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        function handleTouchStart(e) {
            if (isTransitioning) return;
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        }

        function handleTouchMove(e) {
            if (!isDraggingCard) return;
            const touch = e.touches[0];
            const curDragX = touch.clientX - swipeStartX;
            const curDragY = touch.clientY - swipeStartY;

            // Prevent page scrolling if the user is definitively dragging horizontally
            if (Math.abs(curDragX) > Math.abs(curDragY) || Math.abs(curDragX) > 10) {
                if (e.cancelable) e.preventDefault();
            }
            moveDrag(touch.clientX, touch.clientY);
        }

        function handleTouchEnd() {
            endDrag();
        }

        function handleMouseDown(e) {
            if (isTransitioning || e.button !== 0) return;
            // Ignore interaction if it started on internal components
            if (e.target.closest('.speaker-icon') || e.target.closest('.badge-icon')) return;
            
            startDrag(e.clientX, e.clientY);
        }

        function handleMouseMove(e) {
            if (!isDraggingCard) return;
            moveDrag(e.clientX, e.clientY);
        }

        function handleMouseUp() {
            if (isDraggingCard) endDrag();
        }

        function startDrag(x, y) {
            isDraggingCard = true;
            dragThresholdPassed = false;
            swipeStartX = x;
            swipeStartY = y;
            gameCard.classList.add('is-swiping');
        }

        function moveDrag(x, y) {
            dragX = x - swipeStartX;
            dragY = y - swipeStartY;

            // Check threshold to block click flip
            if (Math.abs(dragX) > 10 || Math.abs(dragY) > 10) {
                dragThresholdPassed = true;
            }

            const rot = dragX * 0.08; // Rotate a little
            const currentRotY = gameCard.classList.contains('is-flipped') ? 180 : 0;
            
            // Transform the card while maintaining preserving 3d context logic
            gameCard.style.transform = `translateX(${dragX}px) translateY(${dragY * 0.2}px) rotateZ(${rot}deg) rotateY(${currentRotY}deg)`;
            
            // Visual Feedback: Drive swipe stamps opacity & scale
            const opacityRemember = Math.min(1, Math.max(0, dragX / 100)); // Fade completely in by 100px
            const opacityForget = Math.min(1, Math.max(0, -dragX / 100));
            
            swipeIndicatorsRemember.forEach(el => {
                el.style.opacity = opacityRemember;
                // Added translateZ(1px) to guarantee layer stacking over the card surface on Safari
                el.style.transform = `translate(-50%, -50%) translateZ(1px) rotate(-15deg) scale(${0.8 + opacityRemember * 0.3})`;
            });
            
            swipeIndicatorsForget.forEach(el => {
                el.style.opacity = opacityForget;
                el.style.transform = `translate(-50%, -50%) translateZ(1px) rotate(15deg) scale(${0.8 + opacityForget * 0.3})`;
            });
        }

        function endDrag() {
            isDraggingCard = false;
            gameCard.classList.remove('is-swiping');

            // Reset stamps immediately
            swipeIndicatorsRemember.forEach(el => { el.style.opacity = '0'; el.style.transform = ''; });
            swipeIndicatorsForget.forEach(el => { el.style.opacity = '0'; el.style.transform = ''; });

            const travelDist = dragX;
            dragX = 0;
            dragY = 0;

            // Wait a split second before resetting threshold to let native 'click' be suppressed
            setTimeout(() => {
                dragThresholdPassed = false;
            }, 50);

            const dynamicThreshold = Math.max(80, window.innerWidth * 0.20);

            if (Math.abs(travelDist) > dynamicThreshold) {
                // Snap inline transform away so existing handle transitions can operate cleanly
                gameCard.style.transform = '';
                if (travelDist > 0) {
                    handleRemember();
                } else {
                    handleForget();
                }
            } else {
                // Snap card back inline (transition automatically applies because is-swiping class removed)
                gameCard.style.transform = '';
            }
        }
    }

    return {
        init,
        startSelfCheck: startSession,
        updateAutoplayVisibility
    };
})();
