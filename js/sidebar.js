// js/sidebar.js — Sidebar & lesson menu module
window.Sidebar = (function () {
    let sidebar, sidebarToggle, sidebarOverlay, mainContent, lessonMenu;

    function init(elements) {
        sidebar = elements.sidebar;
        sidebarToggle = elements.sidebarToggle;
        sidebarOverlay = elements.sidebarOverlay;
        mainContent = elements.mainContent;
        lessonMenu = elements.lessonMenu;

        if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Helper: return a display title for a lesson.
    function getDisplayTitle(lesson) {
        if (!lesson) return '';
        const rawLesson = lesson.lesson;
        const main = Math.floor(Number(rawLesson));
        if (lesson.title) {
            // For special lessons (>= 900), just show Title - Subtitle
            if (main >= 900) {
                let display = lesson.title;
                if (lesson.subtitle) {
                    display += ` - ${lesson.subtitle}`;
                }
                return display;
            }

            // If title already starts with 'Урок' leave it as-is
            if (/^Урок\s+/i.test(lesson.title)) return lesson.title;

            let displayTitle = `Урок ${main}: ${lesson.title}`;
            if (lesson.subtitle) {
                displayTitle += ` - ${lesson.subtitle}`;
            }
            return displayTitle;
        }

        return `Урок ${rawLesson}`;
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
                groupDiv.className = 'lesson-group collapsed';

                const groupHeader = document.createElement('div');
                groupHeader.className = 'lesson-group-header';

                const headerTitle = document.createElement('span');
                if (mainLesson >= 900 && lessons.length > 0) {
                    headerTitle.textContent = lessons[0].title;
                } else {
                    headerTitle.textContent = `Урок ${mainLesson}`;
                }

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

    // Create lesson item element
    function createLessonItem(lesson) {
        const lessonItem = document.createElement('div');
        lessonItem.className = 'lesson-item';
        lessonItem.dataset.lessonIndex = lesson.originalIndex;

        const title = document.createElement('div');
        title.className = 'lesson-item-title';
        if (lesson.subtitle) {
            title.textContent = lesson.subtitle;
        } else {
            title.textContent = lesson.title || `Урок ${lesson.lesson}`;
        }

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

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        sidebarToggle.classList.toggle('active');

        if (window.innerWidth > 768) {
            mainContent.classList.toggle('expanded');
        } else {
            sidebarOverlay.classList.toggle('active');
        }
    }

    function closeSidebar() {
        sidebar.classList.add('collapsed');
        sidebarToggle.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    // Setup IntersectionObserver to detect lesson in view
    function setupScrollObserver() {
        const observerOptions = { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.dataset.lessonIndex);
                    updateActiveLessonMenuItem(index);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.lesson-section').forEach(section => observer.observe(section));
    }

    return {
        init,
        getDisplayTitle,
        renderLessonMenu,
        setupScrollObserver
    };
})();
