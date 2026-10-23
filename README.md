# ⚡ SnippetVault

<p align="center">
  <img src="public/globe.svg" width="64" height="64" alt="SnippetVault Logo" />
</p>

<p align="center">
  <strong>Современный self-hosted менеджер фрагментов кода (сниппетов) для разработчиков.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.6.1-blue.svg" alt="Version 0.6.1" />
  <img src="https://img.shields.io/badge/docker-ready-2496ED.svg?logo=docker&logoColor=white" alt="Docker Ready" />
  <img src="https://img.shields.io/badge/database-SQLite-003B57.svg?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License MIT" />
</p>

---

## 🌟 Основные возможности

- **📂 Мультифайловые сниппеты и продвинутый редактор**:
  - Полноценный встроенный редактор **CodeMirror 6** с подсветкой синтаксиса на лету (30+ языков).
  - Номера строк, свертка блоков кода (folding), парные скобки, умные отступы и сохранение по `Ctrl+S`.
- **📜 История версий (Revisions & Git-like Diff)**:
  - Автоматическое сохранение снимков при каждом изменении.
  - Наглядное сравнение версий (Diff с добавленными и удаленными строками) и откат в 1 клик.
- **⚡ Песочница запуска кода (Playground)**:
  - Запуск JS/TS в изолированном контексте с выводом в консоль.
  - Живое интерактивное веб-превью для HTML/CSS/JS.
  - Выполнение Python прямо в браузере через WebAssembly (**Pyodide**).
- **📝 Поддержка Markdown в описании**: Заметки к сниппету теперь поддерживают форматирование, таблицы, списки и чекбоксы.
- **📁 Коллекции, теги и избранное**: Тематические папки с кастомными цветами и иконками, тегирование и быстрый доступ к избранным сниппетам.
- **🛡️ Безопасность и администрирование**:
  - Панель администратора для создания пользователей и управления ролями (публичная регистрация отключена).
  - Биометрический вход через **Passkeys (WebAuthn)** (Touch ID, Face ID, Windows Hello).
  - Двухфакторная аутентификация (**2FA / TOTP**).
  - Безопасный шеринг сниппетов по приватной секретной ссылке.
- **🤖 Встроенный AI-ассистент с автоопределением**:
  - Объяснение кода, автоматический рефакторинг, документирование.
  - Автоматическая генерация названий, описаний и тегов.
  - Поддержка OpenAI, Google Gemini (`gemini-3.5-flash`), локальных LLM (Ollama, LM Studio), а также прямое указание HTTP / SOCKS5 прокси в настройках UI (для работы из РФ).
  - Встроенная кнопка «Проверить подключение» прямо в настройках.
- **🌐 Мультиязычный интерфейс**: Полная локализация на русский и английский языки (RU / EN) с переключением в настройках.
- **💾 Резервное копирование и экспорт**: Экспорт всей базы или отдельных коллекций в JSON, импорт и восстановление данных.
- **📱 Адаптивный интерфейс**: Оптимизирован под мобильные устройства и десктоп, быстрый поиск через Command Palette (`Ctrl+K`), стильная тёмная тема.

---

## 🚀 Варианты запуска

### 1. Локальный запуск (Node.js)

Требования: **Node.js 20+**, **npm**.

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/scfmcdck/snippet-vault.git
cd snippet-vault

# 2. Установите зависимости
npm install

# 3. Инициализируйте базу данных SQLite
npx prisma db push

# 4. Запустите сервер разработки
npm run dev
```

Приложение будет доступно по адресу: **http://localhost:3000**

---

### 2. Запуск через Docker

#### Быстрый старт одной командой (`docker run`):

```bash
docker run -d \
  --name snippetvault \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  scfmcdck/snippet-vault:latest
```

#### Запуск через `docker-compose.yml`:

```yaml
services:
  snippetvault:
    image: scfmcdck/snippet-vault:latest
    container_name: snippetvault
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/snippetvault.db
      - PORT=3000
      - HOSTNAME=0.0.0.0
    volumes:
      - ./data:/app/data
```

Запуск:
```bash
docker compose up -d
```

---

### 3. Развертывание на Synology NAS (DSM 7.2+ Container Manager)

1. **Создайте каталог для данных**:
   - В приложении **File Station** внутри общей папки `docker` создайте структуру:
     ```text
     /docker/snippetvault/data
     ```
   *(Здесь будет храниться SQLite база `snippetvault.db`, которая сохраняется при любых обновлениях контейнера).*

2. **Создайте проект в Container Manager**:
   - Откройте **Container Manager** в DSM.
   - Раздел **«Проект» (Project)** ➔ **«Создать» (Create)**:
     - **Имя проекта**: `snippetvault`
     - **Путь**: выберите созданную папку `/docker/snippetvault`
     - **Источник**: выберите **«Создать файл docker-compose.yaml»**
   - Вставьте конфигурацию:

```yaml
services:
  snippetvault:
    image: scfmcdck/snippet-vault:latest
    container_name: snippetvault
    restart: unless-stopped
    ports:
      # Замените 3000 слева на любой свободный порт вашего NAS (например, 8585:3000)
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/data/snippetvault.db
      - PORT=3000
      - HOSTNAME=0.0.0.0
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 15s
```

3. Нажмите **«Далее»**, отметьте **«Запустить проект после сборки»** и нажмите **«Применить»**.
4. Откройте в браузере: `http://<IP_вашего_Synology>:3000` (или указанный вами порт).

---

## 🔑 Первый вход в систему

При первом запуске на чистой базе данных отображается подсказка для входа локального администратора:
- **Логин**: `admin@snippetvault.local`
- **Пароль**: `admin12345`

После первого входа создайте собственного пользователя с правами администратора в панели управления и измените или отключите стандартные учетные данные. Как только в системе появится еще один пользователь, подсказка на экране входа автоматически скроется.

---

## 📜 Лицензия

Распространяется под лицензией [MIT](LICENSE).
