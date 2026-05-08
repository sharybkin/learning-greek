# tools/exam — Утилиты для работы с экзаменационным словарём

Все скрипты запускаются **из корня проекта**:

```
node tools/exam/<script>.js
```

---

## Скрипты

### `mark_exam_words.js` — основной

Сравнивает `fin_voc.json.txt` с `js/words/lessons.js` и добавляет
`exam: true` к совпадающим словам.

```bash
node tools/exam/mark_exam_words.js
```

- Безопасен при повторном запуске (не дублирует пометку)
- При первом запуске создаёт бэкап `lessons.js.backup`

---

### `check_duplicates.js` — проверка дубликатов

Проверяет, что слово, помеченное `exam: true` в одном уроке,
также помечено во всех остальных уроках где оно встречается.

```bash
node tools/exam/check_duplicates.js
```

---

### `diagnose_exam_words.js` — диагностика покрытия

Показывает какие слова из `fin_voc.json.txt`:
- **найдены** в `lessons.js` (совпали по форме)
- **не найдены** (спрягаемые формы, фразы, которых нет в словаре)

```bash
node tools/exam/diagnose_exam_words.js
```

---

## Как добавлять новые слова для экзамена

1. Добавить запись в `fin_voc.json.txt`
2. Запустить `node tools/exam/mark_exam_words.js`
3. Проверить `node tools/exam/check_duplicates.js`
