#!/usr/bin/env python3
"""
SAFESCORING.IO - Telegram Alert Bot
Sends real-time security alerts to subscribers.

Features:
- Security incident alerts
- Score change notifications
- Weekly digest
- Product-specific alerts

Setup:
1. Create bot via @BotFather on Telegram
2. Get your bot token
3. Set TELEGRAM_BOT_TOKEN in .env
4. Run: python -m src.marketing.telegram_bot
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Try to import telegram library
try:
    from telegram import Bot, Update
    from telegram.ext import Application, CommandHandler, ContextTypes
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    print("Warning: python-telegram-bot not installed. Install with: pip install python-telegram-bot")

from src.marketing.crypto_monitor import CryptoMonitor


# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
SUBSCRIBERS_FILE = "data/telegram_subscribers.json"
ALERTS_LOG_FILE = "data/telegram_alerts_log.json"


class TelegramAlertBot:
    """
    Telegram bot for SafeScoring security alerts.
    """

    def __init__(self, token: str = None):
        """Initialize the bot with token."""
        self.token = token or TELEGRAM_BOT_TOKEN
        self.subscribers = self._load_subscribers()
        self.monitor = CryptoMonitor()

        if not self.token:
            print("Warning: TELEGRAM_BOT_TOKEN not set")

    def _load_subscribers(self) -> Dict:
        """Load subscriber list from file."""
        try:
            if os.path.exists(SUBSCRIBERS_FILE):
                with open(SUBSCRIBERS_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading subscribers: {e}")

        return {
            "all_alerts": [],           # Chat IDs subscribed to all alerts
            "hacks_only": [],           # Chat IDs subscribed to hacks only
            "product_alerts": {},       # {product_slug: [chat_ids]}
            "weekly_digest": [],        # Chat IDs for weekly digest
        }

    def _save_subscribers(self):
        """Save subscriber list to file."""
        try:
            os.makedirs(os.path.dirname(SUBSCRIBERS_FILE), exist_ok=True)
            with open(SUBSCRIBERS_FILE, 'w') as f:
                json.dump(self.subscribers, f, indent=2)
        except Exception as e:
            print(f"Error saving subscribers: {e}")

    def _log_alert(self, alert_type: str, message: str, recipients: int):
        """Log sent alerts."""
        try:
            log = []
            if os.path.exists(ALERTS_LOG_FILE):
                with open(ALERTS_LOG_FILE, 'r') as f:
                    log = json.load(f)

            log.append({
                "timestamp": datetime.now().isoformat(),
                "type": alert_type,
                "message": message[:100],
                "recipients": recipients
            })

            # Keep last 100 entries
            log = log[-100:]

            os.makedirs(os.path.dirname(ALERTS_LOG_FILE), exist_ok=True)
            with open(ALERTS_LOG_FILE, 'w') as f:
                json.dump(log, f, indent=2)
        except Exception:
            pass

    # =========================================================================
    # Bot Commands
    # =========================================================================

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        chat_id = update.effective_chat.id

        welcome_message = """
🔐 *Welcome to SafeScoring Alert Bot!*

I'll keep you informed about crypto security incidents and score changes.

*Available Commands:*
/subscribe - Subscribe to all security alerts
/subscribe\\_hacks - Subscribe to hack alerts only
/unsubscribe - Unsubscribe from alerts
/watch `<product>` - Watch a specific product
/unwatch `<product>` - Stop watching a product
/latest - Get latest security incidents
/status - Check your subscription status
/help - Show this help message

🌐 Visit [safescoring.io](https://safescoring.io) for full security scores.
        """

        await update.message.reply_text(
            welcome_message,
            parse_mode='Markdown',
            disable_web_page_preview=True
        )

    async def cmd_subscribe(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /subscribe command."""
        chat_id = update.effective_chat.id

        if chat_id not in self.subscribers["all_alerts"]:
            self.subscribers["all_alerts"].append(chat_id)
            self._save_subscribers()
            await update.message.reply_text(
                "✅ You're now subscribed to all security alerts!\n\n"
                "You'll receive notifications about:\n"
                "• New hacks and exploits\n"
                "• Major security incidents\n"
                "• Important score changes\n\n"
                "Use /unsubscribe to stop receiving alerts."
            )
        else:
            await update.message.reply_text(
                "You're already subscribed to all alerts.\n"
                "Use /unsubscribe to stop receiving alerts."
            )

    async def cmd_subscribe_hacks(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /subscribe_hacks command."""
        chat_id = update.effective_chat.id

        if chat_id not in self.subscribers["hacks_only"]:
            self.subscribers["hacks_only"].append(chat_id)
            self._save_subscribers()
            await update.message.reply_text(
                "✅ You're now subscribed to hack alerts only!\n\n"
                "You'll receive notifications when major hacks occur.\n"
                "Use /unsubscribe to stop."
            )
        else:
            await update.message.reply_text("You're already subscribed to hack alerts.")

    async def cmd_unsubscribe(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /unsubscribe command."""
        chat_id = update.effective_chat.id
        removed = False

        if chat_id in self.subscribers["all_alerts"]:
            self.subscribers["all_alerts"].remove(chat_id)
            removed = True

        if chat_id in self.subscribers["hacks_only"]:
            self.subscribers["hacks_only"].remove(chat_id)
            removed = True

        if chat_id in self.subscribers["weekly_digest"]:
            self.subscribers["weekly_digest"].remove(chat_id)
            removed = True

        # Remove from product watches
        for product, watchers in self.subscribers["product_alerts"].items():
            if chat_id in watchers:
                watchers.remove(chat_id)
                removed = True

        if removed:
            self._save_subscribers()
            await update.message.reply_text(
                "✅ You've been unsubscribed from all alerts.\n"
                "Use /subscribe to resubscribe."
            )
        else:
            await update.message.reply_text("You weren't subscribed to any alerts.")

    async def cmd_watch(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /watch <product> command."""
        chat_id = update.effective_chat.id

        if not context.args:
            await update.message.reply_text(
                "Usage: /watch `<product-slug>`\n\n"
                "Example: /watch ledger-nano-x\n\n"
                "This will alert you when this product's score changes or "
                "when it's involved in a security incident."
            )
            return

        product_slug = context.args[0].lower()

        if product_slug not in self.subscribers["product_alerts"]:
            self.subscribers["product_alerts"][product_slug] = []

        if chat_id not in self.subscribers["product_alerts"][product_slug]:
            self.subscribers["product_alerts"][product_slug].append(chat_id)
            self._save_subscribers()
            await update.message.reply_text(
                f"✅ You're now watching *{product_slug}*\n\n"
                f"You'll be notified of:\n"
                f"• Score changes\n"
                f"• Security incidents\n"
                f"• Major updates\n\n"
                f"Use /unwatch {product_slug} to stop.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(f"You're already watching {product_slug}.")

    async def cmd_unwatch(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /unwatch <product> command."""
        chat_id = update.effective_chat.id

        if not context.args:
            await update.message.reply_text("Usage: /unwatch `<product-slug>`")
            return

        product_slug = context.args[0].lower()

        if product_slug in self.subscribers["product_alerts"]:
            if chat_id in self.subscribers["product_alerts"][product_slug]:
                self.subscribers["product_alerts"][product_slug].remove(chat_id)
                self._save_subscribers()
                await update.message.reply_text(f"✅ Stopped watching {product_slug}")
                return

        await update.message.reply_text(f"You weren't watching {product_slug}.")

    async def cmd_latest(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /latest command - show latest incidents."""
        events = self.monitor.get_top_events(limit=5, min_score=30)

        if not events:
            await update.message.reply_text("No recent security events to report. 🎉")
            return

        message = "🔔 *Latest Security Events*\n\n"

        for event in events:
            category_emoji = {
                'HACK': '🚨',
                'SCAM': '⚠️',
                'VULNERABILITY': '🔓',
                'WALLET': '👛',
                'GENERAL': '📰',
            }.get(event['category'], '📰')

            title = event['title'][:80] + "..." if len(event['title']) > 80 else event['title']
            message += f"{category_emoji} *{event['category']}*\n"
            message += f"{title}\n"
            message += f"[Read more]({event.get('link', 'https://safescoring.io')})\n\n"

        message += "—\n🌐 [SafeScoring.io](https://safescoring.io)"

        await update.message.reply_text(
            message,
            parse_mode='Markdown',
            disable_web_page_preview=True
        )

    async def cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /status command."""
        chat_id = update.effective_chat.id

        subscriptions = []

        if chat_id in self.subscribers["all_alerts"]:
            subscriptions.append("✅ All security alerts")

        if chat_id in self.subscribers["hacks_only"]:
            subscriptions.append("✅ Hack alerts only")

        if chat_id in self.subscribers["weekly_digest"]:
            subscriptions.append("✅ Weekly digest")

        watched_products = []
        for product, watchers in self.subscribers["product_alerts"].items():
            if chat_id in watchers:
                watched_products.append(product)

        if watched_products:
            subscriptions.append(f"✅ Watching: {', '.join(watched_products)}")

        if subscriptions:
            message = "📋 *Your Subscriptions*\n\n" + "\n".join(subscriptions)
        else:
            message = "You're not subscribed to any alerts.\nUse /subscribe to get started."

        await update.message.reply_text(message, parse_mode='Markdown')

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command."""
        await self.cmd_start(update, context)

    # =========================================================================
    # Alert Sending Methods
    # =========================================================================

    async def send_hack_alert(self, event: Dict):
        """Send alert about a hack to all subscribers."""
        if not self.token or not TELEGRAM_AVAILABLE:
            print("Cannot send alert: Telegram not configured")
            return

        bot = Bot(token=self.token)

        amount = event.get('amount_usd', 0)
        amount_str = f"${amount:,.0f}" if amount else "Unknown amount"

        message = (
            f"🚨 *SECURITY ALERT*\n\n"
            f"*{event.get('title', 'Security Incident')}*\n\n"
            f"💰 Amount: {amount_str}\n"
            f"📁 Category: {event.get('category', 'Unknown')}\n"
            f"📅 {event.get('published', 'Recently')}\n\n"
            f"Check your wallets and protocols!\n\n"
            f"[Full details]({event.get('link', 'https://safescoring.io')})\n"
            f"[Verify on SafeScoring](https://safescoring.io)"
        )

        # Get all recipients
        recipients = set(self.subscribers["all_alerts"] + self.subscribers["hacks_only"])
        sent = 0

        for chat_id in recipients:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='Markdown',
                    disable_web_page_preview=True
                )
                sent += 1
                await asyncio.sleep(0.05)  # Avoid rate limits
            except Exception as e:
                print(f"Failed to send to {chat_id}: {e}")

        self._log_alert('hack', event.get('title', '')[:50], sent)
        print(f"Sent hack alert to {sent} subscribers")

    async def send_score_change_alert(self, product_slug: str, old_score: int, new_score: int):
        """Send alert about significant score change."""
        if not self.token or not TELEGRAM_AVAILABLE:
            return

        bot = Bot(token=self.token)

        direction = "📈" if new_score > old_score else "📉"
        change = abs(new_score - old_score)

        message = (
            f"{direction} *Score Change Alert*\n\n"
            f"*{product_slug}* score changed by {change} points\n\n"
            f"Old: {old_score}/100\n"
            f"New: {new_score}/100\n\n"
            f"[View details](https://safescoring.io/products/{product_slug})"
        )

        # Get product watchers + all_alerts subscribers
        recipients = set(self.subscribers["all_alerts"])
        if product_slug in self.subscribers["product_alerts"]:
            recipients.update(self.subscribers["product_alerts"][product_slug])

        sent = 0
        for chat_id in recipients:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='Markdown',
                    disable_web_page_preview=True
                )
                sent += 1
                await asyncio.sleep(0.05)
            except Exception:
                pass

        self._log_alert('score_change', f"{product_slug}: {old_score}->{new_score}", sent)

    async def send_weekly_digest(self, events: List[Dict]):
        """Send weekly digest to subscribers."""
        if not self.token or not TELEGRAM_AVAILABLE:
            return

        bot = Bot(token=self.token)

        message = "📊 *Weekly Security Digest*\n\n"

        if events:
            hack_count = len([e for e in events if e.get('category') == 'HACK'])
            total_amount = sum(e.get('amount_usd', 0) for e in events)

            message += f"This week:\n"
            message += f"• {hack_count} security incidents\n"
            if total_amount > 0:
                message += f"• ${total_amount:,.0f} total funds affected\n"
            message += "\n*Top incidents:*\n\n"

            for event in events[:5]:
                message += f"• {event['title'][:60]}...\n"

        else:
            message += "No major security incidents this week! 🎉\n"

        message += (
            f"\n—\n"
            f"Stay safe! Verify your wallets:\n"
            f"🌐 [SafeScoring.io](https://safescoring.io)"
        )

        recipients = set(self.subscribers["weekly_digest"] + self.subscribers["all_alerts"])
        sent = 0

        for chat_id in recipients:
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=message,
                    parse_mode='Markdown',
                    disable_web_page_preview=True
                )
                sent += 1
                await asyncio.sleep(0.05)
            except Exception:
                pass

        self._log_alert('weekly_digest', f"{len(events)} events", sent)

    # =========================================================================
    # Bot Runner
    # =========================================================================

    def run(self):
        """Start the bot (blocking)."""
        if not TELEGRAM_AVAILABLE:
            print("Error: python-telegram-bot not installed")
            print("Install with: pip install python-telegram-bot")
            return

        if not self.token:
            print("Error: TELEGRAM_BOT_TOKEN not set")
            print("Set it in your .env file or environment")
            return

        print("Starting SafeScoring Telegram Bot...")

        app = Application.builder().token(self.token).build()

        # Register handlers
        app.add_handler(CommandHandler("start", self.cmd_start))
        app.add_handler(CommandHandler("subscribe", self.cmd_subscribe))
        app.add_handler(CommandHandler("subscribe_hacks", self.cmd_subscribe_hacks))
        app.add_handler(CommandHandler("unsubscribe", self.cmd_unsubscribe))
        app.add_handler(CommandHandler("watch", self.cmd_watch))
        app.add_handler(CommandHandler("unwatch", self.cmd_unwatch))
        app.add_handler(CommandHandler("latest", self.cmd_latest))
        app.add_handler(CommandHandler("status", self.cmd_status))
        app.add_handler(CommandHandler("help", self.cmd_help))

        print("Bot is running! Press Ctrl+C to stop.")
        app.run_polling()


# CLI
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="SafeScoring Telegram Bot")
    parser.add_argument("--run", action="store_true", help="Start the bot")
    parser.add_argument("--test-alert", action="store_true", help="Send test alert")

    args = parser.parse_args()

    bot = TelegramAlertBot()

    if args.run:
        bot.run()
    elif args.test_alert:
        # Test alert
        test_event = {
            'title': 'Test Alert - Ignore',
            'category': 'HACK',
            'amount_usd': 1000000,
            'link': 'https://safescoring.io',
            'published': datetime.now().isoformat()
        }
        asyncio.run(bot.send_hack_alert(test_event))
    else:
        print("Usage: python telegram_bot.py --run")
        print("       python telegram_bot.py --test-alert")
