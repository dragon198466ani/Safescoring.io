#!/usr/bin/env python3
"""
SafeScoring Discord Bot
Provides security scores and alerts in Discord servers.

Features:
- /score <product> - Get security score
- /compare <a> <b> - Compare two products
- /alert - Subscribe to security alerts
- Auto-post incident alerts
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    import discord
    from discord import app_commands
    from discord.ext import commands, tasks
    DISCORD_AVAILABLE = True
except ImportError:
    DISCORD_AVAILABLE = False

from supabase import create_client


class SafeScoringBot:
    """Discord bot for SafeScoring"""

    def __init__(self):
        if not DISCORD_AVAILABLE:
            print("⚠️ discord.py not installed: pip install discord.py")
            return

        intents = discord.Intents.default()
        intents.message_content = True

        self.bot = commands.Bot(command_prefix='!', intents=intents)
        self.supabase = None

        if os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_KEY'):
            self.supabase = create_client(
                os.getenv('SUPABASE_URL'),
                os.getenv('SUPABASE_KEY')
            )

        self.alert_channels = set()  # Channels subscribed to alerts
        self._setup_commands()

    def _setup_commands(self):
        """Setup bot commands"""

        @self.bot.event
        async def on_ready():
            print(f'✅ Discord bot connected as {self.bot.user}')
            try:
                synced = await self.bot.tree.sync()
                print(f'Synced {len(synced)} commands')
            except Exception as e:
                print(f'Sync error: {e}')

            # Start background tasks
            self.check_incidents.start()

        @self.bot.tree.command(name='score', description='Get security score for a crypto product')
        async def score_command(interaction: discord.Interaction, product: str):
            await interaction.response.defer()

            score_data = await self._get_product_score(product)

            if score_data:
                embed = self._create_score_embed(score_data)
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(
                    f"❌ Product '{product}' not found. Try a different name or check safescoring.io/products"
                )

        @self.bot.tree.command(name='compare', description='Compare security of two products')
        async def compare_command(interaction: discord.Interaction, product_a: str, product_b: str):
            await interaction.response.defer()

            score_a = await self._get_product_score(product_a)
            score_b = await self._get_product_score(product_b)

            if score_a and score_b:
                embed = self._create_comparison_embed(score_a, score_b)
                await interaction.followup.send(embed=embed)
            else:
                missing = []
                if not score_a:
                    missing.append(product_a)
                if not score_b:
                    missing.append(product_b)
                await interaction.followup.send(f"❌ Product(s) not found: {', '.join(missing)}")

        @self.bot.tree.command(name='top', description='Show top-rated products in a category')
        async def top_command(interaction: discord.Interaction, category: str = 'all'):
            await interaction.response.defer()

            top_products = await self._get_top_products(category, limit=5)

            if top_products:
                embed = self._create_leaderboard_embed(top_products, category)
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(f"No products found for category: {category}")

        @self.bot.tree.command(name='alerts', description='Subscribe this channel to security alerts')
        async def alerts_command(interaction: discord.Interaction, action: str = 'on'):
            if action.lower() == 'on':
                self.alert_channels.add(interaction.channel_id)
                await interaction.response.send_message(
                    "✅ This channel is now subscribed to security alerts!"
                )
            else:
                self.alert_channels.discard(interaction.channel_id)
                await interaction.response.send_message(
                    "🔕 This channel is unsubscribed from security alerts."
                )

        @self.bot.tree.command(name='help', description='Show SafeScoring bot help')
        async def help_command(interaction: discord.Interaction):
            embed = discord.Embed(
                title="🔒 SafeScoring Bot",
                description="Get crypto security ratings right in Discord!",
                color=0x00d4aa
            )
            embed.add_field(
                name="Commands",
                value="""
`/score <product>` - Get security score
`/compare <a> <b>` - Compare two products
`/top [category]` - Top-rated products
`/alerts on/off` - Security alerts
                """,
                inline=False
            )
            embed.add_field(
                name="Categories",
                value="hardware-wallets, exchanges, defi, mobile-wallets",
                inline=False
            )
            embed.set_footer(text="safescoring.io | 916 security norms")
            await interaction.response.send_message(embed=embed)

        @tasks.loop(minutes=30)
        async def check_incidents():
            """Check for new security incidents"""
            # In production, check database for new incidents
            pass

        self.check_incidents = check_incidents

    async def _get_product_score(self, product_name: str) -> dict:
        """Fetch product score from database"""
        if not self.supabase:
            return None

        try:
            # Search by name (fuzzy)
            slug = product_name.lower().replace(' ', '-')

            result = self.supabase.table('products')\
                .select('id, name, slug, type_id')\
                .or_(f'slug.ilike.%{slug}%,name.ilike.%{product_name}%')\
                .limit(1)\
                .execute()

            if not result.data:
                return None

            product = result.data[0]

            # Get type name
            type_name = 'Crypto Product'
            if product.get('type_id'):
                type_result = self.supabase.table('product_types')\
                    .select('name')\
                    .eq('id', product['type_id'])\
                    .limit(1)\
                    .execute()
                if type_result.data:
                    type_name = type_result.data[0]['name']

            # Get score
            score_result = self.supabase.table('safe_scoring_results')\
                .select('note_finale, score_s, score_a, score_f, score_e')\
                .eq('product_id', product['id'])\
                .order('calculated_at', desc=True)\
                .limit(1)\
                .execute()

            if not score_result.data:
                return None

            score = score_result.data[0]

            return {
                'name': product['name'],
                'slug': product['slug'],
                'type': type_name,
                'score': round(score['note_finale'] or 0),
                's': round(score['score_s'] or 0),
                'a': round(score['score_a'] or 0),
                'f': round(score['score_f'] or 0),
                'e': round(score['score_e'] or 0),
            }

        except Exception as e:
            print(f"Error fetching score: {e}")
            return None

    async def _get_top_products(self, category: str, limit: int = 5) -> list:
        """Get top-rated products"""
        if not self.supabase:
            return []

        try:
            # This is simplified - in production, use proper joins
            result = self.supabase.table('safe_scoring_results')\
                .select('product_id, note_finale')\
                .order('note_finale', desc=True)\
                .limit(limit * 2)\
                .execute()

            if not result.data:
                return []

            products = []
            for score in result.data:
                if len(products) >= limit:
                    break

                prod_result = self.supabase.table('products')\
                    .select('name, slug')\
                    .eq('id', score['product_id'])\
                    .limit(1)\
                    .execute()

                if prod_result.data:
                    products.append({
                        'name': prod_result.data[0]['name'],
                        'slug': prod_result.data[0]['slug'],
                        'score': round(score['note_finale'] or 0)
                    })

            return products

        except Exception as e:
            print(f"Error fetching top products: {e}")
            return []

    def _create_score_embed(self, data: dict) -> discord.Embed:
        """Create embed for score display"""
        score = data['score']
        color = 0x22c55e if score >= 80 else 0xf59e0b if score >= 60 else 0xef4444

        embed = discord.Embed(
            title=f"🔒 {data['name']}",
            description=f"**{data['type']}**",
            color=color,
            url=f"https://safescoring.io/products/{data['slug']}"
        )

        embed.add_field(
            name="SafeScore",
            value=f"**{score}/100**",
            inline=True
        )

        embed.add_field(
            name="SAFE Breakdown",
            value=f"🛡️ Security: {data['s']}\n🔍 Audit: {data['a']}\n⚙️ Function: {data['f']}\n✨ Experience: {data['e']}",
            inline=True
        )

        embed.set_footer(text="SafeScoring | 916 security norms")
        return embed

    def _create_comparison_embed(self, a: dict, b: dict) -> discord.Embed:
        """Create embed for comparison"""
        winner = a if a['score'] > b['score'] else b
        color = 0x00d4aa

        embed = discord.Embed(
            title=f"⚔️ {a['name']} vs {b['name']}",
            description=f"Security comparison",
            color=color,
            url=f"https://safescoring.io/compare/{a['slug']}/{b['slug']}"
        )

        embed.add_field(
            name=a['name'],
            value=f"**{a['score']}/100**\nS:{a['s']} A:{a['a']} F:{a['f']} E:{a['e']}",
            inline=True
        )

        embed.add_field(
            name="VS",
            value="⚡",
            inline=True
        )

        embed.add_field(
            name=b['name'],
            value=f"**{b['score']}/100**\nS:{b['s']} A:{b['a']} F:{b['f']} E:{b['e']}",
            inline=True
        )

        embed.add_field(
            name="🏆 Winner",
            value=f"**{winner['name']}** (+{abs(a['score'] - b['score'])} points)",
            inline=False
        )

        embed.set_footer(text="SafeScoring | Full comparison at link above")
        return embed

    def _create_leaderboard_embed(self, products: list, category: str) -> discord.Embed:
        """Create embed for leaderboard"""
        embed = discord.Embed(
            title=f"🏆 Top {category.title()} by Security",
            color=0x00d4aa,
            url="https://safescoring.io/leaderboard"
        )

        leaderboard = ""
        medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

        for i, product in enumerate(products):
            medal = medals[i] if i < len(medals) else f"{i+1}."
            leaderboard += f"{medal} **{product['name']}** - {product['score']}/100\n"

        embed.description = leaderboard
        embed.set_footer(text="SafeScoring | safescoring.io/leaderboard")
        return embed

    async def send_alert(self, incident: dict):
        """Send security alert to subscribed channels"""
        embed = discord.Embed(
            title=f"🚨 Security Alert: {incident.get('title', 'New Incident')}",
            description=incident.get('summary', ''),
            color=0xef4444,
            url=incident.get('url', 'https://safescoring.io')
        )

        for channel_id in self.alert_channels:
            try:
                channel = self.bot.get_channel(channel_id)
                if channel:
                    await channel.send(embed=embed)
            except Exception as e:
                print(f"Error sending alert to channel {channel_id}: {e}")

    def run(self):
        """Run the bot"""
        token = os.getenv('DISCORD_BOT_TOKEN')
        if not token:
            print("❌ DISCORD_BOT_TOKEN not set")
            return

        self.bot.run(token)


def main():
    bot = SafeScoringBot()
    bot.run()


if __name__ == '__main__':
    main()
