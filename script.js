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

    let currentLesson = null;

    // Get voices, waiting for them to be loaded
    function getVoices() {
        return new Promise(resolve => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length) {
                resolve(voices);
                return;
            }
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve(voices);
            };
        });
    }

    // Speak a Greek word
    async function speakGreek(text) {
        if (!text) return;

        const voices = await getVoices();
        const greekVoice = voices.find(voice => voice.lang === 'el-GR');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'el-GR';

        if (greekVoice) {
            utterance.voice = greekVoice;
        } else {
            console.warn('Greek voice not found, using default.');
        }

        window.speechSynthesis.speak(utterance);
    }


    // Initialize
    function init() {
        renderLessonMenu();
        renderAllLessons();
        setupEventListeners();

        // Pre-warm the voices list. Some browsers require a call to getVoices() first.
        window.speechSynthesis.getVoices();
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
                    speakGreek(w.greek);
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

    // Setup event listeners
    function setupEventListeners() {
        if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
        if (searchInput) searchInput.addEventListener('input', handleSearch);

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