import Groq from 'groq-sdk';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!groqApiKey) {
      throw new Error('VITE_GROQ_API_KEY is not configured. Please add it to your .env file.');
    }
    groqClient = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });
  }
  return groqClient;
}

// Groq model to use for all agent calls
const GROQ_MODEL = 'openai/gpt-oss-20b';

// Max characters to send in a single prompt (conservative limit)
const MAX_PROMPT_CHARS = 80000;

export async function chatWithGroq(
  prompt: string,
  onRetry?: (msg: string) => void,
  maxRetries = 3
): Promise<string> {
  const client = getGroqClient();
  let retries = 0;

  // Truncate prompt to avoid token limit errors
  const safePrompt = prompt.length > MAX_PROMPT_CHARS 
    ? prompt.substring(0, MAX_PROMPT_CHARS) + '\n\n[Content truncated to fit token limits. Please work with the above.]'
    : prompt;

  while (true) {
    try {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: safePrompt }],
        max_tokens: 4096,
      });
      return response.choices[0]?.message?.content || 'No response from Groq.';
    } catch (error: any) {
      if (retries >= maxRetries) {
        throw error;
      }

      const isRetryable =
        error.status === 503 ||
        error.status === 429 ||
        error.message?.includes('503') ||
        error.message?.includes('429') ||
        error.message?.includes('rate limit');

      if (!isRetryable) {
        throw error;
      }

      retries++;
      const waitTime = Math.pow(2, retries) * 5000; // 10s, 20s, 40s
      if (onRetry) {
        onRetry(`[Groq] Rate limit hit. Retrying in ${waitTime / 1000}s... (Attempt ${retries}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
