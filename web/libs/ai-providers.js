/**
 * Multi-provider AI configuration for SafeScoring
 *
 * Strategy: Groq with KEY ROTATION (15 keys = ~15,000 req/day free)
 * Fallback: Google Gemini → OpenAI (paid)
 *
 * All providers use OpenAI-compatible SDK format.
 */
import OpenAI from "openai";

// ============================================================
// GROQ KEY ROTATION
// Detects GROQ_API_KEY, GROQ_API_KEY_2, ..., GROQ_API_KEY_15
// Round-robin rotation for 15x free tier capacity
// ============================================================
function getGroqKeys() {
  const keys = [];
  // Primary key
  if (process.env.GROQ_API_KEY) {
    keys.push(process.env.GROQ_API_KEY);
  }
  // Additional keys: GROQ_API_KEY_2 through GROQ_API_KEY_20
  for (let i = 2; i <= 20; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

// Round-robin counter for Groq key rotation
let groqKeyIndex = 0;

function getNextGroqKey() {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;
  const key = keys[groqKeyIndex % keys.length];
  groqKeyIndex++;
  return key;
}

// ============================================================
// PROVIDER CONFIGURATIONS
// ============================================================
const PROVIDERS = [
  {
    name: "groq",
    label: "Groq (LLaMA 3.3 70B)",
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    maxTokens: 800,
    temperature: 0.7,
    getApiKey: getNextGroqKey,
    // Per-key: ~1,000 req/day. With 15 keys = ~15,000 req/day
    isAvailable: () => getGroqKeys().length > 0,
  },
  {
    name: "gemini",
    label: "Google Gemini Flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.0-flash-lite",
    maxTokens: 800,
    temperature: 0.7,
    getApiKey: () => process.env.GEMINI_API_KEY || null,
    isAvailable: () => !!process.env.GEMINI_API_KEY,
  },
  {
    name: "openai",
    label: "OpenAI GPT-4o-mini",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    maxTokens: 800,
    temperature: 0.7,
    getApiKey: () => process.env.OPENAI_API_KEY || null,
    isAvailable: () => !!process.env.OPENAI_API_KEY,
  },
];

/**
 * Create a fresh OpenAI client for a provider (with rotated key for Groq)
 */
function createClient(provider) {
  const apiKey = provider.getApiKey();
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });
}

/**
 * Get all available providers (those with at least one API key)
 */
export function getAvailableProviders() {
  return PROVIDERS.filter((p) => p.isAvailable());
}

/**
 * Call AI with automatic cascade fallback + Groq key rotation
 *
 * For Groq: if one key hits rate limit, tries next key (up to all 15)
 * Then falls back to Gemini → OpenAI
 *
 * @param {Array} messages - OpenAI-format messages array
 * @returns {{ content: string, provider: string, model: string }}
 */
export async function callAI(messages) {
  const available = getAvailableProviders();

  if (available.length === 0) {
    throw new Error("No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.");
  }

  const errors = [];

  for (const provider of available) {
    // For Groq: try multiple keys on rate limit
    const maxRetries = provider.name === "groq" ? Math.min(getGroqKeys().length, 3) : 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const client = createClient(provider);
      if (!client) break;

      try {
        const completion = await client.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: provider.maxTokens,
          temperature: provider.temperature,
        });

        const content = completion.choices?.[0]?.message?.content;
        if (!content) {
          errors.push({ provider: provider.name, error: "Empty response" });
          break; // Don't retry same provider for empty response
        }

        return {
          content,
          provider: provider.name,
          model: provider.model,
          label: provider.label,
        };
      } catch (err) {
        const status = err?.status || err?.response?.status;
        const message = err?.message || "Unknown error";

        console.warn(`AI provider ${provider.name} (attempt ${attempt + 1}) failed (${status}): ${message}`);
        errors.push({ provider: provider.name, error: message, status });

        // Rate limited → try next Groq key
        if (status === 429 && provider.name === "groq" && attempt < maxRetries - 1) {
          continue;
        }

        // Auth error → skip provider entirely
        if (status === 401 || status === 403) {
          console.error(`AI provider ${provider.name}: invalid API key`);
          break;
        }

        // Other errors → move to next provider
        break;
      }
    }
  }

  // All providers failed
  const errorSummary = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All AI providers failed: ${errorSummary}`);
}

/**
 * Get provider status info for debugging / admin
 */
export function getProviderStatus() {
  return PROVIDERS.map((p) => ({
    name: p.name,
    label: p.label,
    model: p.model,
    configured: p.isAvailable(),
    keyCount: p.name === "groq" ? getGroqKeys().length : p.isAvailable() ? 1 : 0,
  }));
}
