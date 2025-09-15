const OpenAI = require('openai');
const fs = require('fs').promises;

const SYSTEM_PROMPT = 'Ты полезный AI-ассистент. Отвечай на вопросы пользователя вежливо и информативно.';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Проверяем, что это сообщение
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const userMessage = update.message.text;
    const messageId = update.message.message_id;

    // Отправляем запрос в YandexGPT
    const response = await client.chat.completions.create({
      model: "yandexgpt-lite",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const botReply = response.choices[0].message.content;

    // Отправляем ответ в Telegram
    await sendMessage(chatId, botReply, messageId);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
