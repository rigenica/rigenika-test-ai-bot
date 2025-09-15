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
const API_KEY = process.env.YANDEX_GPT_API_KEY;        // API-ключ сервисного аккаунта
const IAM_TOKEN = process.env.YANDEX_IAM_TOKEN;        // или IAM-токен
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;        // folder ID

/**
 * Отправляет запрос к YandexGPT и возвращает текст ответа.
 * @param {string} systemPrompt – Системный промпт (роль system).
 * @param {string} userMessage – Собственно вопрос/сообщение пользователя.
 */
async function yandexGptChat(systemPrompt, userMessage) {
  const body = {
    modelUri: `gpt://${FOLDER_ID}/yandexgpt`,
    completionOptions: {
      stream: false,
      temperature: 0.6,
      maxTokens: "2000",
      reasoningOptions: { mode: "DISABLED" }
    },
    messages: [
      { role: "system", text: systemPrompt },
      { role: "user", text: userMessage }
    ]
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY
      ? { 'Authorization': `Api-Key ${API_KEY}` }
      : { 'Authorization': `Bearer ${IAM_TOKEN}` }),
    'x-folder-id': FOLDER_ID,
  };

  console.log('Using API Key auth:', !!API_KEY);
  console.log('Using IAM Token auth:', !!IAM_TOKEN);
  console.log('Folder ID present:', !!FOLDER_ID);

  const response = await fetch(
    'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  );

  console.log('Response status:', response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error('YandexGPT API error:', text);
    throw new Error(`YandexGPT API error: ${response.status} ${text}`);
  }

  const result = await response.json();
  console.log('YandexGPT response received');
  return result.result.alternatives[0].message.text;
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
