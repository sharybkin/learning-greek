/**
 * update_all_tags.js
 * ──────────────────
 * Единый скрипт для обновления всех бейджей в lessons.js.
 * Запускает по очереди:
 * 1. mark_exam_words.js (помечает слова из экзамена)
 * 2. mark_popular_words.js (помечает топ-слова)
 *
 * Запуск: node tools/exam/update_all_tags.js
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
    'mark_exam_words.js',
    'mark_popular_words.js'
];

console.log('🔄 Запуск автоматического обновления всех тегов...\n');

for (const script of scripts) {
    console.log(`▶ Выполняется ${script}...`);
    try {
        const output = execSync(`node ${path.join(__dirname, script)}`, { encoding: 'utf8' });
        console.log(output);
    } catch (err) {
        console.error(`❌ Ошибка при выполнении ${script}:`);
        console.error(err.stdout || err.message);
        process.exit(1);
    }
}

console.log('✅ Все теги (Экзамен, Топ) успешно обновлены в lessons.js!');
