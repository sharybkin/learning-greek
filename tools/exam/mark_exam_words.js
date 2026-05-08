/**
 * mark_exam_words.js
 * ──────────────────
 * Помечает слова в lessons.js признаком exam: true,
 * если они присутствуют в fin_voc.json.txt (словарь для экзамена).
 *
 * Запуск (из корня проекта):
 *   node tools/exam/mark_exam_words.js
 *
 * Запуск повторно безопасен: уже помеченные слова не дублируются.
 */

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..', '..');
const VOC_FILE     = path.join(__dirname, 'fin_voc.json.txt');
const LESSONS_FILE = path.join(ROOT, 'js', 'words', 'lessons.js');
const BACKUP_FILE  = LESSONS_FILE + '.backup';

// ─── Загрузка экзаменационного словаря ───────────────────────────────────────

const vocData = JSON.parse(fs.readFileSync(VOC_FILE, 'utf8'));

/** Нормализация: нижний регистр + удаление артикля в начале */
function normalize(word) {
    return word
        .toLowerCase()
        .trim()
        .replace(/^(ο|η|το|οι|τα|τους|τις)\s+/u, '')
        .trim();
}

// Строим Set всех нормализованных форм экзаменационных слов
const examSet = new Set();
for (const item of vocData) {
    // Добавляем оригинальные слова
    for (const part of item.word.split('|').map(s => s.trim()).filter(Boolean)) {
        examSet.add(part.toLowerCase().trim());
        examSet.add(normalize(part));
    }
    // ДОБАВЛЯЕМ base_form (базовую форму, которую мы только что добавили)
    if (item.base_form) {
        examSet.add(item.base_form.toLowerCase().trim());
        examSet.add(normalize(item.base_form));
    }
}

console.log(`✓ Загружено ${vocData.length} записей → ${examSet.size} нормализованных форм\n`);

// ─── Проверка слова ───────────────────────────────────────────────────────────

function isExam(greekWord) {
    const candidates = new Set();
    const add = w => { candidates.add(w.trim().toLowerCase()); candidates.add(normalize(w)); };

    add(greekWord);
    for (const p of greekWord.split('/')) add(p);
    for (const p of greekWord.split('|')) add(p);
    for (const p of greekWord.split(',')) add(p);

    for (const c of candidates) {
        if (examSet.has(c) || examSet.has(normalize(c))) return true;
    }
    return false;
}

// ─── Обработка lessons.js ────────────────────────────────────────────────────

let content = fs.readFileSync(LESSONS_FILE, 'utf8');

// Создаём бэкап (только если ещё не существует)
if (!fs.existsSync(BACKUP_FILE)) {
    fs.writeFileSync(BACKUP_FILE, content, 'utf8');
    console.log(`✓ Создан бэкап: ${BACKUP_FILE}\n`);
}

let totalWords    = 0;
let markedWords   = 0;
let alreadyMarked = 0;
const markedList  = [];

const wordObjRegex = /\{[^{}]*greek:\s*(['"])(.*?)\1[^{}]*\}/gs;

const newContent = content.replace(wordObjRegex, (match) => {
    totalWords++;

    const greekMatch = match.match(/greek:\s*(['"])(.*?)\1/s);
    if (!greekMatch) return match;
    const greek = greekMatch[2];

    if (/\bexam\s*:/.test(match)) {
        alreadyMarked++;
        return match;
    }

    if (isExam(greek)) {
        markedWords++;
        markedList.push(greek);
        return match.replace(/\s*\}$/, ', exam: true }');
    }

    return match;
});

fs.writeFileSync(LESSONS_FILE, newContent, 'utf8');

// ─── Итог ─────────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════');
console.log('           РЕЗУЛЬТАТ ОБРАБОТКИ');
console.log('═══════════════════════════════════════════════');
console.log(`  Всего слов в lessons.js:      ${totalWords}`);
console.log(`  Уже помечены (exam: true):    ${alreadyMarked}`);
console.log(`  Новых помеченных:             ${markedWords}`);
console.log(`  Итого экзаменационных:        ${alreadyMarked + markedWords}`);
console.log('═══════════════════════════════════════════════\n');

if (markedList.length > 0) {
    console.log('Новые помеченные слова:');
    markedList.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
}
