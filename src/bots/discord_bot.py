"""
SafeScoring Discord Bot
Real-time security scores and alerts for Discord servers.

Commands:
- /score <product> - Get SafeScore for a product
- /top [category] - Top rated products
- /compare <product1> <product2> - Compare two products
- /incidents - Recent security incidents
- /alerts - Set up alerts for a channel
- /help - Show all commands

Setup:
1. Create app at https://discord.com/developers/applications
2. Add bot to your app, get token
3. Set DISCORD_BOT_TOKEN in .env
4. Enable MESSAGE CONTENT INTENT in bot settings
5. Invite bot with: https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
6. Run: python discord_bot.py

Dependencies:
pip install discord.py requests python-dotenv
"""

import os
import sys
import logging
import requests
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    import discord
    from discord import app_commands
    from discord.ext import commands, tasks
except ImportError:
    print("Please install discord.py: pip install discord.py")
    sys.exit(1)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'))
except ImportError:
    pass

# Configuration
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://safescoring.io")

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


def get_score_emoji(score: int) -> str:
    """Get emoji based on score."""
    if score >= 80:
        return "🟢"
    elif score >= 60:
        return "🟡"
    elif score >= 40:
        return "🟠"
    return "🔴"


def get_score_color(score: int) -> int:
    """Get Discord embed color based on score."""
    if score >= 80:
        return 0x22c55e  # Green
    elif score >= 60:
        return 0xeab308  # Yellow
    elif score >= 40:
        return 0xf97316  # Orange
    return 0xef4444  # Red


class SafeScoringBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        # Sync slash commands
        await self.tree.sync()
        logger.info("Slash commands synced")

        # Start background tasks
        self.check_alerts.start()

    async def on_ready(self):
        logger.info(f"Bot is ready! Logged in as {self.user}")
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="crypto security | /score"
            )
        )

    @tasks.loop(minutes=30)
    async def check_alerts(self):
        """Check for score changes and new incidents to alert."""
        # This would query your database for channel subscriptions
        # and send alerts when scores change or new incidents occur
        pass


bot = SafeScoringBot()


@bot.tree.command(name="score", description="Get SafeScore for a crypto product")
@app_commands.describe(product="The product name to look up (e.g., ledger, uniswap)")
async def score(interaction: discord.Interaction, product: str):
    """Get SafeScore for a product."""
    await interaction.response.defer()

    try:
        # Search for product
        response = requests.get(
            f"{API_BASE_URL}/api/search",
            params={"q": product.lower().strip(), "limit": 1},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])

            if results:
                slug = results[0].get("slug")

                # Get full score data
                score_response = requests.get(
                    f"{API_BASE_URL}/api/products/{slug}/score",
                    timeout=10
                )

                if score_response.status_code == 200:
                    product_data = score_response.json()
                    score_val = product_data.get("score", 0)
                    scores = product_data.get("scores", {})

                    embed = discord.Embed(
                        title=f"{get_score_emoji(score_val)} {product_data.get('name', 'Unknown')}",
                        description=f"**SafeScore: {score_val}/100**",
                        color=get_score_color(score_val),
                        url=f"{API_BASE_URL}/products/{slug}"
                    )

                    embed.add_field(
                        name="📊 SAFE Breakdown",
                        value=(
                            f"🔒 Security: **{scores.get('s', 'N/A')}**/100\n"
                            f"🛡️ Adversity: **{scores.get('a', 'N/A')}**/100\n"
                            f"🤝 Fidelity: **{scores.get('f', 'N/A')}**/100\n"
                            f"⚡ Efficiency: **{scores.get('e', 'N/A')}**/100"
                        ),
                        inline=False
                    )

                    embed.add_field(
                        name="Type",
                        value=product_data.get("type", "N/A"),
                        inline=True
                    )

                    embed.set_footer(text="SafeScoring.io • Crypto Security Ratings")
                    embed.timestamp = datetime.now()

                    if product_data.get("logo"):
                        embed.set_thumbnail(url=product_data.get("logo"))

                    # Create buttons
                    view = discord.ui.View()
                    view.add_item(discord.ui.Button(
                        label="Full Report",
                        url=f"{API_BASE_URL}/products/{slug}",
                        style=discord.ButtonStyle.link
                    ))
                    view.add_item(discord.ui.Button(
                        label="Compare",
                        url=f"{API_BASE_URL}/compare?product={slug}",
                        style=discord.ButtonStyle.link
                    ))

                    await interaction.followup.send(embed=embed, view=view)
                    return

            await interaction.followup.send(
                f"❌ No product found for **{product}**\nTry a different search term.",
                ephemeral=True
            )
        else:
            await interaction.followup.send("❌ Error fetching data. Please try again.", ephemeral=True)

    except Exception as e:
        logger.error(f"Score command error: {e}")
        await interaction.followup.send("❌ Error fetching score. Please try again later.", ephemeral=True)


@bot.tree.command(name="top", description="Get top rated crypto products")
@app_commands.describe(category="Optional category filter (e.g., hardware-wallet, dex, lending)")
async def top(interaction: discord.Interaction, category: str = None):
    """Get top rated products."""
    await interaction.response.defer()

    try:
        params = {"limit": 10}
        if category:
            params["category"] = category

        response = requests.get(
            f"{API_BASE_URL}/api/leaderboard",
            params=params,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            products = data.get("products", data.get("data", []))[:10]

            if not products:
                await interaction.followup.send("No products found.", ephemeral=True)
                return

            embed = discord.Embed(
                title="🏆 Top SafeScores",
                description=f"Top 10 {category or 'crypto'} products by security rating",
                color=0x6366f1
            )

            leaderboard = ""
            medals = ["🥇", "🥈", "🥉"]

            for i, p in enumerate(products, 1):
                score = p.get("score", p.get("note_finale", 0))
                if isinstance(score, float):
                    score = round(score)
                emoji = get_score_emoji(score)
                medal = medals[i-1] if i <= 3 else f"{i}."
                name = p.get("name", "Unknown")
                leaderboard += f"{medal} {emoji} **{name}** — {score}/100\n"

            embed.add_field(name="Rankings", value=leaderboard, inline=False)
            embed.set_footer(text="SafeScoring.io • Updated in real-time")
            embed.timestamp = datetime.now()

            view = discord.ui.View()
            view.add_item(discord.ui.Button(
                label="Full Leaderboard",
                url=f"{API_BASE_URL}/leaderboard",
                style=discord.ButtonStyle.link
            ))

            await interaction.followup.send(embed=embed, view=view)
        else:
            await interaction.followup.send("❌ Error fetching leaderboard.", ephemeral=True)

    except Exception as e:
        logger.error(f"Top command error: {e}")
        await interaction.followup.send("❌ Error fetching data.", ephemeral=True)


@bot.tree.command(name="compare", description="Compare two crypto products")
@app_commands.describe(
    product1="First product to compare",
    product2="Second product to compare"
)
async def compare(interaction: discord.Interaction, product1: str, product2: str):
    """Compare two products."""
    await interaction.response.defer()

    try:
        products = []

        for query in [product1.lower(), product2.lower()]:
            search = requests.get(
                f"{API_BASE_URL}/api/search",
                params={"q": query, "limit": 1},
                timeout=10
            )

            if search.status_code == 200:
                results = search.json().get("results", [])
                if results:
                    slug = results[0].get("slug")
                    score_resp = requests.get(
                        f"{API_BASE_URL}/api/products/{slug}/score",
                        timeout=10
                    )
                    if score_resp.status_code == 200:
                        products.append(score_resp.json())

        if len(products) < 2:
            await interaction.followup.send(
                "❌ Could not find both products. Check the names.",
                ephemeral=True
            )
            return

        p1, p2 = products[0], products[1]
        s1, s2 = p1.get("scores", {}), p2.get("scores", {})
        score1, score2 = p1.get("score", 0), p2.get("score", 0)

        winner = p1 if score1 >= score2 else p2
        winner_emoji = "👑"

        embed = discord.Embed(
            title="⚔️ Product Comparison",
            description=f"**{p1.get('name')}** vs **{p2.get('name')}**",
            color=0x6366f1
        )

        # Overall scores
        embed.add_field(
            name=f"{get_score_emoji(score1)} {p1.get('name')} {winner_emoji if score1 >= score2 else ''}",
            value=f"**{score1}/100**",
            inline=True
        )
        embed.add_field(
            name="VS",
            value="⚡",
            inline=True
        )
        embed.add_field(
            name=f"{get_score_emoji(score2)} {p2.get('name')} {winner_emoji if score2 > score1 else ''}",
            value=f"**{score2}/100**",
            inline=True
        )

        # Breakdown comparison
        breakdown = (
            f"**Security:** {s1.get('s', 'N/A')} vs {s2.get('s', 'N/A')}\n"
            f"**Adversity:** {s1.get('a', 'N/A')} vs {s2.get('a', 'N/A')}\n"
            f"**Fidelity:** {s1.get('f', 'N/A')} vs {s2.get('f', 'N/A')}\n"
            f"**Efficiency:** {s1.get('e', 'N/A')} vs {s2.get('e', 'N/A')}"
        )
        embed.add_field(name="📊 SAFE Breakdown", value=breakdown, inline=False)

        embed.set_footer(text="SafeScoring.io")
        embed.timestamp = datetime.now()

        view = discord.ui.View()
        view.add_item(discord.ui.Button(
            label="Full Comparison",
            url=f"{API_BASE_URL}/compare/{p1.get('slug')}/{p2.get('slug')}",
            style=discord.ButtonStyle.link
        ))

        await interaction.followup.send(embed=embed, view=view)

    except Exception as e:
        logger.error(f"Compare command error: {e}")
        await interaction.followup.send("❌ Error comparing products.", ephemeral=True)


@bot.tree.command(name="incidents", description="Get recent security incidents")
async def incidents(interaction: discord.Interaction):
    """Get recent security incidents."""
    await interaction.response.defer()

    try:
        response = requests.get(
            f"{API_BASE_URL}/api/v1/incidents",
            params={"limit": 5},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            incidents_list = data.get("data", [])[:5]

            if not incidents_list:
                await interaction.followup.send("No recent incidents.", ephemeral=True)
                return

            embed = discord.Embed(
                title="🚨 Recent Security Incidents",
                description="Latest security events in crypto",
                color=0xef4444
            )

            severity_emoji = {
                "critical": "🔴",
                "high": "🟠",
                "medium": "🟡",
                "low": "🟢"
            }

            for inc in incidents_list:
                emoji = severity_emoji.get(inc.get("severity", "medium"), "⚪")
                title = inc.get("title", "Unknown")[:50]
                date = inc.get("date", "")[:10]
                funds = inc.get("fundsLost", 0)

                value = f"📅 {date}"
                if funds and funds > 0:
                    value += f"\n💰 ${funds:,.0f} lost"

                embed.add_field(
                    name=f"{emoji} {title}",
                    value=value,
                    inline=False
                )

            embed.set_footer(text="SafeScoring.io • Stay informed, stay safe")
            embed.timestamp = datetime.now()

            view = discord.ui.View()
            view.add_item(discord.ui.Button(
                label="All Incidents",
                url=f"{API_BASE_URL}/incidents",
                style=discord.ButtonStyle.link
            ))

            await interaction.followup.send(embed=embed, view=view)
        else:
            await interaction.followup.send("❌ Error fetching incidents.", ephemeral=True)

    except Exception as e:
        logger.error(f"Incidents command error: {e}")
        await interaction.followup.send("❌ Error fetching incidents.", ephemeral=True)


@bot.tree.command(name="alerts", description="Set up SafeScoring alerts for this channel")
@app_commands.describe(
    action="Enable or disable alerts",
    threshold="Alert when any score drops below this value (default: 50)"
)
@app_commands.choices(action=[
    app_commands.Choice(name="Enable alerts", value="enable"),
    app_commands.Choice(name="Disable alerts", value="disable"),
    app_commands.Choice(name="Status", value="status"),
])
async def alerts(
    interaction: discord.Interaction,
    action: str = "status",
    threshold: int = 50
):
    """Manage channel alerts."""
    # This would integrate with your database to store channel subscriptions

    embed = discord.Embed(
        title="🔔 Alert Setup",
        color=0x6366f1
    )

    if action == "enable":
        embed.description = (
            f"✅ Alerts enabled for this channel!\n\n"
            f"You'll be notified when:\n"
            f"• Any product score drops below **{threshold}**\n"
            f"• New security incidents are reported\n"
            f"• Major score changes occur"
        )
        # TODO: Save to database
        # await save_channel_subscription(interaction.channel_id, interaction.guild_id, threshold)

    elif action == "disable":
        embed.description = "❌ Alerts disabled for this channel."
        # TODO: Remove from database

    else:  # status
        embed.description = (
            "ℹ️ **Alert System**\n\n"
            "Use `/alerts enable` to receive notifications in this channel.\n"
            "Use `/alerts disable` to stop notifications."
        )

    embed.set_footer(text="SafeScoring.io")
    await interaction.response.send_message(embed=embed, ephemeral=True)


@bot.tree.command(name="help", description="Show all SafeScoring bot commands")
async def help_command(interaction: discord.Interaction):
    """Show help message."""
    embed = discord.Embed(
        title="📚 SafeScoring Bot Commands",
        description="Get real-time security ratings for crypto products",
        color=0x6366f1
    )

    embed.add_field(
        name="🔍 Product Info",
        value=(
            "`/score <product>` - Get SafeScore\n"
            "`/compare <a> <b>` - Compare products\n"
            "`/top [category]` - Top rated products"
        ),
        inline=False
    )

    embed.add_field(
        name="🚨 Security",
        value="`/incidents` - Recent security incidents",
        inline=False
    )

    embed.add_field(
        name="🔔 Alerts",
        value="`/alerts` - Manage channel notifications",
        inline=False
    )

    embed.add_field(
        name="📝 Examples",
        value=(
            "`/score ledger`\n"
            "`/compare uniswap sushiswap`\n"
            "`/top hardware-wallet`"
        ),
        inline=False
    )

    embed.set_footer(text="SafeScoring.io • Crypto Security Ratings")

    view = discord.ui.View()
    view.add_item(discord.ui.Button(
        label="Website",
        url=API_BASE_URL,
        style=discord.ButtonStyle.link
    ))
    view.add_item(discord.ui.Button(
        label="Add to Server",
        url="https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands",
        style=discord.ButtonStyle.link
    ))

    await interaction.response.send_message(embed=embed, view=view)


def main():
    """Start the bot."""
    if not DISCORD_BOT_TOKEN:
        print("Error: DISCORD_BOT_TOKEN not set in environment")
        print("1. Create app at https://discord.com/developers/applications")
        print("2. Add DISCORD_BOT_TOKEN to your .env file")
        sys.exit(1)

    print("Starting SafeScoring Discord Bot...")
    print(f"API Base URL: {API_BASE_URL}")

    bot.run(DISCORD_BOT_TOKEN)


if __name__ == "__main__":
    main()
