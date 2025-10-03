document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const wordCards = document.querySelectorAll('.word-card');

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();

        wordCards.forEach(card => {
            const greek = card.dataset.greek.toLowerCase();
            const russian = card.dataset.russian.toLowerCase();

            if (greek.includes(searchTerm) || russian.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});