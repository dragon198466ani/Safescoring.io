# @safescoring/mcp-server

Model Context Protocol (MCP) server for [SafeScoring](https://safescoring.io) - crypto security scores for AI agents.

## Quick Start

```bash
SAFESCORING_API_KEY=sk_live_xxx npx @safescoring/mcp-server
```

## Claude Desktop Setup

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "safescoring": {
      "command": "npx",
      "args": ["@safescoring/mcp-server"],
      "env": {
        "SAFESCORING_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

Get your API key at [safescoring.io/dashboard/settings](https://safescoring.io/dashboard/settings).

## Available Tools

| Tool | Description |
|------|-------------|
| `safescoring_get_score` | Get SAFE score for a crypto product |
| `safescoring_compare` | Compare two products side-by-side |
| `safescoring_search` | Search for products by name/type |
| `safescoring_leaderboard` | Get top-rated products |
| `safescoring_check_security` | Quick pass/fail security check |

## Available Resources

| URI | Description |
|-----|-------------|
| `safescoring://methodology` | SAFE scoring methodology (4 pillars, 2,354 norms) |

## Example Prompts

Once configured, you can ask Claude:

- "What's the SAFE score for Ledger Nano X?"
- "Compare MetaMask vs Trust Wallet security"
- "What are the top 5 most secure hardware wallets?"
- "Is Aave v3 safe to use? Check with a threshold of 70."
- "Search for DeFi lending protocols and show their scores"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SAFESCORING_API_KEY` | Yes | Your SafeScoring API key |
| `SAFESCORING_BASE_URL` | No | API base URL (default: https://safescoring.io) |

## License

MIT
