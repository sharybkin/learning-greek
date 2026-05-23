/**
 * check_duplicates.js
 * ───────────────────
 * Проверяет, что все дубликаты экзаменационных слов
 * (одно слово в нескольких уроках) помечены в каждом вхождении.
 *
 * Запуск (из корня проекта):
 *   node tools/exam/check_duplicates.js
 */

const fs   = require('fs');
const path = require('path');

const LESSONS_FILE = path.resolve(__dirname, '..', '..', 'js', 'words', 'lessons.js');

const window = {};
// Evaluate lessons.js to get the actual LESSONS array
eval(fs.readFileSync(LESSONS_FILE, 'utf8'));
const lessons = window.LESSONS;

const wordEntries = [];
lessons.forEach(l => {
    l.words.forEach(w => {
        wordEntries.push({ ...w, lessonTitle: l.title });
    });
});

const examWords = new Set();
wordEntries.forEach(w => {
    if (w.exam) {
        examWords.add(w.greek);
    }
});

const missed = wordEntries.filter(w => !w.exam && examWords.has(w.greek));

if (missed.length === 0) {
    console.log('✓ Все дубликаты экзаменационных слов помечены!');
} else {
    console.log(`✗ Найдено ${missed.length} дубликатов БЕЗ exam: true:\n`);
    missed.forEach(w => console.log(`  В уроке "${w.lessonTitle}": ${w.greek} (${w.russian})`));
}

console.log(`\nВсего экзаменационных вхождений: ${wordEntries.filter(w => w.exam).length}`);
