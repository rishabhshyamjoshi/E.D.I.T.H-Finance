// Max characters to send in a single prompt (conservative limit)
const MAX_PROMPT_CHARS = 80000;

export async function chatWithGroq(
  prompt: string,
  onRetry?: (msg: string) => void,
  maxRetries = 3,
  model = 'openai/gpt-oss-120b',
  maxTokens = 2048
): Promise<string> {
  let retries = 0;

  // Truncate prompt to avoid token limit errors
  const safePrompt = prompt.length > MAX_PROMPT_CHARS 
    ? prompt.substring(0, MAX_PROMPT_CHARS) + '\n\n[Content truncated to fit token limits. Please work with the above.]'
    : prompt;

  while (true) {
    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: safePrompt,
          model: model,
          max_tokens: maxTokens,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errMsg = `Server responded with status ${response.status}`;
        if (errorData.error) {
          errMsg = typeof errorData.error === 'object' ? (errorData.error.message || JSON.stringify(errorData.error)) : errorData.error;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response from Groq proxy.';
    } catch (error: any) {
      if (retries >= maxRetries) {
        throw error;
      }

      const isRetryable =
        error.message?.includes('503') ||
        error.message?.includes('429') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('fetch failed');

      if (!isRetryable) {
        throw error;
      }

      retries++;
      const delayMs = retries * 2000;
      if (onRetry) {
        onRetry(`[Groq Proxy] Rate limit hit. Retrying in ${delayMs / 1000}s... (Attempt ${retries}/${maxRetries})`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
