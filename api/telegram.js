const OpenAI = require('openai');
const fs = require('fs').promises;

// Читаем системный промпт из файла
let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync('system_prompt.txt', 'utf8').trim();
} catch (error) {
  console.error('Error reading system prompt:', error);
  SYSTEM_PROMPT = 'Ты полезный AI-ассистент. Отвечай на вопросы пользователя вежливо и информативно.';
}

const client = new OpenAI({
  apiKey: `${process.env.YANDEX_FOLDER_ID}@${process.env.YANDEX_GPT_API_KEY}`,
  baseURL: "https://o2y.ai-cookbook.ru/v1"
});

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
    const response = await client.chat.completions.create({
      model: "yandexgpt-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const botReply = response.choices[0].message.content;
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
