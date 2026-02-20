"""
SafeScoring Incident Alerter
Unified real-time alert system that pushes to all channels.

Channels:
- Twitter/X
- Telegram
- Discord
- Email (subscribers)
- Push notifications (web)

This is the central alert dispatcher that should be run:
- As a cron job every 15 minutes
- Or as a daemon with continuous monitoring

Usage:
    python incident_alerter.py           # Check and alert once
    python incident_alerter.py --daemon  # Run continuously
"""

import os
import sys
import json
import time
import logging
import argparse
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'))
except ImportError:
    pass

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "https://safescoring.io")

# Channel configs
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "@safescoring")

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Alert thresholds
MIN_FUNDS_LOST_ALERT = 1_000_000  # $1M minimum for alerts
SCORE_DROP_THRESHOLD = 10  # Alert if score drops by 10+ points

# State file to track what's been alerted
STATE_FILE = os.path.join(os.path.dirname(__file__), '.incident_alerter_state.json')

# Logging
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }


def load_state() -> Dict:
    """Load alerter state."""
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return {
        'last_check': None,
        'alerted_incidents': [],
        'alerted_score_changes': []
    }


def save_state(state: Dict):
    """Save alerter state."""
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving state: {e}")


def format_amount(amount: float) -> str:
    """Format amount in human readable form."""
    if amount >= 1_000_000_000:
        return f"${amount/1_000_000_000:.1f}B"
    elif amount >= 1_000_000:
        return f"${amount/1_000_000:.1f}M"
    elif amount >= 1_000:
        return f"${amount/1_000:.0f}K"
    return f"${amount:.0f}"


def get_score_emoji(score: int) -> str:
    if score >= 80:
        return "🟢"
    elif score >= 60:
        return "🟡"
    elif score >= 40:
        return "🟠"
    return "🔴"


def get_severity_emoji(severity: str) -> str:
    return {
        'critical': '🚨🚨🚨',
        'high': '🚨🚨',
        'medium': '🚨',
        'low': '⚠️'
    }.get(severity.lower(), '🚨')


# ============================================================
# DATA FETCHERS
# ============================================================

def fetch_recent_incidents(since: Optional[str] = None) -> List[Dict]:
    """Fetch recent incidents from database."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    try:
        params = {
            "select": "id,title,description,severity,funds_lost,funds_recovered,date,type,product_id,products(id,name,slug,note_finale)",
            "order": "date.desc,funds_lost.desc",
            "limit": 50
        }

        if since:
            params["date"] = f"gte.{since}"
        else:
            # Default to last 24 hours
            yesterday = (datetime.now() - timedelta(hours=24)).strftime('%Y-%m-%d')
            params["date"] = f"gte.{yesterday}"

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_incidents",
            headers=get_supabase_headers(),
            params=params,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching incidents: {e}")

    return []


def fetch_score_changes() -> List[Dict]:
    """Fetch products with significant score changes."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    try:
        # This requires a score_history table - fetch products with recent drops
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/score_history",
            headers=get_supabase_headers(),
            params={
                "select": "product_id,old_score,new_score,changed_at,products(name,slug)",
                "order": "changed_at.desc",
                "limit": 20
            },
            timeout=30
        )

        if response.status_code == 200:
            changes = response.json()
            # Filter significant drops
            significant = [
                c for c in changes
                if c.get('old_score', 0) - c.get('new_score', 0) >= SCORE_DROP_THRESHOLD
            ]
            return significant
    except Exception as e:
        logger.debug(f"Score history not available: {e}")

    return []


# ============================================================
# ALERT FORMATTERS
# ============================================================

def format_incident_alert(incident: Dict) -> Dict[str, str]:
    """Format incident for all channels."""
    product = incident.get('products', {}) or {}
    product_name = product.get('name', 'Unknown Protocol')
    product_slug = product.get('slug', '')
    score = product.get('note_finale', 0)

    title = incident.get('title', 'Security Incident')
    severity = incident.get('severity', 'medium')
    funds_lost = incident.get('funds_lost', 0)
    funds_recovered = incident.get('funds_recovered', 0)
    incident_type = incident.get('type', 'hack')
    date = incident.get('date', '')[:10]

    severity_emoji = get_severity_emoji(severity)
    score_emoji = get_score_emoji(round(score)) if score else ''

    # Different formats for different channels

    # Twitter (280 chars max)
    twitter = f"{severity_emoji} {severity.upper()}: {product_name}\n\n"
    twitter += f"{title[:60]}\n"
    if funds_lost:
        twitter += f"💰 {format_amount(funds_lost)} lost"
        if funds_recovered:
            twitter += f" ({format_amount(funds_recovered)} recovered)"
        twitter += "\n"
    if score:
        twitter += f"{score_emoji} SafeScore was {round(score)}/100\n"
    twitter += f"\n{API_BASE_URL}/products/{product_slug}"
    twitter = twitter[:280]

    # Telegram (rich markdown)
    telegram = f"{severity_emoji} *SECURITY ALERT*\n\n"
    telegram += f"*{product_name}*: {title}\n\n"
    if funds_lost:
        telegram += f"💰 Funds Lost: {format_amount(funds_lost)}\n"
    if funds_recovered:
        telegram += f"💵 Recovered: {format_amount(funds_recovered)}\n"
    telegram += f"📅 Date: {date}\n"
    telegram += f"🏷️ Type: {incident_type.replace('_', ' ').title()}\n"
    if score:
        telegram += f"\n{score_emoji} SafeScore: {round(score)}/100\n"
    telegram += f"\n🔍 [Full Report]({API_BASE_URL}/products/{product_slug})"

    # Discord (embed format)
    discord = {
        "title": f"{severity_emoji} {product_name}: {title[:100]}",
        "description": incident.get('description', '')[:500],
        "color": {'critical': 0xdc2626, 'high': 0xf97316, 'medium': 0xeab308, 'low': 0x22c55e}.get(severity, 0xef4444),
        "fields": [],
        "url": f"{API_BASE_URL}/products/{product_slug}",
        "footer": {"text": "SafeScoring.io"}
    }

    if funds_lost:
        discord["fields"].append({"name": "💰 Funds Lost", "value": format_amount(funds_lost), "inline": True})
    if score:
        discord["fields"].append({"name": f"{score_emoji} SafeScore", "value": f"{round(score)}/100", "inline": True})
    discord["fields"].append({"name": "📅 Date", "value": date, "inline": True})

    # Email subject + body
    email_subject = f"[{severity.upper()}] {product_name} - {title[:50]}"
    email_body = f"""
Security Alert from SafeScoring

{severity.upper()}: {product_name}
{title}

{'Funds Lost: ' + format_amount(funds_lost) if funds_lost else ''}
{'Funds Recovered: ' + format_amount(funds_recovered) if funds_recovered else ''}
Date: {date}
Type: {incident_type.replace('_', ' ').title()}

{'SafeScore: ' + str(round(score)) + '/100' if score else ''}

View full report: {API_BASE_URL}/products/{product_slug}

---
SafeScoring.io - Crypto Security Ratings
"""

    return {
        'twitter': twitter,
        'telegram': telegram,
        'discord': discord,
        'email_subject': email_subject,
        'email_body': email_body.strip()
    }


def format_score_change_alert(change: Dict) -> Dict[str, str]:
    """Format score change for all channels."""
    product = change.get('products', {}) or {}
    name = product.get('name', 'Unknown')
    slug = product.get('slug', '')
    old_score = change.get('old_score', 0)
    new_score = change.get('new_score', 0)
    drop = old_score - new_score

    old_emoji = get_score_emoji(old_score)
    new_emoji = get_score_emoji(new_score)

    twitter = f"⚠️ SCORE CHANGE: {name}\n\n"
    twitter += f"{old_emoji} {old_score} → {new_emoji} {new_score} (-{drop} points)\n\n"
    twitter += f"See why: {API_BASE_URL}/products/{slug}"

    telegram = f"⚠️ *SCORE CHANGE ALERT*\n\n"
    telegram += f"*{name}* score dropped!\n\n"
    telegram += f"{old_emoji} {old_score} → {new_emoji} {new_score} (*-{drop}* points)\n\n"
    telegram += f"[View Details]({API_BASE_URL}/products/{slug})"

    return {
        'twitter': twitter[:280],
        'telegram': telegram,
        'discord': {
            "title": f"⚠️ Score Change: {name}",
            "description": f"Score dropped from {old_score} to {new_score} (-{drop} points)",
            "color": 0xf97316,
            "url": f"{API_BASE_URL}/products/{slug}"
        }
    }


# ============================================================
# CHANNEL SENDERS
# ============================================================

def send_telegram(message: str) -> bool:
    """Send message to Telegram channel."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        return False

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={
                "chat_id": TELEGRAM_CHANNEL_ID,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": False
            },
            timeout=30
        )
        if response.status_code == 200:
            logger.info("Sent Telegram alert")
            return True
        else:
            logger.error(f"Telegram error: {response.text}")
    except Exception as e:
        logger.error(f"Telegram send error: {e}")

    return False


def send_discord(embed: Dict) -> bool:
    """Send embed to Discord webhook."""
    if not DISCORD_WEBHOOK_URL:
        return False

    try:
        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json={"embeds": [embed]},
            timeout=30
        )
        if response.status_code in [200, 204]:
            logger.info("Sent Discord alert")
            return True
        else:
            logger.error(f"Discord error: {response.text}")
    except Exception as e:
        logger.error(f"Discord send error: {e}")

    return False


def send_twitter(message: str) -> bool:
    """Send tweet."""
    if not all([TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET]):
        return False

    try:
        import tweepy
        client = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_SECRET
        )
        response = client.create_tweet(text=message)
        if response.data:
            logger.info(f"Sent Twitter alert: {response.data['id']}")
            return True
    except ImportError:
        logger.warning("tweepy not installed, skipping Twitter")
    except Exception as e:
        logger.error(f"Twitter send error: {e}")

    return False


def send_push_notification(title: str, body: str, url: str) -> bool:
    """Send web push notification via Supabase edge function or service."""
    # This would integrate with a push notification service
    # like OneSignal, Firebase, or a custom solution
    # For now, just log it
    logger.info(f"Push notification: {title}")
    return True


def dispatch_user_webhooks(event_type: str, payload: Dict) -> int:
    """Send webhooks to premium users who have registered for this event type."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return 0

    try:
        # Fetch active webhooks for this event type
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_webhooks",
            headers=get_supabase_headers(),
            params={
                "select": "id,url,secret,user_id",
                "is_active": "eq.true",
                "events": f"cs.{{{event_type}}}"  # Contains event type
            },
            timeout=30
        )

        if response.status_code != 200:
            return 0

        webhooks = response.json()
        sent = 0

        for webhook in webhooks:
            try:
                import hmac
                import hashlib

                # Create signature
                payload_str = json.dumps(payload, separators=(',', ':'), default=str)
                signature = hmac.new(
                    webhook['secret'].encode(),
                    payload_str.encode(),
                    hashlib.sha256
                ).hexdigest()

                # Send webhook
                resp = requests.post(
                    webhook['url'],
                    json={
                        "event": event_type,
                        "timestamp": datetime.now().isoformat(),
                        "data": payload
                    },
                    headers={
                        "Content-Type": "application/json",
                        "X-SafeScoring-Signature": f"sha256={signature}",
                        "X-SafeScoring-Event": event_type
                    },
                    timeout=10
                )

                if resp.status_code < 400:
                    sent += 1
                    # Update last triggered
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/user_webhooks",
                        headers=get_supabase_headers(),
                        params={"id": f"eq.{webhook['id']}"},
                        json={"last_triggered_at": datetime.now().isoformat()},
                        timeout=10
                    )
                else:
                    logger.warning(f"Webhook {webhook['id']} failed: {resp.status_code}")

            except Exception as e:
                logger.error(f"Webhook error for {webhook['id']}: {e}")

        logger.info(f"Dispatched {sent}/{len(webhooks)} user webhooks for {event_type}")
        return sent

    except Exception as e:
        logger.error(f"Error dispatching webhooks: {e}")
        return 0


# ============================================================
# MAIN ALERTER
# ============================================================

def process_incidents(state: Dict) -> Dict:
    """Process new incidents and send alerts."""
    alerted = set(state.get('alerted_incidents', []))

    # Get last check time
    since = state.get('last_check')
    if since:
        # Parse and subtract 1 hour for overlap
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
            since = (since_dt - timedelta(hours=1)).strftime('%Y-%m-%d')
        except:
            since = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

    incidents = fetch_recent_incidents(since)
    logger.info(f"Found {len(incidents)} incidents to check")

    new_alerts = 0

    for incident in incidents:
        incident_id = str(incident.get('id'))

        # Skip already alerted
        if incident_id in alerted:
            continue

        # Skip small incidents
        funds_lost = incident.get('funds_lost', 0)
        if funds_lost < MIN_FUNDS_LOST_ALERT:
            continue

        # Format and send alerts
        formatted = format_incident_alert(incident)

        logger.info(f"Alerting: {incident.get('title', 'Unknown')[:50]} ({format_amount(funds_lost)})")

        # Send to all channels (with delays to avoid rate limits)
        send_telegram(formatted['telegram'])
        time.sleep(1)

        send_discord(formatted['discord'])
        time.sleep(1)

        send_twitter(formatted['twitter'])
        time.sleep(1)

        # Send webhooks to premium users
        dispatch_user_webhooks('incident_detected', {
            'incident_id': incident.get('id'),
            'title': incident.get('title'),
            'severity': incident.get('severity'),
            'funds_lost': funds_lost,
            'product': incident.get('products', {}),
            'url': f"{API_BASE_URL}/incidents"
        })
        time.sleep(1)

        # Track as alerted
        alerted.add(incident_id)
        new_alerts += 1

        # Rate limit between alerts
        if new_alerts >= 5:
            logger.info("Rate limiting: max 5 alerts per run")
            break

    # Update state
    state['alerted_incidents'] = list(alerted)[-500:]  # Keep last 500
    state['last_check'] = datetime.now().isoformat()

    logger.info(f"Sent {new_alerts} new alerts")
    return state


def process_score_changes(state: Dict) -> Dict:
    """Process score changes and send alerts."""
    alerted = set(state.get('alerted_score_changes', []))

    changes = fetch_score_changes()
    logger.info(f"Found {len(changes)} score changes to check")

    new_alerts = 0

    for change in changes:
        change_key = f"{change.get('product_id')}_{change.get('changed_at', '')[:10]}"

        if change_key in alerted:
            continue

        formatted = format_score_change_alert(change)

        logger.info(f"Score change alert: {change.get('products', {}).get('name', 'Unknown')}")

        send_telegram(formatted['telegram'])
        time.sleep(1)

        send_discord(formatted.get('discord', {}))
        time.sleep(1)

        alerted.add(change_key)
        new_alerts += 1

        if new_alerts >= 3:
            break

    state['alerted_score_changes'] = list(alerted)[-200:]
    return state


def run_once():
    """Run alerter once."""
    logger.info("=" * 50)
    logger.info("SafeScoring Incident Alerter")
    logger.info("=" * 50)

    state = load_state()

    # Process incidents
    state = process_incidents(state)

    # Process score changes
    state = process_score_changes(state)

    # Save state
    save_state(state)

    logger.info("Done")


def run_daemon(interval_minutes: int = 15):
    """Run alerter continuously."""
    logger.info(f"Starting daemon mode (checking every {interval_minutes} minutes)")

    while True:
        try:
            run_once()
        except Exception as e:
            logger.error(f"Error in alerter run: {e}")

        logger.info(f"Sleeping for {interval_minutes} minutes...")
        time.sleep(interval_minutes * 60)


def main():
    parser = argparse.ArgumentParser(description='SafeScoring Incident Alerter')
    parser.add_argument('--daemon', action='store_true', help='Run continuously')
    parser.add_argument('--interval', type=int, default=15, help='Check interval in minutes (daemon mode)')
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_KEY must be configured")
        sys.exit(1)

    if args.daemon:
        run_daemon(args.interval)
    else:
        run_once()


if __name__ == "__main__":
    main()
