/**
 * Multi-provider AI configuration for SafeScoring
 *
 * Strategy: Groq (1 key, free or Dev tier) → Gemini (free backup) → OpenAI (paid backup)
 * Rate limits are per-organization, so multiple keys on the same account don't help.
 * For scaling beyond 1,000 req/day: upgrade to Groq Dev tier (~$0.05/1M tokens).
 *
 * All providers use OpenAI-compatible SDK format.
 */
import OpenAI from "openai";

// ============================================================
// PROVIDER CONFIGURATIONS — order = priority
// ============================================================
const PROVIDERS = [
  {
    name: "groq",
    label: "Groq (LLaMA 3.3 70B)",
    baseURL: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    maxTokens: 800,
    temperature: 0.7,
    // Free: 1,000 RPD, 30 RPM. Dev tier: unlimited RPD.
  },
  {
    name: "gemini",
    label: "Google Gemini Flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GEMINI_API_KEY",
    model: "gemini-2.0-flash-lite",
    maxTokens: 800,
    temperature: 0.7,
    // Free: 1,000 RPD, 15 RPM
  },
  {
    name: "openai",
    label: "OpenAI GPT-4o-mini",
    baseURL: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
    maxTokens: 800,
    temperature: 0.7,
    // Paid — no hard daily limit
  },
];

// ============================================================
// CLIENT MANAGEMENT
// ============================================================
const clientCache = new Map();

function getClient(provider) {
  if (clientCache.has(provider.name)) {
    return clientCache.get(provider.name);
  }

  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });

  clientCache.set(provider.name, client);
  return client;
}

/**
 * Get all available providers (those with API keys configured)
 */
export function getAvailableProviders() {
  return PROVIDERS.filter((p) => process.env[p.apiKeyEnv]);
}

/**
 * Call AI with automatic cascade fallback
 * Tries each provider in order: Groq → Gemini → OpenAI
 * On rate limit (429) or error, falls through to next provider.
 *
 * @param {Array} messages - OpenAI-format messages array
 * @returns {{ content: string, provider: string, model: string, label: string }}
 */
export async function callAI(messages) {
  const available = getAvailableProviders();

  if (available.length === 0) {
    throw new Error("No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.");
  }

  const errors = [];

  for (const provider of available) {
    const client = getClient(provider);
    if (!client) continue;

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
        continue;
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

      console.warn(`AI provider ${provider.name} failed (${status}): ${message}`);
      errors.push({ provider: provider.name, error: message, status });

      // Auth error → log and skip
      if (status === 401 || status === 403) {
        console.error(`AI provider ${provider.name}: invalid API key`);
      }

      // Any error (429 rate limit, 5xx server, etc.) → try next provider
      continue;
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
    configured: !!process.env[p.apiKeyEnv],
  }));
}
