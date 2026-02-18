"""
SafeScoring Telegram Bot
Real-time security scores and alerts via Telegram.

Commands:
- /start - Welcome message
- /score <product> - Get SafeScore for a product
- /top [category] - Top rated products
- /alerts - Manage your alert subscriptions
- /compare <product1> <product2> - Compare two products
- /incidents - Recent security incidents
- /help - Show all commands

Setup:
1. Create bot via @BotFather on Telegram
2. Get your bot token
3. Set TELEGRAM_BOT_TOKEN in .env
4. Run: python telegram_bot.py

Dependencies:
pip install python-telegram-bot requests
"""

import os
import sys
import logging
import requests
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
except ImportError:
    print("Please install python-telegram-bot: pip install python-telegram-bot")
    sys.exit(1)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'))
except ImportError:
    pass

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://safescoring.io")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

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


def format_score_message(data: dict) -> str:
    """Format product score as Telegram message."""
    if not data or "error" in data:
        return "❌ Product not found"

    score = data.get("score", 0)
    scores = data.get("scores", {})
    emoji = get_score_emoji(score)

    message = f"""
{emoji} *{data.get('name', 'Unknown')}*
Type: {data.get('type', 'N/A')}

*SafeScore: {score}/100*

📊 *Breakdown:*
├ Security: {scores.get('s', 'N/A')}/100
├ Adversity: {scores.get('a', 'N/A')}/100
├ Fidelity: {scores.get('f', 'N/A')}/100
└ Efficiency: {scores.get('e', 'N/A')}/100

🔗 [View Full Report]({API_BASE_URL}/products/{data.get('slug', '')})
"""
    return message


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send welcome message."""
    user = update.effective_user

    welcome_message = f"""
👋 Welcome to *SafeScoring Bot*, {user.first_name}!

I provide real-time security ratings for crypto products.

*Commands:*
/score `<product>` - Get SafeScore
/top - Top rated products
/compare `<a>` `<b>` - Compare products
/incidents - Recent security incidents
/alerts - Manage alerts
/help - All commands

*Example:*
`/score ledger`
`/compare ledger trezor`

Stay safe in crypto! 🔐
"""

    keyboard = [
        [
            InlineKeyboardButton("🌐 Website", url=API_BASE_URL),
            InlineKeyboardButton("📊 Leaderboard", url=f"{API_BASE_URL}/leaderboard"),
        ],
        [
            InlineKeyboardButton("🔔 Get Alerts", callback_data="alerts_setup"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        welcome_message,
        parse_mode="Markdown",
        reply_markup=reply_markup,
        disable_web_page_preview=True
    )


async def score(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get SafeScore for a product."""
    if not context.args:
        await update.message.reply_text(
            "Usage: `/score <product_name>`\nExample: `/score ledger`",
            parse_mode="Markdown"
        )
        return

    query = " ".join(context.args).lower().strip()

    # Show typing indicator
    await update.message.chat.send_action("typing")

    try:
        # Search for product
        response = requests.get(
            f"{API_BASE_URL}/api/search",
            params={"q": query, "limit": 1},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])

            if results:
                # Get full score data
                slug = results[0].get("slug")
                score_response = requests.get(
                    f"{API_BASE_URL}/api/products/{slug}/score",
                    timeout=10
                )

                if score_response.status_code == 200:
                    score_data = score_response.json()
                    message = format_score_message(score_data)

                    keyboard = [[
                        InlineKeyboardButton("📄 Full Report", url=f"{API_BASE_URL}/products/{slug}"),
                        InlineKeyboardButton("🔔 Set Alert", callback_data=f"alert_{slug}"),
                    ]]
                    reply_markup = InlineKeyboardMarkup(keyboard)

                    await update.message.reply_text(
                        message,
                        parse_mode="Markdown",
                        reply_markup=reply_markup,
                        disable_web_page_preview=True
                    )
                    return

            await update.message.reply_text(
                f"❌ No product found for '{query}'\n\nTry a different search term.",
                parse_mode="Markdown"
            )
        else:
            await update.message.reply_text("❌ Error fetching data. Please try again.")

    except Exception as e:
        logger.error(f"Score command error: {e}")
        await update.message.reply_text("❌ Error fetching score. Please try again later.")


async def top(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get top rated products."""
    category = context.args[0] if context.args else None

    await update.message.chat.send_action("typing")

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
                await update.message.reply_text("No products found.")
                return

            message = "🏆 *Top SafeScores*\n\n"

            for i, p in enumerate(products, 1):
                score = p.get("score", p.get("note_finale", 0))
                if isinstance(score, float):
                    score = round(score)
                emoji = get_score_emoji(score)
                name = p.get("name", "Unknown")
                message += f"{i}. {emoji} *{name}* - {score}/100\n"

            message += f"\n🔗 [View Full Leaderboard]({API_BASE_URL}/leaderboard)"

            await update.message.reply_text(
                message,
                parse_mode="Markdown",
                disable_web_page_preview=True
            )
        else:
            await update.message.reply_text("❌ Error fetching leaderboard.")

    except Exception as e:
        logger.error(f"Top command error: {e}")
        await update.message.reply_text("❌ Error fetching data. Please try again.")


async def compare(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Compare two products."""
    if len(context.args) < 2:
        await update.message.reply_text(
            "Usage: `/compare <product1> <product2>`\nExample: `/compare ledger trezor`",
            parse_mode="Markdown"
        )
        return

    product1 = context.args[0].lower()
    product2 = context.args[1].lower()

    await update.message.chat.send_action("typing")

    try:
        # Fetch both products
        scores = []
        for query in [product1, product2]:
            search = requests.get(f"{API_BASE_URL}/api/search", params={"q": query, "limit": 1}, timeout=10)
            if search.status_code == 200:
                results = search.json().get("results", [])
                if results:
                    slug = results[0].get("slug")
                    score_resp = requests.get(f"{API_BASE_URL}/api/products/{slug}/score", timeout=10)
                    if score_resp.status_code == 200:
                        scores.append(score_resp.json())

        if len(scores) < 2:
            await update.message.reply_text("❌ Could not find both products. Check the names.")
            return

        p1, p2 = scores[0], scores[1]
        s1, s2 = p1.get("scores", {}), p2.get("scores", {})

        message = f"""
⚔️ *Comparison*

*{p1.get('name')}* vs *{p2.get('name')}*

📊 *Overall Score:*
{get_score_emoji(p1.get('score', 0))} {p1.get('name')}: {p1.get('score', 0)}/100
{get_score_emoji(p2.get('score', 0))} {p2.get('name')}: {p2.get('score', 0)}/100

📈 *Breakdown:*
Security: {s1.get('s', 'N/A')} vs {s2.get('s', 'N/A')}
Adversity: {s1.get('a', 'N/A')} vs {s2.get('a', 'N/A')}
Fidelity: {s1.get('f', 'N/A')} vs {s2.get('f', 'N/A')}
Efficiency: {s1.get('e', 'N/A')} vs {s2.get('e', 'N/A')}

🔗 [Full Comparison]({API_BASE_URL}/compare/{p1.get('slug')}/{p2.get('slug')})
"""

        await update.message.reply_text(
            message,
            parse_mode="Markdown",
            disable_web_page_preview=True
        )

    except Exception as e:
        logger.error(f"Compare command error: {e}")
        await update.message.reply_text("❌ Error comparing products.")


async def incidents(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Get recent security incidents."""
    await update.message.chat.send_action("typing")

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
                await update.message.reply_text("No recent incidents.")
                return

            message = "🚨 *Recent Security Incidents*\n\n"

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

                message += f"{emoji} *{title}*\n"
                if funds and funds > 0:
                    message += f"   💰 ${funds:,.0f} lost\n"
                message += f"   📅 {date}\n\n"

            message += f"🔗 [View All Incidents]({API_BASE_URL}/incidents)"

            await update.message.reply_text(
                message,
                parse_mode="Markdown",
                disable_web_page_preview=True
            )
        else:
            await update.message.reply_text("❌ Error fetching incidents.")

    except Exception as e:
        logger.error(f"Incidents command error: {e}")
        await update.message.reply_text("❌ Error fetching incidents.")


async def alerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Manage alert subscriptions."""
    message = """
🔔 *Alert Subscriptions*

Get notified when:
• Product scores change
• New security incidents occur
• A product drops below threshold

*Setup alerts via our website:*
"""

    keyboard = [
        [InlineKeyboardButton("⚙️ Manage Alerts", url=f"{API_BASE_URL}/dashboard/alerts")],
        [InlineKeyboardButton("📧 Email Alerts", url=f"{API_BASE_URL}/dashboard/alerts")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        message,
        parse_mode="Markdown",
        reply_markup=reply_markup
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show help message."""
    help_text = """
📚 *SafeScoring Bot Commands*

*Product Info:*
/score `<product>` - Get SafeScore
/compare `<a>` `<b>` - Compare products
/top - Top rated products

*Security:*
/incidents - Recent security incidents

*Account:*
/alerts - Manage alert subscriptions
/start - Welcome message

*Examples:*
`/score ledger nano x`
`/compare uniswap sushiswap`
`/top hardware-wallets`

🔗 Website: {url}
📧 Support: support@safescoring.io
""".format(url=API_BASE_URL)

    await update.message.reply_text(
        help_text,
        parse_mode="Markdown",
        disable_web_page_preview=True
    )


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle button callbacks."""
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "alerts_setup":
        await query.message.reply_text(
            "🔔 Set up alerts on our website:\n" + f"{API_BASE_URL}/dashboard/alerts",
            disable_web_page_preview=True
        )
    elif data.startswith("alert_"):
        slug = data.replace("alert_", "")
        await query.message.reply_text(
            f"🔔 Set alert for this product:\n{API_BASE_URL}/dashboard/alerts?product={slug}",
            disable_web_page_preview=True
        )


def main() -> None:
    """Start the bot."""
    if not TELEGRAM_BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not set in environment")
        print("1. Create a bot via @BotFather on Telegram")
        print("2. Add TELEGRAM_BOT_TOKEN to your .env file")
        sys.exit(1)

    print("Starting SafeScoring Telegram Bot...")
    print(f"API Base URL: {API_BASE_URL}")

    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("score", score))
    application.add_handler(CommandHandler("top", top))
    application.add_handler(CommandHandler("compare", compare))
    application.add_handler(CommandHandler("incidents", incidents))
    application.add_handler(CommandHandler("alerts", alerts))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CallbackQueryHandler(button_callback))

    # Start polling
    print("Bot is running! Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
