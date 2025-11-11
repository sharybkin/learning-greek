// Main application script. Relies on window.LESSONS being available (load js/words/lessons.js first).
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mainContent = document.getElementById('mainContent');
    const lessonMenu = document.getElementById('lessonMenu');
    const wordsContainer = document.getElementById('wordsContainer');
    const searchInput = document.getElementById('searchInput');
    const mainTitle = document.querySelector('.container h1');

    const lessonsView = document.getElementById('lessonsView');
    const selfCheckView = document.getElementById('selfCheckView');
    const gameCard = document.getElementById('gameCard');
    const gameWord = document.getElementById('gameWord');
    const gameTranslation = document.getElementById('gameTranslation');
    const nextWordBtn = document.getElementById('nextWord');
    const modeLessonsBtn = document.getElementById('modeLessons');
    const modeSelfCheckBtn = document.getElementById('modeSelfCheck');
    const playAudioIcon = document.getElementById('playAudioIcon');
    const gameWordFront = document.getElementById('gameWordFront');
    const lessonFilterContainer = document.getElementById('lessonFilterContainer');
    const lessonFilterButton = document.getElementById('lessonFilterButton');
    const lessonFilterValue = document.getElementById('lessonFilterValue');
    const lessonFilterDropdown = document.getElementById('lessonFilterDropdown');
    const autoplayAudioCheckbox = document.getElementById('autoplayAudio');

    let currentWord = null;
    let allWords = [];
    let filteredWords = [];
    let wordQueue = [];
    let currentLesson = null;
    let greekVoice = null;

    // Get the Greek voice, caching it for future use.
    // Voices are loaded asynchronously, so we need to wait for them.
    function getGreekVoice(callback) {
        if (greekVoice) {
            return callback(greekVoice);
        }

        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            greekVoice = voices.find(v => v.lang === 'el-GR');
            if (greekVoice) {
                callback(greekVoice);
            } else {
                console.warn("Greek voice not found, falling back to default.");
                callback(null); // Fallback to default
            }
        };

        // If voices are already loaded, set immediately.
        if (window.speechSynthesis.getVoices().length > 0) {
            setVoice();
        } else {
            // Otherwise, wait for the voiceschanged event.
            window.speechSynthesis.onvoiceschanged = setVoice;
        }
    }

    // Initialize
    function init() {
        renderLessonMenu();
        renderAllLessons();
        setupEventListeners();
        // Pre-warm the Greek voice cache
        getGreekVoice(() => {});
        allWords = getAllWords();
        populateLessonFilter();
        switchView('lessons');
    }

    function populateLessonFilter() {
        if (!lessonFilterDropdown || !window.LESSONS) return;
        lessonFilterDropdown.innerHTML = '';

        // Add "Select All" option
        const allOption = createCheckboxOption('all', 'Все уроки', true);
        lessonFilterDropdown.appendChild(allOption);

        LESSONS.forEach((lesson, index) => {
            const option = createCheckboxOption(index, getDisplayTitle(lesson), true);
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
            const lesson = LESSONS.find((l, i) => i == id)
            if(lesson) {
                lessonFilterValue.textContent = getDisplayTitle(lesson);
            }
        } else {
            lessonFilterValue.textContent = `Выбрано: ${checkboxes.length}`;
        }
    }

    // Render lesson menu
    function renderLessonMenu() {
        if (!lessonMenu || !window.LESSONS) return;
        lessonMenu.innerHTML = '';

        // Group lessons by main lesson number
        const grouped = {};
        LESSONS.forEach((lesson, index) => {
            const mainLesson = Math.floor(lesson.lesson);
            if (!grouped[mainLesson]) grouped[mainLesson] = [];
            grouped[mainLesson].push({ ...lesson, originalIndex: index });
        });

        Object.keys(grouped).sort((a, b) => a - b).forEach(mainLesson => {
            const lessons = grouped[mainLesson];
            const hasSublessons = lessons.length > 1;

            if (hasSublessons) {
                const groupDiv = document.createElement('div');
                // Start lesson groups collapsed by default
                groupDiv.className = 'lesson-group collapsed';

                const groupHeader = document.createElement('div');
                groupHeader.className = 'lesson-group-header';

                const headerTitle = document.createElement('span');
                headerTitle.textContent = `Урок ${mainLesson}`;

                const toggle = document.createElement('span');
                toggle.className = 'lesson-group-toggle';
                toggle.textContent = '▼';

                groupHeader.appendChild(headerTitle);
                groupHeader.appendChild(toggle);

                groupHeader.addEventListener('click', () => {
                    groupDiv.classList.toggle('collapsed');
                });

                const groupContent = document.createElement('div');
                groupContent.className = 'lesson-group-content';

                lessons.forEach(lesson => {
                    const lessonItem = createLessonItem(lesson);
                    groupContent.appendChild(lessonItem);
                });

                groupDiv.appendChild(groupHeader);
                groupDiv.appendChild(groupContent);
                lessonMenu.appendChild(groupDiv);
            } else {
                const lessonItem = createLessonItem(lessons[0]);
                lessonItem.style.paddingLeft = '20px';
                lessonMenu.appendChild(lessonItem);
            }
        });
    }

    // Helper: return a display title for a lesson.
    // If lesson.title exists and lesson.lesson corresponds to a main lesson (e.g. 1.0 or 1),
    // prefix it with "Урок {n} - ". Otherwise prefer the explicit title or default to lesson number.
    function getDisplayTitle(lesson) {
        if (!lesson) return '';
        const rawLesson = lesson.lesson;
        // Determine main lesson number (integer part)
        const main = Math.floor(Number(rawLesson));
        if (lesson.title) {

            if(main === 999) {
                return lesson.title;
            }

            // If title already starts with 'Урок' leave it as-is
            if (/^Урок\s+/i.test(lesson.title)) return lesson.title;
            // For headings, always prefix with main lesson number (so sublessons like 1.1
            // will show as 'Урок 1 - Title')
            return `Урок ${main}: ${lesson.title}`;
        }

        return `Урок ${rawLesson}`;
    }

    // Create lesson item element
    function createLessonItem(lesson) {
        const lessonItem = document.createElement('div');
        lessonItem.className = 'lesson-item';
        lessonItem.dataset.lessonIndex = lesson.originalIndex;

        const title = document.createElement('div');
        title.className = 'lesson-item-title';
        // In the sidebar/menu we want the original behavior: show lesson.title if present,
        // otherwise fallback to `Урок {lesson.lesson}`. Do not prefix sublessons here.
        title.textContent = lesson.title || `Урок ${lesson.lesson}`;

        const count = document.createElement('div');
        count.className = 'lesson-item-count';
        count.textContent = `${lesson.words.length} слов`;

        lessonItem.appendChild(title);
        lessonItem.appendChild(count);

        lessonItem.addEventListener('click', () => {
            scrollToLesson(lesson.originalIndex);
            if (window.innerWidth <= 768) closeSidebar();
        });

        return lessonItem;
    }

    // Render all lessons into the main content
    function renderAllLessons() {
        if (!wordsContainer || !window.LESSONS) return;
        wordsContainer.innerHTML = '';

        LESSONS.forEach((lesson, index) => {
            const lessonSection = document.createElement('section');
            lessonSection.className = 'lesson-section';
            lessonSection.dataset.lesson = lesson.lesson;
            lessonSection.dataset.lessonIndex = index;
            lessonSection.id = `lesson-${index}`;

            const heading = document.createElement('h2');
            heading.textContent = getDisplayTitle(lesson);
            lessonSection.appendChild(heading);

            const list = document.createElement('div');
            list.className = 'lesson-list';

            lesson.words.forEach(w => {
                const card = document.createElement('div');
                card.className = 'word-card';
                card.dataset.greek = w.greek;
                card.dataset.russian = w.russian;

                const greekDiv = document.createElement('div');
                greekDiv.className = 'greek greek-container';

                const greekText = document.createElement('span');
                greekText.textContent = w.greek;

                // Add speaker icon for pronunciation
                const speakerIcon = document.createElement('span');
                speakerIcon.className = 'speaker-icon';
                speakerIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
                speakerIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent card click or other events
                    speak(w.greek);
                });
                greekDiv.appendChild(greekText);
                greekDiv.appendChild(speakerIcon);


                const russianDiv = document.createElement('div');
                russianDiv.className = 'russian';
                russianDiv.textContent = w.russian;

                card.appendChild(greekDiv);
                card.appendChild(russianDiv);
                list.appendChild(card);
            });

            lessonSection.appendChild(list);
            wordsContainer.appendChild(lessonSection);
        });
    }

    // Scroll to specific lesson
    function scrollToLesson(index) {
        const lessonElement = document.getElementById(`lesson-${index}`);
        if (lessonElement) {
            lessonElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateActiveLessonMenuItem(index);
        }
    }

    // Update active lesson menu item
    function updateActiveLessonMenuItem(index) {
        document.querySelectorAll('.lesson-item').forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`.lesson-item[data-lesson-index="${index}"]`);
        if (activeItem) activeItem.classList.add('active');
    }

    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        sidebarToggle.classList.toggle('active');

        if (window.innerWidth > 768) {
            mainContent.classList.toggle('expanded');
        } else {
            sidebarOverlay.classList.toggle('active');
        }
    }

    // Close sidebar (for mobile)
    function closeSidebar() {
        sidebar.classList.add('collapsed');
        sidebarToggle.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = (searchInput.value || '').toLowerCase().trim();
        const lessonSections = document.querySelectorAll('.lesson-section');

        lessonSections.forEach(section => {
            const cards = section.querySelectorAll('.word-card');
            let anyVisible = false;

            cards.forEach(card => {
                const greek = (card.dataset.greek || '').toLowerCase();
                const russian = (card.dataset.russian || '').toLowerCase();
                const matches = !searchTerm || greek.includes(searchTerm) || russian.includes(searchTerm);

                if (matches) {
                    card.classList.remove('hidden');
                    anyVisible = true;
                } else {
                    card.classList.add('hidden');
                }
            });

            if (anyVisible) section.classList.remove('hidden'); else section.classList.add('hidden');
        });
    }

    // Game Mode
    function getAllWords() {
        return window.LESSONS.flatMap(lesson => lesson.words);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
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
        // When the filter is updated, reset the word queue.
        wordQueue = [...filteredWords];
        shuffleArray(wordQueue);
    }

    function getNextWordFromQueue() {
        if (wordQueue.length === 0) {
             if (filteredWords.length === 0) {
                return null;
            }
            console.log("Queue is empty, refilling and shuffling.");
            // Refill and shuffle the queue.
            wordQueue = [...filteredWords];
            shuffleArray(wordQueue);
        }
        // Return the next word from the queue.
        return wordQueue.pop();
    }

    function startSelfCheck(isNext = false, gameMode = null) {
        // Only reset the word queue if this is not a "next word" action
        // (i.e., when changing modes, filters, or switching to the view).
        if (!isNext) {
            updateFilteredWords();
        }

        // If no mode is passed, get it from the DOM (for initialization and 'next word')
        const mode = gameMode || document.querySelector('.game-mode-button.active').dataset.mode;

        if (isNext) {
            gameCard.classList.add('hide-animation');
            gameCard.addEventListener('animationend', () => {
                // The card is now hidden. Reset its state without animation.
                gameCard.classList.add('no-transition');
                gameCard.classList.remove('is-flipped');
                gameCard.classList.remove('hide-animation');

                // Force browser to apply the styles immediately
                void gameCard.offsetHeight;

                // Re-enable transitions and load the new word, which will trigger the intro animation.
                gameCard.classList.remove('no-transition');
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

        // Clear card faces
        gameWord.textContent = '';
        gameTranslation.textContent = '';
        gameWordFront.textContent = '';

        // Front of the card content depends on the mode
        if (gameMode === 'audio') {
            // Front: Speaker icon | Back: Full translation
            playAudioIcon.classList.remove('hidden');
            gameWord.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;

            // Autoplay audio if the setting is enabled and it's a "next word" action
            if (autoplayAudioCheckbox.checked && isNext) {
                // Use a short timeout to let the card animation start
                setTimeout(() => speak(currentWord.greek), 100);
            }
        } else if (gameMode === 'ru-gr') {
            // Front: Russian | Back: Greek
            gameWordFront.textContent = currentWord.russian;
            gameWord.textContent = currentWord.greek;
            playAudioIcon.classList.add('hidden');
        } else if (gameMode === 'gr-ru') {
            // Front: Greek | Back: Russian
            gameWordFront.textContent = currentWord.greek;
            gameTranslation.textContent = currentWord.russian;
            playAudioIcon.classList.add('hidden');
        }
        gameCard.classList.remove('is-flipped');
    }

    function flipCard() {
        gameCard.classList.toggle('is-flipped');
    }

    function speak(text) {
        getGreekVoice(voice => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'el-GR';
            if (voice) {
                utterance.voice = voice;
            }
            window.speechSynthesis.speak(utterance);
        });
    }

    function switchView(view) {
        if (view === 'lessons') {
            mainTitle.classList.remove('hidden');
            lessonsView.classList.remove('hidden');
            selfCheckView.classList.add('hidden');
            modeLessonsBtn.classList.add('active');
            modeSelfCheckBtn.classList.remove('active');
        } else {
            mainTitle.classList.add('hidden');
            lessonsView.classList.add('hidden');
            selfCheckView.classList.remove('hidden');
            modeLessonsBtn.classList.remove('active');
            modeSelfCheckBtn.classList.add('active');
            startSelfCheck();
            gameCard.classList.add('intro-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('intro-animation');
            }, { once: true });
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
        if (searchInput) searchInput.addEventListener('input', handleSearch);

        if (modeLessonsBtn) modeLessonsBtn.addEventListener('click', () => switchView('lessons'));
        if (modeSelfCheckBtn) modeSelfCheckBtn.addEventListener('click', () => switchView('self-check'));

        if (gameCard) gameCard.addEventListener('click', flipCard);
        if (playAudioIcon) playAudioIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            speak(currentWord.greek);
        });
        if (nextWordBtn) nextWordBtn.addEventListener('click', () => startSelfCheck(true));

        // Game settings listeners
        document.querySelectorAll('.game-mode-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.game-mode-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const newMode = button.dataset.mode;
                startSelfCheck(false, newMode);
            });
        });

        if (lessonFilterButton) {
            lessonFilterButton.addEventListener('click', () => {
                lessonFilterDropdown.classList.toggle('hidden');
                lessonFilterContainer.classList.toggle('open');
            });
        }

        if (lessonFilterDropdown) {
            // Handle clicks on the dropdown for better UX
            lessonFilterDropdown.addEventListener('click', (e) => {
                const option = e.target.closest('.custom-select-option');
                if (!option) return;

                const checkbox = option.querySelector('input[type="checkbox"]');
                if (!checkbox) return;

                // Toggle checkbox only if the click was not on the checkbox itself
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }

                // Manually trigger the logic
                handleFilterChange(checkbox);
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
             startSelfCheck(); // This will correctly pick up the active mode from the DOM
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (lessonFilterContainer && !lessonFilterContainer.contains(e.target)) {
                lessonFilterDropdown.classList.add('hidden');
                lessonFilterContainer.classList.remove('open');
            }
        });

        // IntersectionObserver to detect lesson in view
        const observerOptions = { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.dataset.lessonIndex);
                    updateActiveLessonMenuItem(index);
                }
            });
        }, observerOptions);

        // Observe after lessons have been rendered
        document.querySelectorAll('.lesson-section').forEach(section => observer.observe(section));
    }

    init();
});