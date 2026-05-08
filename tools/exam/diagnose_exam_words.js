/**
 * diagnose_exam_words.js
 * ──────────────────────
 * Показывает какие слова из fin_voc.json.txt есть / отсутствуют в lessons.js.
 * Полезно для ревью покрытия экзаменационного словаря.
 *
 * Запуск (из корня проекта):
 *   node tools/exam/diagnose_exam_words.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..', '..');
const VOC_FILE     = path.join(__dirname, 'fin_voc.json.txt');
const LESSONS_FILE = path.join(ROOT, 'js', 'words', 'lessons.js');

const vocData      = JSON.parse(fs.readFileSync(VOC_FILE, 'utf8'));
const lessonsText  = fs.readFileSync(LESSONS_FILE, 'utf8');

// Извлекаем все греческие слова из lessons.js в нормализованный Set
function normalize(word) {
    return word.toLowerCase().trim().replace(/^(ο|η|το|οι|τα|τους|τις)\s+/u, '').trim();
}

const lessonsWords = new Set();
let m;
const re = /greek:\s*(['"])(.*?)\1/gs;
while ((m = re.exec(lessonsText)) !== null) {
    const w = m[2];
    lessonsWords.add(w.toLowerCase().trim());
    lessonsWords.add(normalize(w));
    for (const p of w.split('/')) {
        lessonsWords.add(p.trim().toLowerCase());
        lessonsWords.add(normalize(p));
    }
}

// Проверяем каждое экзаменационное слово
const inLessons    = [];
const notInLessons = [];

for (const item of vocData) {
    const parts = item.word.split('|').map(s => s.trim()).filter(Boolean);
    let found = false;
    for (const p of parts) {
        if (
            lessonsWords.has(p.toLowerCase().trim()) ||
            lessonsWords.has(normalize(p)) ||
            p.split('/').some(s => lessonsWords.has(s.trim().toLowerCase()) || lessonsWords.has(normalize(s)))
        ) {
            found = true;
            break;
        }
    }
    (found ? inLessons : notInLessons).push(item.word);
}

console.log(`Всего экзаменационных записей: ${vocData.length}`);
console.log(`Найдено в lessons.js:          ${inLessons.length}`);
console.log(`НЕ найдено в lessons.js:       ${notInLessons.length}\n`);

console.log('─── Есть в lessons.js ───────────────────────────');
inLessons.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));

console.log('\n─── НЕТ в lessons.js (спряжения, фразы и т.д.) ─');
notInLessons.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
