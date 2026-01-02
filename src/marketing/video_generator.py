#!/usr/bin/env python3
"""
Video Script & Content Generator
Auto-generates scripts for YouTube Shorts, TikTok, and full YouTube videos.

Features:
- Security alert videos (breaking news style)
- Product comparison videos
- Educational content
- Weekly roundup videos
"""

import asyncio
import os
import json
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.core.api_provider import AIProvider


class VideoGenerator:
    """Generate video scripts and content"""

    def __init__(self):
        self.ai = AIProvider()
        self.output_dir = Path('content/videos')
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def generate_short_script(self, topic: str, style: str = 'alert') -> dict:
        """Generate script for YouTube Shorts / TikTok (< 60 seconds)"""

        if style == 'alert':
            prompt = f"""
Generate a 30-second TikTok/YouTube Shorts script about this crypto security topic:
{topic}

Format:
HOOK (3 sec): Attention-grabbing opening
PROBLEM (10 sec): What's the issue
SOLUTION (10 sec): How to protect yourself
CTA (5 sec): Call to action

Style: Fast-paced, urgent, informative
Include: On-screen text suggestions, emoji reactions

Script:
            """
        elif style == 'comparison':
            prompt = f"""
Generate a 45-second comparison video script:
{topic}

Format:
INTRO (5 sec): "Which is safer?"
PRODUCT A (15 sec): Key security points
PRODUCT B (15 sec): Key security points
WINNER (10 sec): Verdict with score

Style: Fair, data-driven, visual
Include: Split-screen suggestions, score graphics

Script:
            """
        else:  # educational
            prompt = f"""
Generate a 60-second educational video script:
{topic}

Format:
HOOK (5 sec): Why this matters
WHAT (15 sec): Explain the concept
HOW (20 sec): How it works
TIPS (15 sec): Actionable advice
CTA (5 sec): Where to learn more

Style: Clear, helpful, engaging
Include: Visual suggestions, examples

Script:
            """

        try:
            script = await self.ai.generate(prompt, max_tokens=500)

            return {
                'type': 'short',
                'style': style,
                'topic': topic,
                'script': script,
                'duration': '30-60 seconds',
                'platforms': ['TikTok', 'YouTube Shorts', 'Instagram Reels'],
                'generated_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Script generation error: {e}")
            return None

    async def generate_youtube_script(self, topic: str, duration_minutes: int = 5) -> dict:
        """Generate full YouTube video script"""

        prompt = f"""
Generate a {duration_minutes}-minute YouTube video script about:
{topic}

Format as sections with timestamps:

[0:00-0:30] HOOK
Attention-grabbing intro that previews value

[0:30-1:00] INTRO
Channel intro + what we'll cover

[1:00-{duration_minutes-1}:00] MAIN CONTENT
- Key point 1 with examples
- Key point 2 with visuals
- Key point 3 with data

[{duration_minutes-1}:00-{duration_minutes}:00] CONCLUSION
Summary + CTA + subscribe reminder

Include:
- B-roll suggestions
- Screen recording notes
- Graphics/charts to show
- Engagement questions

Full script:
        """

        try:
            script = await self.ai.generate(prompt, max_tokens=2000)

            # Generate title options
            title_prompt = f"Generate 5 YouTube title options for a video about: {topic}\nMake them click-worthy but not clickbait. Include numbers and power words."
            titles = await self.ai.generate(title_prompt, max_tokens=200)

            # Generate description
            desc_prompt = f"""
Generate a YouTube description for a video about: {topic}

Include:
- Hook paragraph
- Timestamps (make up based on content)
- Links section (SafeScoring links)
- Hashtags
- Subscribe CTA
            """
            description = await self.ai.generate(desc_prompt, max_tokens=400)

            return {
                'type': 'youtube',
                'topic': topic,
                'duration': f'{duration_minutes} minutes',
                'script': script,
                'title_options': titles,
                'description': description,
                'tags': ['crypto security', 'cryptocurrency', 'wallet security', 'DeFi', 'SafeScoring'],
                'generated_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"YouTube script error: {e}")
            return None

    async def generate_incident_video(self, incident: dict) -> dict:
        """Generate breaking news style video about security incident"""

        prompt = f"""
Generate a BREAKING NEWS style video script about this crypto security incident:

Title: {incident.get('title', 'Security Incident')}
Details: {incident.get('details', '')}
Impact: {incident.get('impact', 'Unknown')}

Format (2-3 minutes):
[BREAKING] Opening graphic + urgent tone
[WHAT HAPPENED] Explain the incident
[WHO'S AFFECTED] List affected users/protocols
[WHAT TO DO] Immediate action steps
[SAFESCORING] How to check if your products are affected
[OUTRO] Stay safe message + subscribe

Style: News anchor energy, urgent but calm, helpful
Include: Lower thirds text, warning graphics, on-screen alerts

Script:
        """

        try:
            script = await self.ai.generate(prompt, max_tokens=1000)

            return {
                'type': 'incident_video',
                'incident': incident,
                'script': script,
                'urgency': 'high',
                'platforms': ['YouTube', 'Twitter Video'],
                'thumbnail_idea': f"🚨 {incident.get('title', 'SECURITY ALERT')}",
                'generated_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Incident video error: {e}")
            return None

    async def generate_weekly_video(self, stats: dict) -> dict:
        """Generate weekly roundup video script"""

        prompt = f"""
Generate a weekly crypto security roundup video script (5 minutes):

Stats this week:
- New products rated: {stats.get('new_products', 0)}
- Score changes: {stats.get('score_changes', 0)}
- Incidents: {stats.get('incidents', 0)}

Format:
[0:00] Energetic intro + this week's highlights
[0:30] TOP MOVERS: Products with biggest score changes
[1:30] NEW RATINGS: Notable new products added
[2:30] SECURITY NEWS: Any incidents or alerts
[3:30] VIEWER QUESTIONS: Answer community questions
[4:30] NEXT WEEK PREVIEW + CTA

Style: Upbeat, informative, community-focused
Include: Leaderboard graphics, comparison visuals

Script:
        """

        try:
            script = await self.ai.generate(prompt, max_tokens=1500)

            return {
                'type': 'weekly_roundup',
                'week': datetime.now().strftime('%Y-W%W'),
                'stats': stats,
                'script': script,
                'duration': '5 minutes',
                'generated_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Weekly video error: {e}")
            return None

    async def generate_batch(self) -> list:
        """Generate a batch of video content"""
        videos = []

        # Generate a mix of content types
        topics = [
            ('Is Your Crypto Wallet Actually Safe? Here\'s How to Check', 'educational'),
            ('🚨 3 DeFi Red Flags You MUST Know', 'alert'),
            ('Ledger vs Trezor Security Comparison', 'comparison'),
        ]

        for topic, style in topics:
            video = await self.generate_short_script(topic, style)
            if video:
                videos.append(video)
                self._save_video(video)
            await asyncio.sleep(1)

        return videos

    def _save_video(self, video: dict):
        """Save video script to file"""
        video_type = video.get('type', 'unknown')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{video_type}_{timestamp}.json"

        with open(self.output_dir / filename, 'w') as f:
            json.dump(video, f, indent=2)

        print(f"📹 Saved: {filename}")

    async def run_daily_generation(self):
        """Generate daily video content"""
        print("🎬 Generating daily video content...")

        # 1. Generate 3 short-form scripts
        videos = await self.generate_batch()

        # 2. Generate 1 full YouTube script
        youtube = await self.generate_youtube_script(
            "Top 5 Safest Crypto Wallets in 2025 - Security Analysis"
        )
        if youtube:
            self._save_video(youtube)
            videos.append(youtube)

        print(f"✅ Generated {len(videos)} video scripts")
        return videos


async def main():
    generator = VideoGenerator()
    await generator.run_daily_generation()


if __name__ == '__main__':
    asyncio.run(main())
