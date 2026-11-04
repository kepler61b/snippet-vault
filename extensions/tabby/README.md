# tabby-snippetvault

Плагин для терминала [Tabby](https://tabby.sh), добавляющий интеграцию с вашей базой сниппетов **SnippetVault**.

---

## Возможности

- **Сохранить в SnippetVault**:
  - Выделите любой текст или команду в окне терминала &rarr; нажмите правую кнопку мыши &rarr; выберите **«Сохранить в SnippetVault»**.
  - В появившемся окне подтвердите или измените название клипа (по умолчанию подставляется первая строка выделенного текста).
  - Клип мгновенно сохранится в SnippetVault с тегами `terminal, tabby`.

- **Загрузить из SnippetVault**:
  - Нажмите правую кнопку мыши в терминале &rarr; наведите на **«Загрузить из SnippetVault»**.
  - Откроется подменю со всеми вашими коллекциями (например, `Docker`, `Git`, `K8s`) и клипами без коллекции.
  - При клике по любому сниппету его содержимое **сразу же вставляется в строку ввода терминала** (в текущую активную сессию).

- **Настройки в интерфейсе Tabby**:
  - Вкладка **«SnippetVault»** в окне настроек Tabby (*Settings &rarr; SnippetVault*).
  - Поля для указания URL сервера и Personal Access Token (PAT).
  - Кнопка **«Проверить подключение»** со статусом и количеством доступных сниппетов.
  - Кнопка **«Очистить кеш»** и настройка времени жизни кеша (по умолчанию 60 сек) для мгновенного отклика контекстного меню.

---

## Быстрый старт и установка

### 1. Сборка плагина

В каталоге `extensions/tabby`:

```bash
cd extensions/tabby
npm install
npm run build
```

Сборка скомпилирует модуль в `extensions/tabby/dist/index.js`.

---

### 2. Установка в Tabby

Tabby ищет установленные плагины в подпапке `node_modules` директории плагинов:

| ОС | Путь к директории плагинов Tabby | Путь для установки плагина (`node_modules`) |
|---|---|---|
| **macOS** | `~/Library/Application Support/tabby/plugins` | `~/Library/Application Support/tabby/plugins/node_modules/tabby-snippetvault` |
| **Linux** | `~/.config/tabby/plugins` | `~/.config/tabby/plugins/node_modules/tabby-snippetvault` |
| **Windows** | `%APPDATA%\tabby\plugins` | `%APPDATA%\tabby\plugins\node_modules\tabby-snippetvault` |

#### Способ А: Символическая ссылка (рекомендуется для разработки)

Создайте симлинк в поддиректорию `plugins/node_modules`:

**macOS:**
```bash
mkdir -p "$HOME/Library/Application Support/tabby/plugins/node_modules"
ln -sfn "/полный/путь/к/snippet-vault/extensions/tabby" "$HOME/Library/Application Support/tabby/plugins/node_modules/tabby-snippetvault"
```

**Linux:**
```bash
mkdir -p "$HOME/.config/tabby/plugins/node_modules"
ln -sfn "/полный/путь/к/snippet-vault/extensions/tabby" "$HOME/.config/tabby/plugins/node_modules/tabby-snippetvault"
```

**Windows (PowerShell от имени Администратора):**
```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\tabby\plugins\node_modules"
New-Item -ItemType SymbolicLink -Path "$env:APPDATA\tabby\plugins\node_modules\tabby-snippetvault" -Target "C:\путь\к\snippet-vault\extensions\tabby"
```

#### Способ Б: Копирование файлов

Скопируйте папку в каталог `plugins/node_modules`:
```bash
mkdir -p "$HOME/Library/Application Support/tabby/plugins/node_modules/tabby-snippetvault"
cp -r dist package.json "$HOME/Library/Application Support/tabby/plugins/node_modules/tabby-snippetvault/"
```

---

### 3. Перезапустите Tabby

Нажмите в Tabby `Ctrl+Shift+R` (или перезапустите приложение).
Плагин автоматически активируется.

---

### 4. Настройка подключения

1. В веб-интерфейсе **SnippetVault** перейдите в **Профиль &rarr; API &amp; Tokens** и создайте новый токен (PAT).
2. В Tabby откройте **Settings (Настройки) &rarr; вкладка «SnippetVault»**.
3. Укажите:
   - **URL сервера:** например `http://localhost:3000` (или внешний адрес вашего сервера)
   - **Personal Access Token (PAT):** вставьте созданный токен `snip_...`
4. Нажмите кнопку **«Проверить подключение»**.
   При успешном подключении появится зеленый бейдж:
   `Соединение успешно установлено! (Доступно сниппетов: X, коллекций: Y)`.

---

## Как использовать

1. **Для сохранения команды:**
   - Выделите команду в терминале.
   - Нажмите правую кнопку мыши &rarr; **«Сохранить в SnippetVault»**.
   - Нажмите `Enter` во всплывающем окне с заголовком.

2. **Для вставки сниппета:**
   - Нажмите правую кнопку мыши в терминале.
   - Наведите курсор на **«Загрузить из SnippetVault»**.
   - Раскройте нужную коллекцию и нажмите на сниппет &rarr; команда тут же появится в строке ввода.

---

## Публикация в реестре Tabby (npm)

Чтобы плагин мог установить любой пользователь Tabby в один клик через встроенный интерфейс `Settings -> Plugins`:
1. Убедитесь, что в `package.json` присутствует ключевое слово `"tabby-plugin"`.
2. Опубликуйте пакет в npm:
   ```bash
   npm publish --access public
   ```
Tabby автоматически индексирует все пакеты npm с ключевым словом `tabby-plugin`.
