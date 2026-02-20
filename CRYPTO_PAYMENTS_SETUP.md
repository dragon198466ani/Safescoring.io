# 🚀 Crypto Payments Setup Guide (NOWPayments)

This guide will help you configure cryptocurrency payments on SafeScoring using NOWPayments.

## 📋 Table of Contents

1. [Why NOWPayments?](#why-nowpayments)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Environment Variables](#environment-variables)
5. [Testing](#testing)
6. [Going Live](#going-live)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Why NOWPayments?

- ✅ **Anonymous** - NOWPayments acts as Merchant of Record (your SASU stays hidden)
- ✅ **Automatic** - Webhooks activate subscriptions instantly
- ✅ **Multi-crypto** - BTC, ETH, USDC (Polygon/BSC), and 300+ cryptocurrencies
- ✅ **Low fees** - 0.5% processing fee
- ✅ **No KYC** - Users don't need to verify identity
- ✅ **Fast** - Payments confirmed within minutes

---

## ✨ Features

### Supported Cryptocurrencies

| Crypto | Network | Symbol | Recommended? | Live Preview |
|--------|---------|--------|--------------|--------------|
| USDC (Polygon) | Polygon | `usdcmatic` | ⭐ **Best** (low fees, stablecoin) | ✅ Yes |
| USDC (BSC) | Binance Smart Chain | `usdcbsc` | ⭐ **Best** (low fees, stablecoin) | ✅ Yes |
| Bitcoin | Bitcoin | `btc` | ✅ Yes (slower confirmations) | ✅ Yes |
| Ethereum | Ethereum | `eth` | ✅ Yes (higher fees) | ✅ Yes |
| Solana | Solana | `sol` | ✅ Yes (fast, low fees) | ✅ Yes |

**Recommendation**: Default to `usdcmatic` (USDC on Polygon) for best user experience.

**New Feature**: Real-time crypto prices displayed on pricing page! Users can see exact amounts in BTC/ETH/SOL before paying.

### User Flow

1. User visits `/pricing`
2. **Sees live crypto prices** for each plan (BTC, ETH, SOL) ⚡ NEW!
3. Clicks "Pay with Crypto" button
4. Selects cryptocurrency (BTC/ETH/SOL/USDC)
5. Enters email
6. Receives payment address and exact amount
7. Sends crypto from their wallet
8. Payment auto-detected within 5 minutes
9. Access granted automatically

### Real-Time Price Display

Each pricing plan now shows live conversion rates:
- **Bitcoin (BTC)** - Updated every 60 seconds
- **Ethereum (ETH)** - Updated every 60 seconds
- **Solana (SOL)** - Updated every 60 seconds

Prices are fetched from CoinGecko API and cached server-side for performance.

---

## 🛠️ Setup Instructions

### Step 1: Create NOWPayments Account

1. Go to [NOWPayments.io](https://nowpayments.io)
2. Sign up for a free account
3. Verify your email

### Step 2: Get API Credentials

1. Log in to [NOWPayments Dashboard](https://account.nowpayments.io)
2. Go to **Settings** → **API Keys**
3. Copy your **API Key**
4. Go to **Settings** → **IPN (Webhooks)**
5. Generate an **IPN Secret**

### Step 3: Configure Payout Wallet

1. In NOWPayments Dashboard, go to **Settings** → **Payout Settings**
2. Add your crypto wallet addresses where you want to receive payments
3. **Recommended wallets:**
   - For USDC (Polygon): Your MetaMask/Ledger Polygon address
   - For BTC: Your hardware wallet (Ledger/Trezor)
   - For ETH: Your MetaMask/Ledger Ethereum address

### Step 4: Set Environment Variables

Create or update your `.env.local` file:

```env
# NOWPayments Configuration
NOWPAYMENTS_API_KEY=your_api_key_here
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here

# Your site URL (for webhooks)
NEXT_PUBLIC_SITE_URL=https://safescoring.com
```

### Step 5: Configure Webhook URL in NOWPayments

1. In NOWPayments Dashboard, go to **Settings** → **IPN (Webhooks)**
2. Set **IPN Callback URL** to:
   ```
   https://safescoring.com/api/webhook/nowpayments
   ```
3. Enable IPN notifications
4. Save settings

### Step 6: Test Locally (Optional)

For local testing, use **ngrok** to expose your localhost:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

Then set the webhook URL in NOWPayments to:
```
https://YOUR_NGROK_URL.ngrok.io/api/webhook/nowpayments
```

---

## 📝 Environment Variables

### Required Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NOWPAYMENTS_API_KEY` | NOWPayments API key | NOWPayments Dashboard → API Keys |
| `NOWPAYMENTS_IPN_SECRET` | Webhook signature secret | NOWPayments Dashboard → IPN Settings |
| `NEXT_PUBLIC_SITE_URL` | Your website URL | Your domain (e.g., `https://safescoring.com`) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`development` or `production`) | `development` |

### Example `.env.local`

```env
# NOWPayments
NOWPAYMENTS_API_KEY=ABC123XYZ789
NOWPAYMENTS_IPN_SECRET=your_secret_key_here

# Site URL
NEXT_PUBLIC_SITE_URL=https://safescoring.com

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Lemon Squeezy (for fiat payments)
LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_key
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

---

## 🧪 Testing

### Test with NOWPayments Sandbox

NOWPayments offers a **sandbox environment** for testing:

1. Use sandbox API: `https://api-sandbox.nowpayments.io/v1`
2. Get sandbox API key from dashboard
3. Test payments with testnet cryptocurrencies

### Test Payment Flow

1. Go to `http://localhost:3000/pricing`
2. Click "Pay with Crypto" on any plan
3. Select USDC (Polygon)
4. Enter test email
5. Note the payment address and amount
6. Send testnet USDC to the address
7. Wait for webhook to fire (~30 seconds)
8. Check database for subscription creation

### Check Database

```sql
-- Check crypto payments
SELECT * FROM crypto_payments ORDER BY created_at DESC LIMIT 10;

-- Check subscriptions
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;

-- Check user access
SELECT id, email, has_access, credits FROM users ORDER BY created_at DESC LIMIT 10;
```

---

## 🚀 Going Live

### Pre-Launch Checklist

- [ ] NOWPayments account verified
- [ ] API keys configured in production `.env`
- [ ] Webhook URL set to production domain
- [ ] Payout wallet addresses configured
- [ ] Test payment completed successfully
- [ ] Database subscriptions table working
- [ ] Legal page updated with crypto payment info ✅ (Already done)

### Launch Steps

1. Deploy to production (Vercel/your hosting)
2. Verify webhook URL is accessible:
   ```bash
   curl https://safescoring.com/api/webhook/nowpayments
   ```
3. Test one real payment with small amount ($1-5)
4. Monitor first payments in NOWPayments dashboard
5. Check user access is granted correctly

### Monitoring

**NOWPayments Dashboard:**
- View all payments
- Track conversion rates
- Monitor failed payments
- Export transaction history

**Your Database:**
```sql
-- Daily crypto payment stats
SELECT
  DATE(created_at) as date,
  COUNT(*) as payments,
  SUM(amount_usdc) as total_usd,
  COUNT(DISTINCT tier) as unique_plans
FROM crypto_payments
WHERE status = 'confirmed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🔧 Troubleshooting

### Payment Not Detected

**Symptoms:**
- User sent crypto but access not granted
- No webhook received

**Solutions:**
1. Check webhook URL in NOWPayments dashboard
2. Verify IPN secret is correct in `.env`
3. Check webhook signature validation
4. Look at Vercel logs for errors
5. Manually check payment status:
   ```bash
   curl -H "x-api-key: YOUR_API_KEY" \
     https://api.nowpayments.io/v1/payment/PAYMENT_ID
   ```

### Wrong Amount Received

**Symptoms:**
- Payment status: `partially_paid`

**Solutions:**
- Contact user via email
- Ask them to send remaining amount
- Or issue refund via NOWPayments dashboard

### Webhook Signature Fails

**Symptoms:**
- Error: "Invalid signature" in logs

**Solutions:**
1. Verify `NOWPAYMENTS_IPN_SECRET` matches dashboard
2. Check webhook is sending raw body (not JSON parsed)
3. Ensure signature header is `x-nowpayments-sig`

### Database Errors

**Symptoms:**
- Payment detected but subscription not created

**Solutions:**
1. Check Supabase connection
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check RLS policies on `subscriptions` table
4. Look at database logs

---

## 📊 Files Created

This crypto payment implementation added the following files:

### Backend (API)
- `web/libs/nowpayments.js` - NOWPayments API helper functions
- `web/app/api/crypto/checkout/route.js` - Create payment endpoint (POST/GET)
- `web/app/api/crypto/prices/route.js` - ⚡ NEW: Real-time crypto prices API
- `web/app/api/webhook/nowpayments/route.js` - Webhook handler for payment confirmations

### Frontend (UI)
- `web/app/checkout/crypto/page.js` - Crypto checkout page (supports BTC/ETH/SOL/USDC)
- `web/components/Pricing.js` - Updated with "Pay with Crypto" button + live prices
- `web/components/CryptoPricePreview.js` - ⚡ NEW: Real-time crypto price display component

### Documentation
- `CRYPTO_PAYMENTS_SETUP.md` - This file
- `web/app/legal/page.js` - Updated with crypto payment info

### Database
- Uses existing table: `crypto_payments` (from `config/web3_migration.sql`)

---

## 🆘 Support

### NOWPayments Support
- Email: support@nowpayments.io
- Docs: https://documenter.getpostman.com/view/7907941/S1a32n38
- Telegram: @NOWPayments_bot

### SafeScoring Support
- Email: safescoring@proton.me
- Check logs in Vercel dashboard
- Review database in Supabase dashboard

---

## 🎉 Success!

Once configured, your users can pay with crypto in just a few clicks:

1. Click "Pay with Crypto"
2. Choose BTC/ETH/USDC
3. Send payment
4. Get instant access (after confirmation)

**No KYC. No signup. Just crypto → access.** 🚀

---

## 📈 Next Steps

### Optional Enhancements

1. **Add more cryptocurrencies**
   - Edit `web/app/checkout/crypto/page.js`
   - Add to `currencies` array

2. **Custom pricing per crypto**
   - Offer discounts for BTC/ETH payments
   - Adjust prices in checkout endpoint

3. **Referral system**
   - Track referrals in `order_id`
   - Grant bonuses for crypto referrals

4. **Email notifications**
   - Send confirmation email on payment
   - Use Resend/SendGrid API

5. **Lifetime access option**
   - Create one-time payment plans
   - Store in `payment_type` = 'one_time'

---

**Ready to accept crypto? Set your environment variables and deploy!** 🚀
