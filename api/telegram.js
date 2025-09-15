const fs = require('fs');

// Читаем системный промпт из файла
let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync('system_prompt.txt', 'utf8').trim();
} catch (error) {
  console.error('Error reading system prompt:', error);
  SYSTEM_PROMPT = 'Ты полезный AI-ассистент. Отвечай на вопросы пользователя вежливо и информативно.';
}

// Загрузка переменных окружения для YandexGPT
const folderId = process.env.YANDEX_FOLDER_ID;
const apiKey = process.env.YANDEX_GPT_API_KEY;

// Кэш для IAM токена
let iamToken = null;
let tokenExpiry = null;

/**
 * Получает IAM токен из API ключа Yandex Cloud
 */
async function getIamToken() {
  // Если токен еще действителен (с запасом 5 минут), возвращаем его
  if (iamToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return iamToken;
  }

  try {
    const response = await fetch('https://iam.api.cloud.yandex.net/iam/v1/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        yandexPassportOauthToken: apiKey
      })
    });

    if (!response.ok) {
      console.error('Failed to get IAM token:', await response.text());
      // Если не удалось получить IAM токен, возвращаем API ключ как есть
      return apiKey;
    }

    const data = await response.json();
    iamToken = data.iamToken;
    // IAM токены действительны 12 часов
    tokenExpiry = Date.now() + 12 * 60 * 60 * 1000;

    console.log('Successfully obtained IAM token');
    return iamToken;
  } catch (error) {
    console.error('Error getting IAM token:', error);
    // В случае ошибки возвращаем API ключ
    return apiKey;
  }
}

/**
 * Отправляет запрос к YandexGPT и возвращает текст ответа.
 * @param {string} systemPrompt – Системный промпт (роль system).
 * @param {string} userMessage – Собственно вопрос/сообщение пользователя.
 */
async function yandexGptChat(systemPrompt, userMessage) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

  const payload = {
    modelUri: `gpt://${folderId}/yandexgpt-lite`,
    completionOptions: {
      stream: false,
      temperature: 0.7,
      maxTokens: 1000
    },
    messages: [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: userMessage }
    ]
  };

  console.log('API Key present:', !!apiKey);
  console.log('Folder ID present:', !!folderId);
  console.log('API Key length:', apiKey ? apiKey.length : 0);

  // Пробуем получить IAM токен
  const authToken = await getIamToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'x-folder-id': folderId
    },
    body: JSON.stringify(payload)
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const error = await response.text();
    console.error('YandexGPT API error details:', error);

    // Если Bearer не сработал, попробуем Api-Key
    if (response.status === 403) {
      console.log('Trying Api-Key authorization...');
      const fallbackResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${apiKey}`,
          'x-folder-id': folderId
        },
        body: JSON.stringify(payload)
      });

      console.log('Fallback response status:', fallbackResponse.status);

      if (fallbackResponse.ok) {
        const json = await fallbackResponse.json();
        console.log('Fallback successful');
        return json.result.alternatives[0].message.text;
      }
    }

    throw new Error(`YandexGPT API error ${response.status}: ${error}`);
  }

  const json = await response.json();
  console.log('YandexGPT response structure:', Object.keys(json));
  return json.result.alternatives[0].message.text;
}

async function sendMessage(chatId, text, replyToMessageId = null) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    reply_to_message_id: replyToMessageId
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

export default async function handler(req, res) {
  console.log('Webhook received:', req.method, req.body);

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем переменные окружения
    if (!process.env.YANDEX_FOLDER_ID || !process.env.YANDEX_GPT_API_KEY || !process.env.TELEGRAM_BOT_TOKEN) {
      console.error('Missing environment variables:', {
        folderId: !!process.env.YANDEX_FOLDER_ID,
        apiKey: !!process.env.YANDEX_GPT_API_KEY,
        botToken: !!process.env.TELEGRAM_BOT_TOKEN
      });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const update = req.body;

    // Проверяем, что это сообщение
    if (!update.message || !update.message.text) {
      console.log('Not a text message, ignoring');
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const userMessage = update.message.text;
    const messageId = update.message.message_id;

    console.log('Processing message:', { chatId, userMessage: userMessage.substring(0, 100) });

    // Отправляем запрос в YandexGPT
    console.log('Sending request to YandexGPT...');
    const botReply = await yandexGptChat(SYSTEM_PROMPT, userMessage);
    console.log('YandexGPT response:', botReply.substring(0, 100));

    // Отправляем ответ в Telegram
    console.log('Sending reply to Telegram...');
    await sendMessage(chatId, botReply, messageId);

    console.log('Message processed successfully');
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing message:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}
