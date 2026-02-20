/**
 * LOCAL AI HELPER - SafeScoring
 * Uses Ollama with llama3.2 for fast, free local inference
 *
 * Usage:
 *   import { classifyText, validateInput, quickAnswer } from '@/libs/local-ai';
 *   const result = await classifyText("user input", ["spam", "valid", "unclear"]);
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL_FAST || 'llama3.2:latest';
const TIMEOUT_MS = 15000; // 15s max

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.models?.length > 0;
    }
  } catch (e) {
    // Ollama not running - expected in production
  }
  return false;
}

/**
 * Call Ollama with a prompt
 */
async function callOllama(prompt, maxTokens = 100) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: maxTokens
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.response?.trim() || null;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.log('[LOCAL-AI] Ollama timeout or error:', e.message);
  }
  return null;
}

/**
 * CLASSIFY TEXT into categories
 *
 * @param {string} text - Text to classify
 * @param {string[]} categories - Possible categories
 * @returns {Promise<string|null>} - Classified category or null
 *
 * Example:
 *   classifyText("wrong score calculation", ["typo", "methodology", "data_error"])
 *   // Returns: "methodology"
 */
export async function classifyText(text, categories) {
  if (!await isOllamaAvailable()) return null;

  const prompt = `Classify this text into one of these categories: ${categories.join(', ')}

Text: "${text.slice(0, 500)}"

Reply with ONLY the category name, nothing else.`;

  const result = await callOllama(prompt, 20);

  // Validate result is one of the categories
  if (result) {
    const normalized = result.toLowerCase().trim();
    const match = categories.find(c =>
      normalized.includes(c.toLowerCase()) ||
      c.toLowerCase().includes(normalized)
    );
    return match || null;
  }
  return null;
}

/**
 * VALIDATE INPUT for quality/spam
 *
 * @param {string} input - User input to validate
 * @param {string} context - What the input should be (e.g., "email correction reason")
 * @returns {Promise<{valid: boolean, reason: string}|null>}
 *
 * Example:
 *   validateInput("asdfasdf", "correction reason")
 *   // Returns: { valid: false, reason: "Too vague, needs specific details" }
 */
export async function validateInput(input, context) {
  if (!await isOllamaAvailable()) return null;

  const prompt = `Is this a valid ${context}?

Input: "${input.slice(0, 300)}"

Reply in this exact format:
VALID: yes or no
REASON: brief explanation

Be strict - reject spam, gibberish, or low-quality input.`;

  const result = await callOllama(prompt, 50);

  if (result) {
    const validMatch = result.match(/VALID:\s*(yes|no)/i);
    const reasonMatch = result.match(/REASON:\s*(.+)/i);

    if (validMatch) {
      return {
        valid: validMatch[1].toLowerCase() === 'yes',
        reason: reasonMatch?.[1]?.trim() || ''
      };
    }
  }
  return null;
}

/**
 * QUICK ANSWER for simple yes/no questions
 *
 * @param {string} question - Question to answer
 * @param {object} context - Additional context
 * @returns {Promise<boolean|null>}
 *
 * Example:
 *   quickAnswer("Is 'gmail.com' a trusted email domain?")
 *   // Returns: true
 */
export async function quickAnswer(question) {
  if (!await isOllamaAvailable()) return null;

  const prompt = `${question}

Answer with ONLY "yes" or "no".`;

  const result = await callOllama(prompt, 5);

  if (result) {
    const normalized = result.toLowerCase().trim();
    if (normalized.includes('yes')) return true;
    if (normalized.includes('no')) return false;
  }
  return null;
}

/**
 * EXTRACT KEYWORDS from text
 *
 * @param {string} text - Text to analyze
 * @param {number} maxKeywords - Maximum keywords to extract
 * @returns {Promise<string[]|null>}
 */
export async function extractKeywords(text, maxKeywords = 5) {
  if (!await isOllamaAvailable()) return null;

  const prompt = `Extract the ${maxKeywords} most important keywords from this text.

Text: "${text.slice(0, 500)}"

Reply with ONLY the keywords separated by commas, nothing else.`;

  const result = await callOllama(prompt, 50);

  if (result) {
    return result
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0)
      .slice(0, maxKeywords);
  }
  return null;
}

/**
 * SENTIMENT ANALYSIS
 *
 * @param {string} text - Text to analyze
 * @returns {Promise<'positive'|'negative'|'neutral'|null>}
 */
export async function analyzeSentiment(text) {
  return classifyText(text, ['positive', 'negative', 'neutral']);
}

/**
 * DETECT LANGUAGE
 *
 * @param {string} text - Text to analyze
 * @returns {Promise<string|null>} - Language code (en, fr, de, es, etc.)
 */
export async function detectLanguage(text) {
  if (!await isOllamaAvailable()) return null;

  const prompt = `What language is this text written in?

Text: "${text.slice(0, 200)}"

Reply with ONLY the 2-letter language code (en, fr, de, es, pt, ja, zh, etc.)`;

  const result = await callOllama(prompt, 5);

  if (result) {
    const match = result.match(/[a-z]{2}/i);
    return match ? match[0].toLowerCase() : null;
  }
  return null;
}

// Export availability check for conditional usage
export { isOllamaAvailable };
