/**
 * Groq Multi-Model Provider with Automatic Fallback
 * 
 * Uses the SAME Groq API key but falls back to different models
 * when one hits rate limits. All models are free on Groq's tier.
 * 
 * Model priority (best → fastest):
 * 1. llama-3.3-70b-versatile (best quality, 70B)
 * 2. qwen/qwen3.6-27b (strong reasoning, 27B)
 * 3. llama-3.1-8b-instant (fast, 8B)
 * 4. mixtral-8x7b-32768 (good balance, MoE)
 * 5. gemma2-9b-it (compact, 9B)
 */

const OpenAI = require('openai');

/**
 * Groq models ordered by quality (best first)
 */
const GROQ_MODELS = [
  {
    id: 'groq_llama33_70b',
    name: 'Llama 3.3 70B',
    model: 'llama-3.3-70b-versatile',
    supportsTools: true,
    priority: 1,
  },
  {
    id: 'groq_qwen36_27b',
    name: 'Qwen 3.6 27B',
    model: 'qwen/qwen3.6-27b',
    supportsTools: true,
    priority: 2,
  },
  {
    id: 'groq_llama31_8b',
    name: 'Llama 3.1 8B Instant',
    model: 'llama-3.1-8b-instant',
    supportsTools: true,
    priority: 3,
  },
  {
    id: 'groq_mixtral_8x7b',
    name: 'Mixtral 8x7B',
    model: 'mixtral-8x7b-32768',
    supportsTools: true,
    priority: 4,
  },
  {
    id: 'groq_gemma2_9b',
    name: 'Gemma 2 9B',
    model: 'gemma2-9b-it',
    supportsTools: false, // Gemma doesn't support tool calling
    priority: 5,
  },
];

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_TIMEOUT_MS = 15000;

/**
 * Track rate-limited models to avoid them temporarily
 * Maps model id -> timestamp when rate limit was hit
 */
const rateLimitMap = new Map();

/**
 * Cooldown period after rate limit (2 minutes — Groq resets fast)
 */
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Get available models sorted by priority, excluding rate-limited ones
 */
function getAvailableModels() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'gsk_placeholder' || apiKey === '') {
    return [];
  }

  const now = Date.now();
  return GROQ_MODELS
    .filter(m => {
      const limitedAt = rateLimitMap.get(m.id);
      if (!limitedAt) return true;
      if (now - limitedAt > RATE_LIMIT_COOLDOWN_MS) {
        rateLimitMap.delete(m.id);
        return true;
      }
      return false;
    })
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Mark a model as rate-limited
 */
function markModelRateLimited(modelId) {
  rateLimitMap.set(modelId, Date.now());
  console.log(`[GroqModels] Model "${modelId}" rate-limited. Cooling down for 2 minutes.`);
}

/**
 * Create an OpenAI client pointing to Groq
 */
function createGroqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
    timeout: GROQ_TIMEOUT_MS,
    maxRetries: 0,
  });
}

/**
 * Make a chat completion request with automatic model fallback
 * 
 * All requests go through the same Groq API key, but if one model
 * hits rate limits, the system automatically tries the next model.
 * 
 * @param {Object} params - Chat completion parameters
 * @param {Array} params.messages - Array of message objects
 * @param {Array} [params.tools] - Optional tool definitions
 * @param {string} [params.tool_choice='auto'] - Tool choice strategy
 * @param {number} [params.temperature=0.7] - Temperature
 * @param {number} [params.max_tokens=800] - Max tokens
 * @param {boolean} [params.supportTools=true] - Whether the caller needs tool calling
 * @returns {Object} - { result, model, attempts }
 */
async function chatCompletions(params) {
  const {
    messages,
    tools,
    tool_choice = 'auto',
    temperature = 0.7,
    max_tokens = 800,
    supportTools = true,
  } = params;

  const availableModels = getAvailableModels();

  if (availableModels.length === 0) {
    throw new Error(
      'Groq API key not configured. Please set GROQ_API_KEY in your backend .env file. ' +
      'Get a free key at https://console.groq.com'
    );
  }

  const attempts = [];
  let lastError = null;
  const client = createGroqClient();

  for (const modelConfig of availableModels) {
    // Skip models that don't support tools if we need them
    if (supportTools && tools && tools.length > 0 && !modelConfig.supportsTools) {
      attempts.push({ model: modelConfig.id, status: 'skipped', reason: 'no tool support' });
      continue;
    }

    try {
      const requestBody = {
        model: modelConfig.model,
        messages,
        temperature,
        max_tokens,
      };

      // Only include tools if provided
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = tool_choice;
      }

      console.log(`[GroqModels] Trying ${modelConfig.name} (${modelConfig.model})...`);
      
      const result = await client.chat.completions.create(requestBody);
      
      console.log(`[GroqModels] ✅ Success with ${modelConfig.name}!`);
      attempts.push({ model: modelConfig.id, status: 'success' });
      
      return { result, model: modelConfig.id, attempts };

    } catch (err) {
      const isRateLimit = err.status === 429 || 
        err.message?.includes('rate') || 
        err.message?.includes('Rate limit') ||
        err.message?.includes('too many requests') ||
        err.message?.includes('requests per') ||
        err.message?.includes('tokens per');
      
      const isModelError = err.status === 404 || 
        err.message?.includes('model') && err.message?.includes('not found');

      const isTimeout = err.message?.includes('timeout') || 
        err.message?.includes('TIMEOUT');

      if (isRateLimit) {
        markModelRateLimited(modelConfig.id);
        attempts.push({ model: modelConfig.id, status: 'rate_limited' });
        console.log(`[GroqModels] ⏳ ${modelConfig.name} rate limited, trying next model...`);
        continue;
      }

      if (isModelError) {
        attempts.push({ model: modelConfig.id, status: 'model_not_found' });
        console.log(`[GroqModels] ❌ ${modelConfig.name} not available, trying next model...`);
        continue;
      }

      if (isTimeout) {
        markModelRateLimited(modelConfig.id);
        attempts.push({ model: modelConfig.id, status: 'timeout' });
        console.log(`[GroqModels] ⏱️ ${modelConfig.name} timed out, trying next model...`);
        lastError = err;
        continue;
      }

      // Other error — don't rate limit, might be temporary
      attempts.push({ model: modelConfig.id, status: 'error', message: err.message });
      console.log(`[GroqModels] ❌ ${modelConfig.name} error: ${err.message}`);
      lastError = err;
    }
  }

  // All models failed
  const modelNames = attempts.map(a => a.model).join(', ');
  const errorSummary = attempts.map(a => `${a.model}: ${a.status}`).join('; ');
  
  throw new Error(
    `All Groq models failed. Attempted: [${modelNames}]. ` +
    `Details: ${errorSummary}. ` +
    `Last error: ${lastError?.message || 'unknown'}.`
  );
}

/**
 * Get status of all Groq models
 */
function getModelStatus() {
  const apiKey = process.env.GROQ_API_KEY;
  const isConfigured = !!(apiKey && apiKey !== 'gsk_placeholder' && apiKey !== '');
  const now = Date.now();

  return GROQ_MODELS.map(m => ({
    id: m.id,
    name: m.name,
    model: m.model,
    configured: isConfigured,
    rateLimited: rateLimitMap.has(m.id),
    rateLimitExpires: rateLimitMap.has(m.id)
      ? new Date(rateLimitMap.get(m.id) + RATE_LIMIT_COOLDOWN_MS).toISOString()
      : null,
    supportsTools: m.supportsTools,
  }));
}

/**
 * Get available models (for backward compatibility with chatService)
 */
function getAvailableProviders() {
  return getAvailableModels();
}

module.exports = {
  chatCompletions,
  getModelStatus,
  getAvailableModels,
  getAvailableProviders,
  GROQ_MODELS,
};
