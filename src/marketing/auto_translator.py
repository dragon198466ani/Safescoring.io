#!/usr/bin/env python3
"""
Auto-Translation System
Translates marketing content to multiple languages automatically.

Supports:
- Website content
- Email templates
- Social media posts
- SEO articles
"""

import asyncio
import os
import json
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.core.api_provider import AIProvider


class AutoTranslator:
    """Automatic content translation"""

    def __init__(self):
        self.ai = AIProvider()

        # Target languages with locale codes
        self.languages = {
            'fr': {'name': 'French', 'locale': 'fr-FR', 'priority': 1},
            'es': {'name': 'Spanish', 'locale': 'es-ES', 'priority': 2},
            'de': {'name': 'German', 'locale': 'de-DE', 'priority': 3},
            'pt': {'name': 'Portuguese', 'locale': 'pt-BR', 'priority': 4},
            'it': {'name': 'Italian', 'locale': 'it-IT', 'priority': 5},
            'ja': {'name': 'Japanese', 'locale': 'ja-JP', 'priority': 6},
            'ko': {'name': 'Korean', 'locale': 'ko-KR', 'priority': 7},
            'zh': {'name': 'Chinese', 'locale': 'zh-CN', 'priority': 8},
            'ru': {'name': 'Russian', 'locale': 'ru-RU', 'priority': 9},
            'ar': {'name': 'Arabic', 'locale': 'ar-SA', 'priority': 10},
        }

        self.translations_dir = Path('content/translations')
        self.translations_dir.mkdir(parents=True, exist_ok=True)

    async def translate_text(self, text: str, target_lang: str, context: str = 'marketing') -> str:
        """Translate text to target language"""
        lang_info = self.languages.get(target_lang)
        if not lang_info:
            return text

        prompt = f"""
Translate the following {context} content to {lang_info['name']}.

Guidelines:
- Maintain the same tone and style
- Keep technical terms in English if commonly used (e.g., "wallet", "DeFi")
- Adapt cultural references if necessary
- Keep URLs, brand names, and numbers unchanged
- Preserve markdown/HTML formatting

Original text:
{text}

Translate to {lang_info['name']}:
        """

        try:
            translation = await self.ai.generate(prompt, max_tokens=len(text) * 2)
            return translation.strip() if translation else text
        except Exception as e:
            print(f"Translation error ({target_lang}): {e}")
            return text

    async def translate_json_content(self, content: dict, target_lang: str) -> dict:
        """Translate JSON content recursively"""
        translated = {}

        for key, value in content.items():
            if isinstance(value, str) and len(value) > 3:
                translated[key] = await self.translate_text(value, target_lang)
            elif isinstance(value, dict):
                translated[key] = await self.translate_json_content(value, target_lang)
            elif isinstance(value, list):
                translated[key] = []
                for item in value:
                    if isinstance(item, str):
                        translated[key].append(await self.translate_text(item, target_lang))
                    elif isinstance(item, dict):
                        translated[key].append(await self.translate_json_content(item, target_lang))
                    else:
                        translated[key].append(item)
            else:
                translated[key] = value

        return translated

    async def translate_email_template(self, template: dict, target_lang: str) -> dict:
        """Translate email template"""
        return await self.translate_json_content(template, target_lang)

    async def translate_social_post(self, post: str, target_lang: str) -> str:
        """Translate social media post with character limit awareness"""
        lang_info = self.languages.get(target_lang)

        prompt = f"""
Translate this social media post to {lang_info['name']}.

Original: {post}

Guidelines:
- Keep it concise (Twitter-friendly)
- Maintain hashtags but translate if meaningful
- Keep @mentions and URLs unchanged
- Preserve emojis
- Max 280 characters if possible

Translated post:
        """

        try:
            translation = await self.ai.generate(prompt, max_tokens=300)
            return translation.strip()[:280] if translation else post
        except Exception as e:
            print(f"Social translation error: {e}")
            return post

    async def translate_website_content(self):
        """Translate main website content"""
        # Website strings to translate
        website_content = {
            'hero': {
                'title': 'Crypto Security Ratings You Can Trust',
                'subtitle': 'We analyze 500+ crypto products across 916 security norms so you can make safer choices.',
                'cta_primary': 'Explore Products',
                'cta_secondary': 'View Methodology'
            },
            'features': {
                'title': 'How SafeScoring Works',
                'items': [
                    {
                        'title': 'Security Analysis',
                        'description': 'Deep technical analysis of security architecture, code quality, and vulnerability history.'
                    },
                    {
                        'title': 'Audit Verification',
                        'description': 'Verification of third-party audits, bug bounties, and security certifications.'
                    },
                    {
                        'title': 'Functionality Testing',
                        'description': 'Assessment of feature completeness, reliability, and operational security.'
                    },
                    {
                        'title': 'User Experience',
                        'description': 'Evaluation of security UX, documentation, and support responsiveness.'
                    }
                ]
            },
            'cta': {
                'title': 'Check Your Favorite Crypto Product',
                'subtitle': 'Search from 500+ rated wallets, exchanges, and DeFi protocols.',
                'button': 'Search Products'
            },
            'footer': {
                'tagline': 'Making crypto safer, one score at a time.',
                'links': {
                    'products': 'Products',
                    'methodology': 'Methodology',
                    'api': 'API',
                    'blog': 'Blog',
                    'about': 'About',
                    'contact': 'Contact'
                }
            }
        }

        # Translate to all priority languages
        for lang_code, lang_info in sorted(
            self.languages.items(),
            key=lambda x: x[1]['priority']
        ):
            print(f"🌍 Translating to {lang_info['name']}...")

            translated = await self.translate_json_content(website_content, lang_code)

            # Save translation
            output_file = self.translations_dir / f'website_{lang_code}.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(translated, f, ensure_ascii=False, indent=2)

            print(f"   ✅ Saved: {output_file}")

            await asyncio.sleep(1)  # Rate limiting

    async def translate_marketing_batch(self, content_type: str, content: dict) -> dict:
        """Translate a batch of marketing content"""
        results = {}

        for lang_code in list(self.languages.keys())[:5]:  # Top 5 languages
            print(f"Translating to {self.languages[lang_code]['name']}...")
            results[lang_code] = await self.translate_json_content(content, lang_code)
            await asyncio.sleep(0.5)

        return results

    async def generate_multilingual_tweet(self, tweet: str) -> dict:
        """Generate tweet in multiple languages"""
        translations = {'en': tweet}

        for lang_code in ['fr', 'es', 'de', 'pt', 'ja']:
            translations[lang_code] = await self.translate_social_post(tweet, lang_code)
            await asyncio.sleep(0.5)

        return translations

    def get_stats(self) -> dict:
        """Get translation statistics"""
        stats = {'languages': len(self.languages), 'files': 0}

        for file in self.translations_dir.glob('*.json'):
            stats['files'] += 1

        return stats


async def main():
    translator = AutoTranslator()

    # Translate website content
    print("🌍 Starting website translation...")
    await translator.translate_website_content()

    # Test tweet translation
    test_tweet = "🚨 Security Alert: New vulnerability discovered in popular DeFi protocol. Check if you're affected at safescoring.io #CryptoSecurity"
    print("\n📱 Translating tweet...")
    translations = await translator.generate_multilingual_tweet(test_tweet)

    for lang, text in translations.items():
        print(f"   [{lang}] {text[:100]}...")

    print(f"\n📊 Stats: {translator.get_stats()}")


if __name__ == '__main__':
    asyncio.run(main())
