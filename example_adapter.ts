// Пример прямого HTTP-запроса к YandexGPT API с системным промптом и сообщением от пользователя

import fetch from 'node-fetch';

// Загрузка переменных окружения
const folderId = process.env.YANDEX_FOLDER_ID;        // Ваш идентификатор каталога, например "b1gkhcrp12p1mpavues6"
const apiKey   = process.env.YANDEX_GPT_API_KEY;     // Ваш API-ключ с scope yc.ai.foundationModels.execute

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
      { role: 'system',    text: systemPrompt },
      { role: 'user',      text: userMessage }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Api-Key ${apiKey}`,
      'x-folder-id':   folderId
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YandexGPT API error ${response.status}: ${error}`);
  }

  const json = await response.json();
  return json.result.alternatives[0].message.text;
}

// Пример использования
(async () => {
  try {
    const systemPrompt = 'Ты — опытный ассистент, который чётко и кратко отвечает на технические вопросы.';
    const userMessage  = 'Объясни, как подключиться к API ЯндексGPT в Next.js проекте.';
    
    const answer = await yandexGptChat(systemPrompt, userMessage);
    console.log('YandexGPT ответ:', answer);
  } catch (err) {
    console.error(err);
  }
})();
