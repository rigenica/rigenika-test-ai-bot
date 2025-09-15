# Telegram Bot with YandexGPT

Простой Telegram бот, который отвечает на сообщения используя YandexGPT.

## Настройка

### 1. Telegram Bot
Создайте бота в Telegram через @BotFather и получите токен бота.

### 2. Yandex Cloud настройка

#### Создание сервисного аккаунта и API ключа:
1. Перейдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Выберите или создайте каталог (folder)
3. Перейдите в "Сервисные аккаунты" в левом меню
4. Создайте новый сервисный аккаунт с ролью `ai.languageModels.user`
5. Перейдите в созданный аккаунт → "Создать новый ключ" → "API-ключ"
6. Скопируйте API-ключ

#### Получение Folder ID:
- Folder ID можно найти в URL консоли: `https://console.cloud.yandex.ru/folders/[FOLDER_ID]`
- Или в настройках каталога

#### Проверка доступов:
Убедитесь, что у вас активирован сервис "YandexGPT" в биллинге:
- Перейдите в "Биллинг" → "Активация сервисов"
- Найдите и активируйте "YandexGPT"

### 3. Переменные окружения в Vercel
Настройте переменные в Vercel Dashboard (Project Settings → Environment Variables):
- `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
- `YANDEX_FOLDER_ID` - ID папки Yandex Cloud (из URL консоли)
- `YANDEX_GPT_API_KEY` - API ключ сервисного аккаунта

### 4. Webhook для бота
Установите webhook после деплоя:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>/api/telegram
```

## Деплой

```bash
npm install
vercel --prod
```

## Возможные проблемы

### Ошибка 403 "Permission denied"
- Проверьте правильность `YANDEX_FOLDER_ID`
- Убедитесь, что API-ключ создан для сервисного аккаунта с ролью `ai.languageModels.user`
- Проверьте, что активирован сервис YandexGPT в биллинге
- Попробуйте создать новый API-ключ
