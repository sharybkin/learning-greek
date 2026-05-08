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

const content = fs.readFileSync(LESSONS_FILE, 'utf8');
const lines   = content.split('\n');

const examLines    = [];
const nonExamLines = [];

lines.forEach((l, i) => {
    const m = l.match(/greek:\s*['"]([^'"]+)['"]/);
    if (!m) return;
    if (l.includes('exam: true')) examLines.push({ w: m[1], line: i + 1 });
    else nonExamLines.push({ w: m[1], line: i + 1 });
});

const examWords = new Set(examLines.map(x => x.w));
const missed    = nonExamLines.filter(x => examWords.has(x.w));

if (missed.length === 0) {
    console.log('✓ Все дубликаты экзаменационных слов помечены!');
} else {
    console.log(`✗ Найдено ${missed.length} дубликатов БЕЗ exam: true:\n`);
    missed.forEach(x => console.log(`  Строка ${x.line}: ${x.w}`));
}

console.log(`\nВсего экзаменационных вхождений: ${examLines.length}`);
