import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.E_INFRA_API_TOKEN,
  baseURL: process.env.EINFRA_BASE_URL ?? 'https://llm.ai.e-infra.cz/v1/',
});
const MODEL = process.env.EINFRA_MODEL ?? 'qwen3.5';

async function main() {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: 'What is the weather in Brno? Use the tool.' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the current weather for a city',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City name' },
            },
            required: ['city'],
          },
        },
      },
    ],
  });

  const msg = completion.choices[0].message;
  console.log('--- tool_calls ---');
  console.log(JSON.stringify(msg.tool_calls, null, 2));
  console.log('--- text content ---');
  console.log(msg.content);
}

main().catch((e) => console.error('PROBE FAILED:', e));
