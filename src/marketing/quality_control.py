#!/usr/bin/env python3
"""
Content Quality Control System
Ensures ALL content meets quality standards before publishing.

Quality Checks:
1. Spelling & Grammar
2. Brand voice consistency
3. Factual accuracy
4. SEO optimization
5. Engagement potential
6. Spam detection
"""

import asyncio
import os
import json
from datetime import datetime
from pathlib import Path
import sys
import re

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.core.api_provider import AIProvider

# Freemium compliance - only promote free features
try:
    from src.marketing.freemium_config import (
        check_content_for_paid_mentions,
        MARKETING_RULES
    )
    FREEMIUM_AVAILABLE = True
except ImportError:
    FREEMIUM_AVAILABLE = False


class QualityControl:
    """AI-powered content quality control"""

    def __init__(self):
        self.ai = AIProvider()
        self.min_score = 70  # Minimum score to publish

        # Brand voice guidelines
        self.brand_voice = {
            'tone': 'Professional but approachable, technical but clear',
            'personality': [
                'Trustworthy - We back claims with data',
                'Helpful - We educate, not just promote',
                'Objective - We present facts, not opinions',
                'Concise - We respect readers time'
            ],
            'avoid': [
                'Hype words (revolutionary, game-changing, amazing)',
                'Financial advice (buy, sell, invest)',
                'Absolute claims without data',
                'Negative attacks on competitors',
                'Excessive emojis (max 2-3 per post)',
                'ALL CAPS except for acronyms',
                'Clickbait titles without substance'
            ],
            'include': [
                'Data and statistics when available',
                'Clear call-to-action',
                'SafeScoring methodology reference when relevant',
                'Links to full reports for details'
            ]
        }

        # Quality criteria weights (must sum to 100)
        self.criteria = {
            'grammar': 10,
            'brand_voice': 15,
            'accuracy': 20,
            'engagement': 15,
            'seo': 10,
            'spam_check': 10,
            'freemium': 20  # HIGH weight - must not promote paid features
        }

    async def check_grammar(self, content: str) -> dict:
        """Check spelling and grammar"""
        prompt = f"""
Analyze this content for grammar and spelling errors.

Content:
{content}

Return JSON:
{{
    "score": 0-100,
    "errors": ["list of specific errors"],
    "suggestions": ["list of fixes"]
}}
        """

        try:
            response = await self.ai.generate(prompt, max_tokens=500)
            return json.loads(response)
        except (json.JSONDecodeError, Exception):
            return {"score": 80, "errors": [], "suggestions": []}

    async def check_brand_voice(self, content: str) -> dict:
        """Check if content matches brand voice"""
        prompt = f"""
Analyze if this content matches our brand voice guidelines.

Brand Voice:
- Tone: {self.brand_voice['tone']}
- Personality: {', '.join(self.brand_voice['personality'])}
- Avoid: {', '.join(self.brand_voice['avoid'])}
- Include: {', '.join(self.brand_voice['include'])}

Content:
{content}

Return JSON:
{{
    "score": 0-100,
    "matches": ["what aligns with brand"],
    "violations": ["what doesn't align"],
    "suggestions": ["how to improve"]
}}
        """

        try:
            response = await self.ai.generate(prompt, max_tokens=500)
            return json.loads(response)
        except (json.JSONDecodeError, Exception):
            return {"score": 75, "matches": [], "violations": [], "suggestions": []}

    async def check_accuracy(self, content: str) -> dict:
        """Check factual accuracy of claims"""
        prompt = f"""
Analyze this crypto security content for factual accuracy.

Content:
{content}

Check for:
1. Verifiable claims vs opinions
2. Outdated information
3. Misleading statistics
4. Unsupported assertions

Return JSON:
{{
    "score": 0-100,
    "verified_claims": ["claims that are accurate"],
    "unverified_claims": ["claims that need sources"],
    "potential_issues": ["accuracy concerns"],
    "suggestions": ["how to improve accuracy"]
}}
        """

        try:
            response = await self.ai.generate(prompt, max_tokens=500)
            return json.loads(response)
        except (json.JSONDecodeError, Exception):
            return {"score": 70, "verified_claims": [], "unverified_claims": [], "suggestions": []}

    async def check_engagement(self, content: str, platform: str = 'twitter') -> dict:
        """Check engagement potential"""
        prompt = f"""
Rate the engagement potential of this {platform} content.

Content:
{content}

Analyze:
1. Hook strength (first line)
2. Emotional resonance
3. Call-to-action clarity
4. Shareability
5. Comment-worthiness

Return JSON:
{{
    "score": 0-100,
    "hook_rating": 0-100,
    "strengths": ["what works well"],
    "weaknesses": ["what could improve"],
    "suggestions": ["specific improvements"]
}}
        """

        try:
            response = await self.ai.generate(prompt, max_tokens=500)
            return json.loads(response)
        except (json.JSONDecodeError, Exception):
            return {"score": 70, "strengths": [], "weaknesses": [], "suggestions": []}

    async def check_seo(self, content: str, keywords: list = None) -> dict:
        """Check SEO optimization"""
        keywords = keywords or ['crypto security', 'SafeScoring', 'wallet security']

        prompt = f"""
Analyze SEO optimization of this content.

Content:
{content}

Target keywords: {', '.join(keywords)}

Check:
1. Keyword presence and density
2. Readability
3. Structure (headers, lists)
4. Meta-friendly length

Return JSON:
{{
    "score": 0-100,
    "keyword_usage": {{"keyword": "frequency"}},
    "readability": "easy/medium/hard",
    "suggestions": ["SEO improvements"]
}}
        """

        try:
            response = await self.ai.generate(prompt, max_tokens=400)
            return json.loads(response)
        except (json.JSONDecodeError, Exception):
            return {"score": 75, "suggestions": []}

    async def check_spam(self, content: str) -> dict:
        """Check for spam indicators"""
        spam_indicators = [
            r'\b(FREE|GUARANTEED|LIMITED TIME|ACT NOW)\b',
            r'!!+',
            r'\$\$+',
            r'🚀{3,}',
            r'(click here|buy now|don\'t miss)',
            r'(100x|1000x|moon)',
        ]

        score = 100
        issues = []

        for pattern in spam_indicators:
            if re.search(pattern, content, re.IGNORECASE):
                score -= 15
                issues.append(f"Spam pattern detected: {pattern}")

        # Check emoji density
        emoji_count = len(re.findall(r'[\U0001F300-\U0001F9FF]', content))
        if emoji_count > 5:
            score -= 10
            issues.append(f"Too many emojis: {emoji_count}")

        # Check caps ratio
        caps_ratio = sum(1 for c in content if c.isupper()) / max(len(content), 1)
        if caps_ratio > 0.3:
            score -= 15
            issues.append(f"Too much CAPS: {caps_ratio:.0%}")

        return {
            "score": max(0, score),
            "issues": issues,
            "is_spam": score < 50
        }

    def check_freemium_compliance(self, content: str) -> dict:
        """
        Check that content only promotes FREE features.
        CRITICAL: Marketing must not mention paid features, API, pricing, etc.
        """
        if not FREEMIUM_AVAILABLE:
            return {"score": 100, "issues": [], "is_compliant": True}

        issues = check_content_for_paid_mentions(content)

        # Also check for forbidden terms
        forbidden_terms = MARKETING_RULES.get('never_mention', [])
        content_lower = content.lower()

        for term in forbidden_terms:
            if term.lower() in content_lower:
                issues.append(f"Mentions paid/forbidden term: '{term}'")

        score = 100 - (len(issues) * 20)  # -20 per issue

        return {
            "score": max(0, score),
            "issues": issues,
            "is_compliant": len(issues) == 0
        }

    async def full_review(self, content: str, platform: str = 'twitter') -> dict:
        """Run full quality review"""
        print(f"🔍 Running quality review...")

        # Check freemium compliance FIRST (blocking)
        freemium_check = self.check_freemium_compliance(content)
        if not freemium_check['is_compliant']:
            print(f"   ⚠️ FREEMIUM VIOLATION: {freemium_check['issues']}")

        # Run all checks in parallel
        results = await asyncio.gather(
            self.check_grammar(content),
            self.check_brand_voice(content),
            self.check_accuracy(content),
            self.check_engagement(content, platform),
            self.check_seo(content),
            self.check_spam(content)
        )

        checks = {
            'grammar': results[0],
            'brand_voice': results[1],
            'accuracy': results[2],
            'engagement': results[3],
            'seo': results[4],
            'spam_check': results[5],
            'freemium': freemium_check  # Add freemium check
        }

        # Calculate weighted score
        total_score = 0
        for check_name, weight in self.criteria.items():
            check_score = checks[check_name].get('score', 50)
            total_score += (check_score * weight / 100)

        # Compile all suggestions
        all_suggestions = []
        for check in checks.values():
            all_suggestions.extend(check.get('suggestions', []))

        # Content must pass score AND be freemium compliant
        is_freemium_compliant = checks.get('freemium', {}).get('is_compliant', True)
        passed = total_score >= self.min_score and is_freemium_compliant

        review = {
            'content': content[:200] + '...' if len(content) > 200 else content,
            'platform': platform,
            'overall_score': round(total_score),
            'passed': passed,
            'freemium_compliant': is_freemium_compliant,
            'checks': checks,
            'suggestions': all_suggestions[:5],  # Top 5 suggestions
            'reviewed_at': datetime.now().isoformat()
        }

        self._log_review(review)

        return review

    def _log_review(self, review: dict):
        """Log review for analytics"""
        log_dir = Path('logs/quality_reviews')
        log_dir.mkdir(parents=True, exist_ok=True)

        filename = f"review_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_dir / filename, 'w') as f:
            json.dump(review, f, indent=2)

    async def improve_content(self, content: str, review: dict) -> str:
        """Improve content based on review feedback"""
        if review['passed']:
            return content

        suggestions = review.get('suggestions', [])
        issues = []

        for check in review.get('checks', {}).values():
            issues.extend(check.get('violations', []))
            issues.extend(check.get('issues', []))
            issues.extend(check.get('errors', []))

        prompt = f"""
Improve this content based on the feedback below.

Original content:
{content}

Issues to fix:
{chr(10).join(f'- {i}' for i in issues[:10])}

Suggestions:
{chr(10).join(f'- {s}' for s in suggestions[:5])}

Rewrite the content to address these issues while keeping the core message.
Maintain our brand voice: {self.brand_voice['tone']}

Improved content:
        """

        try:
            improved = await self.ai.generate(prompt, max_tokens=len(content) * 2)
            return improved.strip() if improved else content
        except Exception:
            return content

    async def review_and_improve(self, content: str, platform: str = 'twitter', max_iterations: int = 3) -> dict:
        """Review content and improve until it passes"""
        current_content = content
        iterations = 0

        while iterations < max_iterations:
            review = await self.full_review(current_content, platform)

            print(f"   Iteration {iterations + 1}: Score {review['overall_score']}/100")

            if review['passed']:
                return {
                    'original': content,
                    'final': current_content,
                    'score': review['overall_score'],
                    'iterations': iterations + 1,
                    'passed': True
                }

            # Improve content
            current_content = await self.improve_content(current_content, review)
            iterations += 1

        # Final review
        final_review = await self.full_review(current_content, platform)

        return {
            'original': content,
            'final': current_content,
            'score': final_review['overall_score'],
            'iterations': iterations,
            'passed': final_review['passed'],
            'suggestions': final_review.get('suggestions', [])
        }


class ContentApprovalWorkflow:
    """Workflow for content approval before publishing"""

    def __init__(self):
        self.qc = QualityControl()
        self.pending_dir = Path('drafts/pending')
        self.approved_dir = Path('drafts/approved')
        self.rejected_dir = Path('drafts/rejected')

        for d in [self.pending_dir, self.approved_dir, self.rejected_dir]:
            d.mkdir(parents=True, exist_ok=True)

    async def submit_for_review(self, content: str, metadata: dict) -> dict:
        """Submit content for quality review"""
        result = await self.qc.review_and_improve(
            content,
            platform=metadata.get('platform', 'twitter')
        )

        # Save to appropriate folder
        filename = f"{metadata.get('type', 'post')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        output = {
            'content': result['final'],
            'original': result['original'],
            'metadata': metadata,
            'quality_score': result['score'],
            'passed': result['passed'],
            'suggestions': result.get('suggestions', []),
            'submitted_at': datetime.now().isoformat()
        }

        if result['passed']:
            with open(self.approved_dir / filename, 'w') as f:
                json.dump(output, f, indent=2)
            print(f"✅ Approved: {filename} (Score: {result['score']})")
        else:
            with open(self.rejected_dir / filename, 'w') as f:
                json.dump(output, f, indent=2)
            print(f"❌ Needs review: {filename} (Score: {result['score']})")

        return output

    async def process_pending(self):
        """Process all pending content"""
        results = []

        for file in self.pending_dir.glob('*.json'):
            with open(file, 'r') as f:
                data = json.load(f)

            result = await self.submit_for_review(
                data.get('content', ''),
                data.get('metadata', {})
            )
            results.append(result)

            # Move processed file
            file.unlink()

        return results


async def main():
    # Test quality control
    qc = QualityControl()

    test_content = """
🚨🚨🚨 BREAKING: Massive hack at DeFi protocol!!!

Your funds might be at RISK!!! Check NOW if you're affected!!!

This is INSANE - $50M stolen in seconds!

Click here to check: safescoring.io

Don't miss this - could save your crypto! 🚀🚀🚀
    """

    print("Testing quality control on spam-like content...")
    review = await qc.full_review(test_content, 'twitter')

    print(f"\n📊 Quality Score: {review['overall_score']}/100")
    print(f"✓ Passed: {review['passed']}")
    print(f"\n🔧 Suggestions:")
    for s in review['suggestions']:
        print(f"   - {s}")

    # Test improvement
    if not review['passed']:
        print("\n🔄 Improving content...")
        result = await qc.review_and_improve(test_content, 'twitter')
        print(f"\n📝 Improved version (Score: {result['score']}):")
        print(result['final'])


if __name__ == '__main__':
    asyncio.run(main())
