# Инструкция по развертыванию SnippetVault на Synology NAS

Официальный Docker-образ SnippetVault опубликован в Docker Hub:
- **`scfmcdck/snippet-vault:latest`** (или `scfmcdck/snippetvault:latest`)

---

## Способ 1: Через Container Manager (DSM 7.2+) — Рекомендуемый способ

В современных версиях DSM приложение Docker называется **Container Manager** и имеет встроенную поддержку Docker Compose через вкладку **«Проект» (Project)**.

### Шаг 1: Подготовка папки для данных
1. Откройте **File Station** на Synology.
2. В общей папке `docker` создайте каталог `snippetvault`, а внутри него подкаталог `data`:
   ```
   /docker/snippetvault/data
   ```
   *В этой папке будет храниться файл SQLite базы данных `snippetvault.db`. Все ваши сниппеты, аккаунты и настройки сохранятся при перезапусках и обновлениях контейнера.*

### Шаг 2: Создание проекта в Container Manager
1. Откройте приложение **Container Manager** в DSM.
2. Перейдите в раздел **«Проект» (Project)** в левом меню.
3. Нажмите кнопку **«Создать» (Create)**:
   - **Имя проекта**: `snippetvault`
   - **Путь**: выберите созданную папку `/docker/snippetvault`
   - **Источник**: выберите **«Создать файл docker-compose.yaml»**
4. Вставьте следующее содержимое в текстовое поле:

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
      # Настройки AI (можно настроить позже прямо из веб-интерфейса)
      - AI_PROVIDER=openai
      - AI_API_KEY=
      - AI_BASE_URL=https://api.openai.com/v1
      - AI_MODEL=gpt-4o-mini
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 15s
```

5. Нажмите **«Далее»**, затем поставьте галочку **«Запустить проект после сборки»** и нажмите **«Применить»**.
6. Container Manager автоматически скачает образ с Docker Hub, инициализирует базу данных SQLite и запустит контейнер.

---

## Способ 2: Через SSH (Терминал)

Если у вас включен SSH-доступ к Synology:

1. Подключитесь к NAS:
   ```bash
   ssh your_username@synology_ip
   ```
2. Перейдите в каталог docker и создайте проект:
   ```bash
   sudo -i
   cd /volume1/docker
   mkdir -p snippetvault/data
   cd snippetvault
   ```
3. Создайте файл `docker-compose.yml`:
   ```bash
   cat << 'EOF' > docker-compose.yml
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
   EOF
   ```
4. Запустите сервис:
   ```bash
   docker compose up -d
   ```

---

## Доступ к SnippetVault

После запуска контейнера откройте в браузере:
```
http://<IP_АДРЕС_SYNOLOGY>:3000
```
*(например, `http://192.168.1.100:3000`)*

При первом открытии:
1. Перейдите на страницу регистрации и создайте учетную запись администратора.
2. В параметрах аккаунта можно подключить 2FA или настроить Passkey для входа по Touch ID / Windows Hello.

---

## Как обновлять образ до новой версии в будущем

Когда выходят обновления:
1. В **Container Manager** перейдите в **«Проект»** -> выберите `snippetvault`.
2. В меню «Действие» нажмите **«Остановить»**.
3. В меню «Действие» нажмите **«Очистить»** (или «Обновить образ» / `Pull`).
4. Нажмите **«Запустить»** — будет скачан свежий образ, а все данные в `./data` сохранятся без изменений.
