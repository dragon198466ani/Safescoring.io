import os
from dotenv import load_dotenv
load_dotenv()

keys = [
    'GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
    'GROQ_API_KEY', 'GROQ_API_KEY_2',
    'CEREBRAS_API_KEY', 'DEEPSEEK_API_KEY',
    'CLAUDE_CODE_ONLY', 'CLAUDE_API_KEY',
    'MISTRAL_API_KEY', 'OLLAMA_BASE_URL',
]

for k in keys:
    val = os.getenv(k, '')
    if val:
        print(f"  {k}: SET ({val[:8]}...)")
    else:
        print(f"  {k}: NOT SET")
