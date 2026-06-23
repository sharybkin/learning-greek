// js/search.js — Search & word rendering module
window.Search = (function () {
    let wordsContainer, searchInput;
    let searchTimeout;

    function init(elements) {
        wordsContainer = elements.wordsContainer;
        searchInput = elements.searchInput;

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(handleSearch, 150);
            });
        }
    }

    // Helper to normalize text (remove accents and lower case)
    function normalizeText(text) {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/ё/g, "е")     // Map Russian yo to ye
            .replace(/ς/g, "σ")     // Map final sigma to regular sigma
            .replace(/ει|οι/g, "ι") // Map digraphs to iota
            .replace(/αι/g, "ε")    // Map alpha-iota to epsilon
            .replace(/[ηυ]/g, "ι")  // Map eta and upsilon to iota
            .replace(/ω/g, "ο")     // Map omega to omicron
            .replace(/θ/g, "φ");    // Map theta to phi (for search interchangeability)
    }

    // Helper: generate medal SVG for a group
    function getMedalSvg(group) {
        if (group === 1) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style="vertical-align: middle;" title="Очень частое слово">
                <path d="M7.5 13.5 L4.5 22.5 L12 19.5 L19.5 22.5 L16.5 13.5 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="0.8" stroke-linejoin="round"/>
                <circle cx="12" cy="8.5" r="7.5" fill="#F1C40F" stroke="#D68910" stroke-width="1"/>
                <circle cx="12" cy="8.5" r="5.5" fill="none" stroke="#D68910" stroke-width="0.5" stroke-dasharray="1 1"/>
                <text x="12" y="11.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="900" fill="#7E5109" text-anchor="middle">1</text>
            </svg>`;
        } else if (group === 2) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style="vertical-align: middle;" title="Частое слово">
                <path d="M7.5 13.5 L4.5 22.5 L12 19.5 L19.5 22.5 L16.5 13.5 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="0.8" stroke-linejoin="round"/>
                <circle cx="12" cy="8.5" r="7.5" fill="#ECF0F1" stroke="#BDC3C7" stroke-width="1"/>
                <circle cx="12" cy="8.5" r="5.5" fill="none" stroke="#BDC3C7" stroke-width="0.5" stroke-dasharray="1 1"/>
                <text x="12" y="11.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="900" fill="#2C3E50" text-anchor="middle">2</text>
            </svg>`;
        } else if (group === 3) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style="vertical-align: middle;" title="Редкое слово">
                <path d="M7.5 13.5 L4.5 22.5 L12 19.5 L19.5 22.5 L16.5 13.5 Z" fill="#E74C3C" stroke="#C0392B" stroke-width="0.8" stroke-linejoin="round"/>
                <circle cx="12" cy="8.5" r="7.5" fill="#E59866" stroke="#BA4A00" stroke-width="1"/>
                <circle cx="12" cy="8.5" r="5.5" fill="none" stroke="#BA4A00" stroke-width="0.5" stroke-dasharray="1 1"/>
                <text x="12" y="11.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="900" fill="#4A2305" text-anchor="middle">3</text>
            </svg>`;
        }
        return '';
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
            heading.textContent = Sidebar.getDisplayTitle(lesson);
            lessonSection.appendChild(heading);

            const list = document.createElement('div');
            list.className = 'lesson-list';

            lesson.words.forEach(w => {
                const card = document.createElement('div');
                card.className = 'word-card';
                card.dataset.greek = w.greek;
                card.dataset.russian = w.russian;
                card.dataset.greekNorm = normalizeText(w.greek);
                card.dataset.russianNorm = normalizeText(w.russian);

                const greekDiv = document.createElement('div');
                greekDiv.className = 'greek greek-container';

                const greekText = document.createElement('span');
                greekText.textContent = w.greek;

                // Add speaker icon for pronunciation
                const speakerIcon = document.createElement('span');
                speakerIcon.className = 'speaker-icon';
                speakerIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
                speakerIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Speech.speak(w.greek);
                });
                greekDiv.appendChild(greekText);
                greekDiv.appendChild(speakerIcon);

                // Create Russian container to house text & right-aligned badges
                const russianContainer = document.createElement('div');
                russianContainer.className = 'russian-container';

                const russianDiv = document.createElement('div');
                russianDiv.className = 'russian';
                russianDiv.textContent = w.russian;

                // Add Badges container
                const badgesDiv = document.createElement('div');
                badgesDiv.className = 'word-card-badges';

                if (w.exam) {
                    const examSpan = document.createElement('span');
                    examSpan.className = 'word-card-badge-icon';
                    examSpan.textContent = '🎓';
                    examSpan.title = 'Слово из экзамена';
                    badgesDiv.appendChild(examSpan);
                }

                const medalSvg = getMedalSvg(w.group);
                if (medalSvg) {
                    const medalSpan = document.createElement('span');
                    medalSpan.className = 'word-card-badge-icon';
                    medalSpan.innerHTML = medalSvg;
                    badgesDiv.appendChild(medalSpan);
                }

                russianContainer.appendChild(russianDiv);
                if (badgesDiv.childNodes.length > 0) {
                    russianContainer.appendChild(badgesDiv);
                }

                card.appendChild(greekDiv);
                card.appendChild(russianContainer);
                list.appendChild(card);
            });

            lessonSection.appendChild(list);
            wordsContainer.appendChild(lessonSection);
        });
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = normalizeText(searchInput.value || '').trim();
        const lessonSections = document.querySelectorAll('.lesson-section');

        requestAnimationFrame(() => {
            lessonSections.forEach(section => {
                const cards = section.querySelectorAll('.word-card');
                let anyVisible = false;

                cards.forEach(card => {
                    const greekNorm = card.dataset.greekNorm || '';
                    const russianNorm = card.dataset.russianNorm || '';

                    const matches = !searchTerm || greekNorm.includes(searchTerm) || russianNorm.includes(searchTerm);

                    if (matches) {
                        if (card.classList.contains('hidden')) {
                            card.classList.remove('hidden');
                        }
                        anyVisible = true;
                    } else {
                        if (!card.classList.contains('hidden')) {
                            card.classList.add('hidden');
                        }
                    }
                });

                if (anyVisible) {
                    if (section.classList.contains('hidden')) {
                        section.classList.remove('hidden');
                    }
                } else {
                    if (!section.classList.contains('hidden')) {
                        section.classList.add('hidden');
                    }
                }
            });
        });
    }

    return {
        init,
        renderAllLessons
    };
})();
