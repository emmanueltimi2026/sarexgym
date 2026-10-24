const unavailable = (code = 'AI_UNAVAILABLE') => Object.assign(new Error('The assistant is temporarily unavailable.'), { code });

export function createAiProvider(config, { fetchImpl = globalThis.fetch } = {}) {
  return {
    async complete(messages) {
      if (!config.AI_API_KEY) throw unavailable('AI_NOT_CONFIGURED');
      if (typeof fetchImpl !== 'function') throw unavailable();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS || 20_000);
      try {
        const base = config.AI_API_BASE_URL.replace(/\/+$/, '');
        const response = await fetchImpl(`${base}/chat/completions`, {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${config.AI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: config.AI_MODEL, messages, temperature: 0.4, max_tokens: 600 })
        });
        if (!response.ok) throw unavailable(response.status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : 'AI_PROVIDER_ERROR');
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) throw unavailable('AI_INVALID_RESPONSE');
        return content.trim().slice(0, 6000);
      } catch (error) {
        if (error?.code?.startsWith('AI_')) throw error;
        throw unavailable(error?.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_PROVIDER_ERROR');
      } finally { clearTimeout(timeout); }
    }
  };
}

export const assistantProviderError = code => {
  if (code === 'AI_NOT_CONFIGURED') return { status: 503, code: 'ASSISTANT_UNAVAILABLE', message: 'SAREX AI is not available yet. Please try again later.' };
  if (code === 'AI_TIMEOUT') return { status: 504, code: 'ASSISTANT_TIMEOUT', message: 'SAREX AI took too long to respond. Please try again.' };
  if (code === 'AI_PROVIDER_RATE_LIMITED') return { status: 503, code: 'ASSISTANT_BUSY', message: 'SAREX AI is busy right now. Please try again shortly.' };
  return { status: 502, code: 'ASSISTANT_UNAVAILABLE', message: 'SAREX AI could not respond just now. Please try again.' };
};
