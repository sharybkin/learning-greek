document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const wordsContainer = document.querySelector('.words-container');

    // Render lessons and words from LESSONS (provided by js/words/lessons.js)
    function renderLessons() {
        if (!window.LESSONS) return;

        wordsContainer.innerHTML = '';

        LESSONS.forEach(lesson => {
            const lessonSection = document.createElement('section');
            lessonSection.className = 'lesson-section';
            lessonSection.dataset.lesson = lesson.lesson;

            const heading = document.createElement('h2');
            heading.textContent = lesson.title ? `${lesson.title}` : `Урок ${lesson.lesson}`;
            lessonSection.appendChild(heading);

            const list = document.createElement('div');
            list.className = 'lesson-list';

            lesson.words.forEach(w => {
                const card = document.createElement('div');
                card.className = 'word-card';
                card.dataset.greek = w.greek;
                card.dataset.russian = w.russian;

                const greekDiv = document.createElement('div');
                greekDiv.className = 'greek';
                greekDiv.textContent = w.greek;

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

    renderLessons();

    // Search across all lessons
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();

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

            // Hide entire lesson section if no cards match
            if (anyVisible) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    });
});