//Обертка-адаптер для совместимости с OpenAI SDK
//Существует адаптер, который позволяет использовать YandexGPT через OpenAI SDK:


import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: `${process.env.YANDEX_FOLDER_ID}@${process.env.YANDEX_GPT_API_KEY}`,
  baseURL: "https://o2y.ai-cookbook.ru/v1"
});

const response = await client.chat.completions.create({
  model: "yandexgpt-lite",
  messages: [
    { role: "user", content: "Привет! Как дела?" }
  ]
});

console.log(response.choices[0].message.content);
