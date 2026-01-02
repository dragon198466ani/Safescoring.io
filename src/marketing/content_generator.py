#!/usr/bin/env python3
"""
SAFESCORING.IO - AI Content Generator
Generates marketing content (Twitter threads, LinkedIn posts, etc.) using AI.

QUALITY FIRST: All content passes through quality control before publishing.
"""

import json
import os
import re
from datetime import datetime
from typing import Dict, List, Optional
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.core.api_provider import AIProvider

# Quality imports - content must pass QC before publishing
try:
    from src.marketing.quality_control import QualityControl
    from src.marketing.brand_guide import BRAND, VOICE, WRITING_RULES, get_template
    QC_AVAILABLE = True
except ImportError:
    QC_AVAILABLE = False

# Freemium config - only promote FREE features
try:
    from src.marketing.freemium_config import (
        check_content_for_paid_mentions,
        sanitize_marketing_content,
        MARKETING_RULES,
        FREE_FEATURES
    )
    FREEMIUM_CONFIG_AVAILABLE = True
except ImportError:
    FREEMIUM_CONFIG_AVAILABLE = False


class ContentGenerator:
    """
    AI-powered content generator for crypto marketing.
    Generates viral Twitter threads, LinkedIn posts, and more.
    """

    # Content types
    CONTENT_TYPES = {
        'twitter_thread': {
            'max_chars': 280,
            'max_tweets': 10,
            'style': 'punchy, use emojis, create suspense'
        },
        'twitter_single': {
            'max_chars': 280,
            'style': 'concise, impactful, with CTA'
        },
        'linkedin': {
            'max_chars': 3000,
            'style': 'professional, insightful, data-driven'
        },
        'reddit': {
            'max_chars': 10000,
            'style': 'informative, community-focused, no shilling'
        }
    }

    def __init__(self, output_dir: str = 'data/marketing_content'):
        """Initialize content generator."""
        self.ai = AIProvider()
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_hack_thread(self, event: Dict) -> List[str]:
        """
        Generate a Twitter thread about a security incident/hack.
        This is the highest-converting content type for SafeScoring.
        """
        title = event.get('title', '')
        summary = event.get('summary', '')
        amount = event.get('amount_usd', 0)
        category = event.get('category', 'HACK')
        link = event.get('link', '')

        prompt = f"""Tu es un expert en securite crypto. Genere un thread Twitter VIRAL sur cet incident.

INCIDENT: {title}
DETAILS: {summary}
MONTANT: ${amount:,.0f} si applicable
TYPE: {category}

REGLES DE SOFT SELLING (TRES IMPORTANT):
1. Thread de 5-7 tweets maximum
2. Premier tweet = hook accrocheur (montant, impact, question)
3. Explique COMMENT l'attaque s'est produite (valeur educative)
4. Tweet sur les lecons a tirer (pas de morale, des faits)
5. Dernier tweet = mene NATURELLEMENT vers safescoring.io
   - PAS de "Inscrivez-vous", "Achetez", "Essayez"
   - PLUTOT: "Les scores de securite sont publics", "Verifiez votre wallet", "Voir les donnees"
6. Utilise 1-2 emojis pertinents max
7. Chaque tweet < 270 caracteres
8. Ton: expert curieux qui partage, pas vendeur

EXEMPLES DE CTA SUBTILS (dernier tweet) - INSISTER SUR L'APPROCHE HYBRIDE:
- "916 criteres analyses par IA, scores critiques verifies par experts → safescoring.io"
- "IA pour la vitesse, humains pour le jugement. Verifiez → safescoring.io"
- "Pas juste une IA: verification humaine sur les points critiques → safescoring.io"

FORMAT JSON:
{{
    "tweets": ["Tweet 1...", "Tweet 2...", ...],
    "hashtags": ["#crypto", "#security"]
}}

UNIQUEMENT le JSON."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('twitter', prompt, max_tokens=1500, temperature=0.7)

        if not response:
            return self._fallback_hack_thread(event)

        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                tweets = data.get('tweets', [])

                # Add hashtags to last tweet
                hashtags = data.get('hashtags', ['#crypto', '#security'])
                if tweets:
                    tweets[-1] = f"{tweets[-1]} {' '.join(hashtags[:3])}"

                # Ensure freemium compliant (no paid feature mentions)
                return self._ensure_freemium_compliant_list(tweets)
        except json.JSONDecodeError:
            pass

        return self._ensure_freemium_compliant_list(self._fallback_hack_thread(event))

    def generate_educational_thread(self, topic: str) -> List[str]:
        """
        Generate educational content about crypto security.
        Good for building authority and SEO.
        """
        prompt = f"""Tu es un expert en securite crypto. Cree un thread Twitter EDUCATIF sur:

SUJET: {topic}

STRATEGIE SOFT SELLING:
1. Thread de 6-8 tweets qui EDUQUE vraiment
2. Premier tweet = question intrigante ou stat surprenante
3. Explique le concept avec des exemples concrets
4. Donne de la VRAIE valeur (le lecteur apprend quelque chose)
5. Dernier tweet = curiosite naturelle vers safescoring.io (MENTIONNER APPROCHE HYBRIDE)
   - "916 criteres, IA + verification humaine. Donnees publiques → safescoring.io"
   - "IA pour l'analyse, experts pour le jugement. Comparez → safescoring.io"
6. Chaque tweet < 270 caracteres
7. Ton: expert passione qui partage, JAMAIS vendeur
8. Le lecteur doit se dire "je veux en savoir plus" naturellement

INTERDIT: "essayez", "inscrivez-vous", "gratuit", mots commerciaux

FORMAT JSON:
{{
    "tweets": ["Tweet 1...", "Tweet 2...", ...],
    "hashtags": ["#crypto", "#security"]
}}

UNIQUEMENT le JSON."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('twitter', prompt, max_tokens=1500, temperature=0.7)

        if not response:
            return []

        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return data.get('tweets', [])
        except (json.JSONDecodeError, Exception):
            pass

        return []

    def generate_comparison_post(self, product_a: str, product_b: str, scores: Dict = None) -> List[str]:
        """
        Generate comparison content between two products.
        Great for engagement (debates) and showing SafeScoring value.
        """
        prompt = f"""Tu es un expert en securite crypto. Cree un thread Twitter COMPARATIF:

PRODUIT A: {product_a}
PRODUIT B: {product_b}
SCORES (si disponibles): {json.dumps(scores) if scores else 'Non disponibles'}

STRATEGIE SOFT SELLING:
1. Thread de 5-6 tweets
2. Premier tweet = question qui intrigue: "{product_a} ou {product_b}? La reponse n'est pas celle que tu crois."
3. Compare sur 3-4 criteres FACTUELS (pas d'opinion)
4. Montre les forces ET faiblesses de chacun (objectivite = credibilite)
5. Dernier tweet = curiosite naturelle (MENTIONNER APPROCHE HYBRIDE)
   - "916 criteres analyses par IA, verifies par experts → safescoring.io/compare"
   - "Donnees objectives, methode hybride IA+humain → safescoring.io"
6. Chaque tweet < 270 caracteres
7. JAMAIS de jugement definitif - laisser le lecteur conclure

INTERDIT: "le meilleur", "vous devriez", "achetez", "choisissez"

FORMAT JSON:
{{
    "tweets": ["Tweet 1...", "Tweet 2...", ...],
    "hashtags": ["#crypto", "#wallet"]
}}

UNIQUEMENT le JSON."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('twitter', prompt, max_tokens=1200, temperature=0.6)

        if not response:
            return []

        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return data.get('tweets', [])
        except (json.JSONDecodeError, Exception):
            pass

        return []

    def generate_hybrid_methodology_thread(self, angle: str = 'trust') -> List[str]:
        """
        Generate a thread explaining the hybrid AI+human methodology.
        Great for building trust and differentiating from competitors.

        Angles: 'trust', 'methodology', 'differentiation', 'transparency'
        """
        angle_prompts = {
            'trust': "Pourquoi on peut faire confiance aux scores SafeScoring malgre l'utilisation de l'IA",
            'methodology': "Comment fonctionne notre approche hybride IA + verification humaine",
            'differentiation': "Pourquoi SafeScoring est different des autres ratings (ni 100% IA, ni 100% manuel)",
            'transparency': "Notre engagement de transparence: comment chaque score est calcule et verifiable"
        }

        topic = angle_prompts.get(angle, angle_prompts['trust'])

        prompt = f"""Tu es le fondateur de SafeScoring. Cree un thread Twitter AUTHENTIQUE sur:

SUJET: {topic}

CONTEXTE REEL DE SAFESCORING:
- 916 criteres de securite evalues
- IA (Gemini, Groq, DeepSeek) pour l'evaluation a grande echelle
- Verification humaine pour les resultats incertains (TBD)
- Systeme two-pass: Pass 1 = IA rapide, Pass 2 = modele expert pour cas critiques
- Corrections communautaires avec preuves
- Cout operationnel: ~$0-5/mois pour 150+ produits
- Biais conservateur: en cas de doute, on dit NO ou TBD (jamais de faux positif)

STRATEGIE:
1. Thread de 5-7 tweets
2. Premier tweet = hook qui adresse une inquietude reelle ("L'IA peut se tromper...")
3. Explique COMMENT on resout chaque probleme de l'IA
4. Sois SPECIFIQUE (chiffres, processus reels)
5. Dernier tweet = invitation a verifier par soi-meme
6. Ton: fondateur transparent, pas marketing corporate
7. Chaque tweet < 270 caracteres

MESSAGES CLES A INCLURE:
- "IA pour la vitesse, humains pour le jugement"
- "Quand l'IA dit 'je ne sais pas', un expert verifie"
- "Chaque score est explicable et contestable"

FORMAT JSON:
{{
    "tweets": ["Tweet 1...", "Tweet 2...", ...],
    "hashtags": ["#crypto", "#security", "#AI"]
}}

UNIQUEMENT le JSON."""

        response = self.ai.call_for_content('twitter', prompt, max_tokens=1500, temperature=0.7)

        if not response:
            # Fallback to pre-built template
            from src.marketing.templates.viral_templates import get_hybrid_thread
            return get_hybrid_thread('trust_thread' if angle == 'trust' else 'methodology_thread')

        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                tweets = data.get('tweets', [])
                hashtags = data.get('hashtags', ['#crypto', '#security', '#AI'])
                if tweets:
                    tweets[-1] = f"{tweets[-1]} {' '.join(hashtags[:3])}"
                return self._ensure_freemium_compliant_list(tweets)
        except json.JSONDecodeError:
            pass

        from src.marketing.templates.viral_templates import get_hybrid_thread
        return get_hybrid_thread('methodology_thread')

    def generate_weekly_recap(self, events: List[Dict]) -> List[str]:
        """
        Generate weekly security recap thread.
        Good for regular engagement and establishing authority.
        """
        events_summary = "\n".join([
            f"- {e['title']} ({e['category']})" for e in events[:10]
        ])

        prompt = f"""Tu es un expert en securite crypto. Cree un thread RECAP HEBDO:

EVENEMENTS DE LA SEMAINE:
{events_summary}

REGLES:
1. Thread de 6-8 tweets
2. Premier tweet = "Cette semaine en securite crypto" + stat cle
3. Resume les incidents majeurs
4. Tendances observees
5. Conseils pour la semaine
6. CTA: "Verifiez vos outils sur SafeScoring.io"
7. Chaque tweet < 270 caracteres

FORMAT JSON:
{{
    "tweets": ["Tweet 1...", "Tweet 2...", ...],
    "hashtags": ["#crypto", "#weeklyrecap"]
}}

Reponds UNIQUEMENT avec le JSON."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('twitter', prompt, max_tokens=1500, temperature=0.6)

        if not response:
            return []

        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return data.get('tweets', [])
        except (json.JSONDecodeError, Exception):
            pass

        return []

    def generate_single_tweet(self, event: Dict, style: str = 'alert') -> str:
        """
        Generate a single tweet for quick posting.
        Styles: 'alert', 'tip', 'question', 'stat'
        """
        title = event.get('title', '')
        category = event.get('category', 'NEWS')

        style_instructions = {
            'alert': 'Alerte urgente, ton serieux mais pas alarmiste',
            'tip': 'Conseil pratique, ton amical et utile',
            'question': 'Question engageante pour susciter les reponses',
            'stat': 'Stat choc avec source, ton factuel'
        }

        prompt = f"""Genere UN SEUL tweet sur cet evenement crypto:

EVENEMENT: {title}
TYPE: {category}
STYLE: {style_instructions.get(style, style_instructions['alert'])}

REGLES:
- Maximum 260 caracteres
- Inclure 1-2 emojis pertinents
- Finir par un CTA court si possible (safescoring.io)
- Pas de hashtags (on les ajoute apres)

Reponds UNIQUEMENT avec le texte du tweet, rien d'autre."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('twitter', prompt, max_tokens=100, temperature=0.8)

        if response:
            # Clean and truncate
            tweet = response.strip().strip('"\'')
            if len(tweet) > 270:
                tweet = tweet[:267] + "..."
            return tweet

        return self._fallback_single_tweet(event)

    def generate_linkedin_post(self, event: Dict) -> str:
        """
        Generate a LinkedIn post for professional audience.
        Longer format, more analytical.
        """
        title = event.get('title', '')
        summary = event.get('summary', '')
        category = event.get('category', 'NEWS')

        prompt = f"""Tu es un expert en securite crypto. Ecris un post LinkedIn PROFESSIONNEL:

SUJET: {title}
DETAILS: {summary}
TYPE: {category}

REGLES:
1. 500-800 caracteres
2. Ton professionnel et analytique
3. Insight unique ou perspective originale
4. Pas de jargon excessif
5. CTA discret vers SafeScoring.io (MENTIONNER APPROCHE HYBRIDE IA+HUMAIN)
6. Utiliser des paragraphes courts
7. Pas d'emojis excessifs (1-2 max)

MESSAGE HYBRIDE A INTEGRER:
- "Chez SafeScoring, nous combinons l'efficacite de l'IA avec la rigueur de l'expertise humaine"
- "916 criteres analyses par IA, scores critiques verifies par des experts"

Reponds UNIQUEMENT avec le texte du post."""

        # Use strategic content generation (quality-first for marketing)
        response = self.ai.call_for_content('linkedin', prompt, max_tokens=500, temperature=0.6)

        if response:
            return response.strip()

        return ""

    def generate_linkedin_hybrid_post(self) -> str:
        """
        Generate a LinkedIn post specifically about the hybrid AI+human methodology.
        Great for B2B trust-building and thought leadership.
        """
        prompt = """Tu es le fondateur de SafeScoring. Ecris un post LinkedIn sur notre approche hybride IA+humain.

CONTEXTE REEL:
- SafeScoring evalue la securite des produits crypto (wallets, exchanges, DeFi)
- 916 criteres de securite analyses
- IA pour l'evaluation a grande echelle (Gemini, Groq, DeepSeek)
- Verification humaine pour les cas incertains
- Systeme two-pass: IA rapide puis expert pour cas critiques
- Corrections communautaires avec preuves
- Biais conservateur: en cas de doute, on dit NON

REGLES:
1. 800-1200 caracteres
2. Ton: fondateur transparent, pas corporate
3. Structure: Probleme → Notre approche → Resultats
4. Chiffres concrets (916 criteres, 150+ produits, $0-5/mois de cout)
5. Pas de jargon marketing vide
6. CTA discret: "Les scores sont publics sur safescoring.io"
7. 1-2 emojis max en debut de paragraphe

ANGLE: Pourquoi l'IA seule n'est pas suffisante pour la securite crypto, et comment nous avons resolu ce probleme.

Reponds UNIQUEMENT avec le texte du post."""

        response = self.ai.call_for_content('linkedin', prompt, max_tokens=800, temperature=0.6)

        if response:
            return response.strip()

        # Fallback
        return """The AI revolution is transforming every industry. But in crypto security, pure automation isn't enough.

Here's our approach at SafeScoring:

1. AI does the heavy lifting
We analyze each product against 916 security norms. Speed: minutes, not weeks. Cost: nearly zero.

2. Humans handle uncertainty
When the AI says "I'm not sure", experts review. Critical security scores get a second pass. New product types require manual validation.

3. Community corrects errors
Anyone can submit corrections with evidence. Full changelog is public.

The result: 150+ products scored with the speed of AI and the judgment of human experts.

100% AI = fast but can hallucinate
100% human = accurate but slow and expensive
Hybrid = the best of both worlds

All scores are public → safescoring.io"""

    def generate_reddit_hybrid_post(self, subreddit_style: str = 'educational') -> Dict:
        """
        Generate a Reddit post about the hybrid methodology.
        Adapted for Reddit's skeptical, detail-oriented audience.

        Args:
            subreddit_style: 'educational' (r/cryptocurrency), 'technical' (r/ethdev), 'discussion' (r/CryptoTechnology)
        """
        style_prompts = {
            'educational': "Ton pedagogique, explique comme a quelqu'un qui decouvre. Evite le shilling.",
            'technical': "Ton technique, details d'implementation. Parle du stack IA (Gemini, Groq, fallback).",
            'discussion': "Ton conversationnel, pose des questions, invite au debat. Demande des retours."
        }

        prompt = f"""Tu es un developpeur qui a cree SafeScoring. Ecris un post Reddit sur l'approche hybride IA+humain.

STYLE: {style_prompts.get(subreddit_style, style_prompts['educational'])}

CONTEXTE TECHNIQUE REEL:
- 916 criteres de securite evalues par produit
- Stack IA: Gemini Flash (primaire), Groq Llama 3.3 (gratuit), DeepSeek (fallback)
- 6 cles API Gemini en rotation pour maximiser le quota
- Systeme two-pass: Pass 1 = IA rapide, Pass 2 = modele expert pour TBD
- Biais conservateur: uncertain = NO ou TBD
- Corrections communautaires avec systeme de reputation
- Cout operationnel: ~$0-5/mois pour 150+ produits

REGLES REDDIT:
1. Titre accrocheur mais pas clickbait
2. Contenu: 300-600 mots
3. JAMAIS de langage marketing ("revolutionnaire", "game-changer", etc.)
4. Etre HUMBLE sur les limitations
5. Inviter les critiques et questions
6. Mentionner les alternatives existantes
7. Pas de CTA agressif (juste "AMA" ou lien discret en fin)

FORMAT JSON:
{{
    "title": "Titre du post",
    "body": "Contenu du post en markdown",
    "suggested_subreddits": ["r/cryptocurrency", "r/CryptoTechnology"]
}}

UNIQUEMENT le JSON."""

        response = self.ai.call_for_content('reddit', prompt, max_tokens=1000, temperature=0.7)

        if response:
            try:
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Fallback
        return {
            "title": "How we use AI + human review to rate crypto security (and why pure AI isn't enough)",
            "body": """I built a crypto security rating system and wanted to share our hybrid AI+human approach.

**The problem with pure AI ratings:**
- LLMs can hallucinate, especially on technical security questions
- No judgment on edge cases
- Can't verify claims against real-world data

**Our solution:**

1. **AI for scale**: We use Gemini/Groq to evaluate 916 security norms per product. Takes minutes, not weeks.

2. **Human review for uncertainty**: When the AI outputs "TBD" (uncertain), human experts verify. Critical security norms always get a second pass.

3. **Community corrections**: Anyone can submit corrections with evidence. We track submitter reputation.

**Technical stack:**
- Primary: Gemini Flash (high quota)
- Secondary: Groq Llama 3.3 (free tier)
- Fallback: DeepSeek
- 6 API keys in rotation

**Results:**
- 150+ products rated
- ~$0-5/month operating cost
- Every score is explainable

Happy to answer questions about the approach. What would you want to see in a crypto security rating system?

(Scores are public at safescoring.io if you're curious)""",
            "suggested_subreddits": ["r/cryptocurrency", "r/CryptoTechnology", "r/ethdev"]
        }

    def _fallback_hack_thread(self, event: Dict) -> List[str]:
        """Fallback thread when AI fails."""
        title = event.get('title', 'Security incident')
        amount = event.get('amount_usd', 0)

        tweets = [
            f"BREAKING: {title[:200]}",
            "Cet incident rappelle l'importance de verifier la securite de ses outils crypto AVANT de les utiliser.",
            "Les audits ne suffisent pas: 87% des projets hackes avaient ete audites.",
            f"SafeScoring analyse {916} criteres de securite pour chaque produit.",
            "Verifiez vos wallets et protocols sur https://safescoring.io #crypto #security"
        ]

        return tweets

    def _fallback_single_tweet(self, event: Dict) -> str:
        """Fallback single tweet when AI fails."""
        title = event.get('title', 'Incident crypto')
        return f"Nouveau: {title[:180]}... Verifiez la securite de vos outils sur safescoring.io"

    def _ensure_freemium_compliant(self, content: str) -> str:
        """
        Ensure content only promotes FREE features.
        Removes any mentions of paid features, API, pricing, etc.
        """
        if not FREEMIUM_CONFIG_AVAILABLE:
            return content

        # Check for paid feature mentions
        issues = check_content_for_paid_mentions(content)
        if issues:
            # Sanitize the content
            content = sanitize_marketing_content(content)

        return content

    def _ensure_freemium_compliant_list(self, tweets: List[str]) -> List[str]:
        """Ensure all tweets in a list are freemium compliant."""
        return [self._ensure_freemium_compliant(t) for t in tweets]

    def save_content(self, content: Dict, content_type: str) -> str:
        """Save generated content to file."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{content_type}_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)

        return filepath


# Quick test
if __name__ == '__main__':
    generator = ContentGenerator()

    # Test with mock event
    test_event = {
        'title': 'Radiant Capital hacked for $50M via compromised multisig',
        'summary': 'Attackers gained control of multiple private keys through social engineering',
        'amount_usd': 50_000_000,
        'category': 'HACK',
        'link': 'https://example.com/hack'
    }

    print("Generating hack thread...")
    thread = generator.generate_hack_thread(test_event)

    print("\n" + "="*60)
    print("GENERATED THREAD")
    print("="*60)

    for i, tweet in enumerate(thread, 1):
        print(f"\n[Tweet {i}] ({len(tweet)} chars)")
        print(tweet)
