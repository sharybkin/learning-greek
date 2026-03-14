// js/app.js — Application entry point & orchestrator
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const mainTitle = document.querySelector('.container h1');
    const lessonsView = document.getElementById('lessonsView');
    const selfCheckView = document.getElementById('selfCheckView');
    const modeLessonsBtn = document.getElementById('modeLessons');
    const modeSelfCheckBtn = document.getElementById('modeSelfCheck');
    const gameCard = document.getElementById('gameCard');

    // Initialize modules
    Sidebar.init({
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        mainContent: document.getElementById('mainContent'),
        lessonMenu: document.getElementById('lessonMenu')
    });

    Search.init({
        wordsContainer: document.getElementById('wordsContainer'),
        searchInput: document.getElementById('searchInput')
    });

    Game.init({
        gameCard: gameCard,
        gameWord: document.getElementById('gameWord'),
        gameTranslation: document.getElementById('gameTranslation'),
        gameWordFront: document.getElementById('gameWordFront'),
        playAudioIcon: document.getElementById('playAudioIcon'),
        autoplayAudioCheckbox: document.getElementById('autoplayAudio'),
        lessonFilterContainer: document.getElementById('lessonFilterContainer'),
        lessonFilterButton: document.getElementById('lessonFilterButton'),
        lessonFilterValue: document.getElementById('lessonFilterValue'),
        lessonFilterDropdown: document.getElementById('lessonFilterDropdown'),
        btnRemember: document.getElementById('btnRemember'),
        btnForget: document.getElementById('btnForget'),
        fcProgressText: document.getElementById('fcProgressText'),
        fcProgressFill: document.getElementById('fcProgressFill'),
        fcComplete: document.getElementById('fcComplete'),
        fcResetBtn: document.getElementById('fcResetBtn'),
        gameScene: document.getElementById('gameScene'),
        gameControls: document.getElementById('gameControls'),
        mixSetting: document.getElementById('mixSetting'),
        mixWordsCheckbox: document.getElementById('mixWords'),
        mixedBadge: document.getElementById('mixedBadge')
    });

    // Pre-warm the Greek voice cache
    Speech.getGreekVoice(() => { });

    // Render initial content
    Sidebar.renderLessonMenu();
    Search.renderAllLessons();
    Sidebar.setupScrollObserver();

    // View switching
    function switchView(view) {
        if (view === 'lessons') {
            mainTitle.classList.remove('hidden');
            lessonsView.classList.remove('hidden');
            selfCheckView.classList.add('hidden');
            modeLessonsBtn.classList.add('active');
            modeSelfCheckBtn.classList.remove('active');
            Speech.stopKeepAlive();
        } else {
            mainTitle.classList.add('hidden');
            lessonsView.classList.add('hidden');
            selfCheckView.classList.remove('hidden');
            modeLessonsBtn.classList.remove('active');
            modeSelfCheckBtn.classList.add('active');
            const currentMode = document.querySelector('.game-mode-button.active').dataset.mode;
            Game.updateAutoplayVisibility(currentMode);
            Speech.startKeepAlive();
            Game.startSelfCheck();
            gameCard.classList.add('intro-animation');
            gameCard.addEventListener('animationend', () => {
                gameCard.classList.remove('intro-animation');
            }, { once: true });
        }
    }

    // View toggle listeners
    if (modeLessonsBtn) modeLessonsBtn.addEventListener('click', () => switchView('lessons'));
    if (modeSelfCheckBtn) modeSelfCheckBtn.addEventListener('click', () => switchView('self-check'));

    // Start in lessons view
    switchView('lessons');
});
