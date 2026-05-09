# Скилл: Обновление версий ассетов (Asset Version Bumping)

Этот скилл описывает правило, согласно которому при изменении статических файлов (CSS или JS), подключенных в `index.html`, необходимо инкрементировать параметр версии `?v=N` для сброса кэша у пользователей (cache busting).

## Правило

Если вы вносите изменения в любой из следующих файлов:

### Стили (CSS)
- `css/base.css`
- `css/sidebar.css`
- `css/search.css`
- `css/game.css`
- `css/responsive.css`

### Скрипты (JS)
- `js/words/lessons.js`
- `js/speech.js`
- `js/sidebar.js`
- `js/search.js`
- `js/game.js`
- `js/app.js`

**То обязательно инкрементируйте значение параметра `?v=N` для соответствующего файла в `index.html`.**

---

## Пример

### До изменения
```html
<link rel="stylesheet" href="css/game.css?v=12">
<script src="js/game.js?v=11"></script>
```

### После изменения файлов `css/game.css` и `js/game.js`
```html
<link rel="stylesheet" href="css/game.css?v=13">
<script src="js/game.js?v=12"></script>
```

---

## Почему это важно
Браузеры (особенно мобильные, например iOS Safari) агрессивно кэшируют статические файлы. Без изменения параметра версии пользователи могут не увидеть внесенных изменений, правок багов или новых функций, пока вручную не очистят кэш браузера.
