# Telegram Bot with YandexGPT

Простой Telegram бот, который отвечает на сообщения используя YandexGPT.

## Настройка

1. Создайте бота в Telegram через @BotFather и получите токен
2. Получите Yandex Cloud Folder ID и API ключ для YandexGPT
3. Настройте переменные окружения в Vercel:
   - `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
   - `YANDEX_FOLDER_ID` - ID папки Yandex Cloud
   - `YANDEX_GPT_API_KEY` - API ключ YandexGPT

4. Установите webhook для бота:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>/api/telegram
   ```

## Деплой

```bash
npm install
vercel --prod
```
