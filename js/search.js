// js/search.js — Search & word rendering module
window.Search = (function () {
    let wordsContainer, searchInput;

    function init(elements) {
        wordsContainer = elements.wordsContainer;
        searchInput = elements.searchInput;

        if (searchInput) searchInput.addEventListener('input', handleSearch);
    }

    // Helper to normalize text (remove accents and lower case)
    function normalizeText(text) {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/ё/g, "е")     // Map Russian yo to ye
            .replace(/ει|οι/g, "ι") // Map digraphs to iota
            .replace(/αι/g, "ε")    // Map alpha-iota to epsilon
            .replace(/[ηυ]/g, "ι")  // Map eta and upsilon to iota
            .replace(/ω/g, "ο")     // Map omega to omicron
            .replace(/θ/g, "φ");    // Map theta to phi (for search interchangeability)
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

    // Search functionality
    function handleSearch() {
        const searchTerm = normalizeText(searchInput.value || '').trim();
        const lessonSections = document.querySelectorAll('.lesson-section');

        lessonSections.forEach(section => {
            const cards = section.querySelectorAll('.word-card');
            let anyVisible = false;

            cards.forEach(card => {
                const greek = normalizeText(card.dataset.greek || '');
                const russian = normalizeText(card.dataset.russian || '');

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

    return {
        init,
        renderAllLessons
    };
})();
