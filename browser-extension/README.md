# SafeScoring Browser Extension

Chrome extension that displays security scores for crypto websites you visit.

## Features

- **Popup Score Display**: Click the extension icon to see the SafeScore of any crypto site
- **Floating Badge**: Automatic security badge on known crypto sites
- **Quick Access**: Direct links to full security reports

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The extension icon should appear in your toolbar

## File Structure

```
browser-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Popup UI
├── popup.js           # Popup logic
├── content.js         # Injected script for badge
├── content.css        # Badge styles
├── background.js      # Service worker for caching
└── icons/             # Extension icons
```

## Adding Icons

Create icons in the following sizes:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

Use a simple shield icon with "SS" or the SafeScoring logo.

## Publishing to Chrome Web Store

1. Create a ZIP of the `browser-extension` folder
2. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer fee
4. Upload the ZIP
5. Fill in store listing details
6. Submit for review (usually 1-3 days)

## API Integration

The extension calls:
- `GET https://safescoring.io/api/products/[slug]/score`

Response format:
```json
{
  "slug": "ledger-nano-x",
  "name": "Ledger Nano X",
  "type": "Hardware Wallet",
  "score": 85,
  "scores": {
    "s": 90,
    "a": 82,
    "f": 88,
    "e": 80
  },
  "lastUpdated": "2025-01-01T00:00:00Z"
}
```

## Supported Sites

Pre-mapped domains:
- ledger.com
- trezor.io
- metamask.io
- trustwallet.com
- coinbase.com
- binance.com
- kraken.com
- uniswap.org
- aave.com
- And more...

For unmapped sites, the extension attempts to match by domain name.

## Privacy

- No personal data collected
- Only fetches scores for visited crypto sites
- Cache stored locally only
- No tracking or analytics
