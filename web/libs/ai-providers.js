/**
 * Multi-provider AI configuration for SafeScoring
 *
 * SMART ROUTING — route by question complexity to optimize cost:
 *
 * ┌─────────────┬──────────────────────────┬────────────────────┬─────────────┐
 * │ Complexity   │ Model                    │ Cost/1M tokens     │ Cost/msg    │
 * ├─────────────┼──────────────────────────┼────────────────────┼─────────────┤
 * │ Simple       │ LLaMA 3.1 8B Instant     │ $0.05 in / $0.08 out │ ~$0.0001  │
 * │ Complex      │ LLaMA 3.3 70B Versatile  │ $0.59 in / $0.79 out │ ~$0.001   │
 * └─────────────┴──────────────────────────┴────────────────────┴─────────────┘
 *
 * 10x cheaper for simple questions = can afford way more free messages.
 * Complex = comparison, multi-product analysis, strategy, DeFi advice.
 * Simple = "what is X?", single product lookup, basic recommendation.
 *
 * Cascade fallback: Groq → Gemini → OpenAI (per complexity tier)
 */
import OpenAI from "openai";

// ============================================================
// COMPLEXITY DETECTION
// ============================================================

// Keywords/patterns that indicate a complex question
const COMPLEX_PATTERNS = [
  // Comparisons
  /compar/i, /vs\.?[\s]/i, /versus/i, /differ/i, /better|worse|best|worst/i,
  /entre|zwischen|entre|比较|比べ/i,
  // Multi-product analysis
  /setup|portfolio|combination|stack|strateg/i,
  /diversif/i, /allocat/i, /optimize|optimise/i,
  // Deep analysis
  /explain.*why|why.*score|analyz|analyse|in.?depth|detail/i,
  /audit|review.*my|evaluat/i,
  // DeFi / advanced
  /defi|yield|liquidity|staking|impermanent/i,
  /smart.?contract|bridge|cross.?chain/i,
  // Risk assessment
  /risk|vulnerab|threat|attack|hack/i,
  /incident|breach|exploit/i,
  // Migration / strategy
  /migrat|switch|replac|transition|upgrade/i,
  /plan|roadmap|recommend.*multiple/i,
];

/**
 * Detect if a message requires the complex (70B) or simple (8B) model
 * Returns "complex" or "simple"
 */
export function detectComplexity(messages) {
  // Look at the last user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return "simple";

  const text = lastUserMsg.content;

  // Long messages (>150 chars) are likely complex
  if (text.length > 150) return "complex";

  // Check for complex patterns
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(text)) return "complex";
  }

  // Multi-question (contains "?" more than once)
  const questionMarks = (text.match(/\?/g) || []).length;
  if (questionMarks >= 2) return "complex";

  // If conversation is long (>4 exchanges), user needs deeper analysis
  const userMsgCount = messages.filter((m) => m.role === "user").length;
  if (userMsgCount > 4) return "complex";

  return "simple";
}

// ============================================================
// PROVIDER CONFIGURATIONS — per complexity tier
// ============================================================
const PROVIDERS = {
  simple: [
    {
      name: "groq",
      label: "Groq (LLaMA 3.1 8B)",
      baseURL: "https://api.groq.com/openai/v1",
      apiKeyEnv: "GROQ_API_KEY",
      model: "llama-3.1-8b-instant",
      maxTokens: 500,
      temperature: 0.7,
      // $0.05/1M in, $0.08/1M out → ~$0.0001/message
    },
    {
      name: "gemini",
      label: "Google Gemini Flash-Lite",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKeyEnv: "GEMINI_API_KEY",
      model: "gemini-2.0-flash-lite",
      maxTokens: 500,
      temperature: 0.7,
    },
  ],
  complex: [
    {
      name: "groq",
      label: "Groq (LLaMA 3.3 70B)",
      baseURL: "https://api.groq.com/openai/v1",
      apiKeyEnv: "GROQ_API_KEY",
      model: "llama-3.3-70b-versatile",
      maxTokens: 800,
      temperature: 0.7,
      // $0.59/1M in, $0.79/1M out → ~$0.001/message
    },
    {
      name: "gemini",
      label: "Google Gemini Flash",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKeyEnv: "GEMINI_API_KEY",
      model: "gemini-2.0-flash",
      maxTokens: 800,
      temperature: 0.7,
    },
    {
      name: "openai",
      label: "OpenAI GPT-4o-mini",
      baseURL: "https://api.openai.com/v1",
      apiKeyEnv: "OPENAI_API_KEY",
      model: "gpt-4o-mini",
      maxTokens: 800,
      temperature: 0.7,
    },
  ],
};

// ============================================================
// CLIENT MANAGEMENT
// ============================================================
const clientCache = new Map();

function getClient(provider) {
  const cacheKey = `${provider.name}-${provider.model}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseURL,
  });

  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Get available providers for a complexity tier
 */
export function getAvailableProviders(complexity = "simple") {
  const tier = PROVIDERS[complexity] || PROVIDERS.simple;
  return tier.filter((p) => process.env[p.apiKeyEnv]);
}

/**
 * Call AI with smart model routing + cascade fallback
 *
 * @param {Array} messages - OpenAI-format messages array
 * @param {"simple"|"complex"} complexity - detected complexity
 * @returns {{ content, provider, model, label, complexity }}
 */
export async function callAI(messages, complexity = "simple") {
  const available = getAvailableProviders(complexity);

  if (available.length === 0) {
    // Fallback: try other tier if this one has no providers
    const fallbackComplexity = complexity === "simple" ? "complex" : "simple";
    const fallback = getAvailableProviders(fallbackComplexity);
    if (fallback.length === 0) {
      throw new Error("No AI providers configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.");
    }
    return callAI(messages, fallbackComplexity);
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
        complexity,
      };
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const message = err?.message || "Unknown error";

      console.warn(`AI ${provider.name}/${provider.model} failed (${status}): ${message}`);
      errors.push({ provider: provider.name, error: message, status });

      if (status === 401 || status === 403) {
        console.error(`AI provider ${provider.name}: invalid API key`);
      }
      continue;
    }
  }

  // All providers in this tier failed — try the other tier
  if (complexity === "simple") {
    console.warn("Simple tier exhausted, falling back to complex tier");
    try {
      return await callAI(messages, "complex");
    } catch {
      // Fall through to error
    }
  }

  const errorSummary = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All AI providers failed: ${errorSummary}`);
}

/**
 * Get provider status info for debugging / admin
 */
export function getProviderStatus() {
  const allProviders = [...PROVIDERS.simple, ...PROVIDERS.complex];
  const seen = new Set();
  return allProviders
    .filter((p) => {
      const key = `${p.name}-${p.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({
      name: p.name,
      label: p.label,
      model: p.model,
      configured: !!process.env[p.apiKeyEnv],
    }));
}
