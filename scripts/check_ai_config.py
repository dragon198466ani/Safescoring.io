#!/usr/bin/env python3
"""Check AI provider configuration"""
import sys
sys.path.insert(0, 'src')
from core.config import (
    GEMINI_API_KEY, GEMINI_API_KEYS,
    GROQ_API_KEY, GROQ_API_KEYS,
    CLAUDE_API_KEY, DEEPSEEK_API_KEY,
    CEREBRAS_API_KEY, CEREBRAS_API_KEYS,
    OPENROUTER_API_KEY, OPENROUTER_API_KEYS,
    SAMBANOVA_API_KEY, OLLAMA_URL
)

print("=" * 50)
print("  AI PROVIDER CONFIGURATION")
print("=" * 50)
print(f"GEMINI:     {'Yes (' + str(len(GEMINI_API_KEYS or [])) + ' keys)' if GEMINI_API_KEY else 'No'}")
print(f"GROQ:       {'Yes (' + str(len(GROQ_API_KEYS or [])) + ' keys)' if GROQ_API_KEY else 'No'}")
print(f"CEREBRAS:   {'Yes (' + str(len(CEREBRAS_API_KEYS or [])) + ' keys)' if CEREBRAS_API_KEY else 'No'}")
print(f"OPENROUTER: {'Yes (' + str(len(OPENROUTER_API_KEYS or [])) + ' keys)' if OPENROUTER_API_KEY else 'No'}")
print(f"SAMBANOVA:  {'Yes' if SAMBANOVA_API_KEY else 'No'}")
print(f"OLLAMA:     {'Yes (' + str(OLLAMA_URL) + ')' if OLLAMA_URL else 'No'}")
print(f"CLAUDE:     {'Yes' if CLAUDE_API_KEY else 'No'}")
print(f"DEEPSEEK:   {'Yes' if DEEPSEEK_API_KEY else 'No'}")

# Test a simple call
print("\nTesting API call...")
from core.api_provider import AIProvider
provider = AIProvider()

test_prompt = "Respond with just 'OK' if you can understand this."
result = provider.call_simple(test_prompt, max_tokens=10)
print(f"Test result: {result if result else 'FAILED'}")
