# SafeScoring

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/safescoring/safescoring?style=social)](https://github.com/safescoring/safescoring)
[![CI](https://github.com/safescoring/safescoring/actions/workflows/ci.yml/badge.svg)](https://github.com/safescoring/safescoring/actions/workflows/ci.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

**The open-source security rating system for cryptocurrency products.**

SafeScoring provides objective, transparent security evaluations for hardware wallets, software wallets, DeFi protocols, and more using the SAFE methodology.

[Website](https://safescoring.com) | [Documentation](docs/) | [Contributing](CONTRIBUTING.md) | [License](LICENSE)

---

## Features

- **2159 Security Norms** across 4 pillars (Security, Adversity, Fidelity, Efficiency)
- **21 Product Categories** including hardware wallets, DEX, lending protocols
- **AI-Powered Evaluation** with multi-provider support (DeepSeek, Claude, Gemini)
- **Transparent Methodology** - every norm is publicly documented
- **Self-Hostable** - run your own instance with Docker
- **API Access** - integrate scores into your applications

## SAFE Methodology

| Pillar | Weight | Description |
|--------|--------|-------------|
| **S**ecurity | 25% | Cryptographic standards, key management, authentication |
| **A**dversity | 25% | Incident response, vulnerability handling, resilience |
| **F**idelity | 25% | Transparency, governance, compliance |
| **E**fficiency | 25% | Performance, usability, accessibility |

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/safescoring/safescoring.git
cd safescoring

# Copy environment template
cp config/env_template_free.txt .env

# Edit .env with your credentials (Supabase, API keys)

# Start all services
docker-compose up -d
```

Access:
- Web app: http://localhost:3000
- Admin panel: http://localhost:5000

### Option 2: Manual Installation

#### Prerequisites

- Python 3.10+
- Node.js 18+
- Supabase account (free tier works)

#### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Unix/macOS
# or: .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp config/env_template_free.txt config/.env
# Edit config/.env with your Supabase credentials

# Initialize database (run SQL scripts in Supabase)
# See config/*.sql files

# Start admin panel
python run.py admin
# Open http://localhost:5000
```

#### Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
SafeScoring/
├── src/                    # Python backend
│   ├── core/              # Scoring engine & AI evaluation
│   ├── automation/        # Monthly cron jobs
│   └── web/               # Flask admin panel
├── web/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── libs/              # API, auth, Stripe
├── config/                 # Configuration & SQL schemas
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── docker-compose.yml      # Docker deployment
```

## CLI Commands

```bash
# Calculate SAFE scores
python run.py score

# Run AI evaluation for a product
python run.py evaluate <product_id>

# Start Flask admin
python run.py admin

# Run monthly automation
python run.py cron

# Parallel evaluation
python run_parallel.py
```

## Configuration

### Required Environment Variables

```env
# Supabase (required)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...

# AI Providers (at least one required)
DEEPSEEK_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
GOOGLE_API_KEY=xxx
MISTRAL_API_KEY=xxx
```

### Optional (for web app)

```env
# Authentication
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# Payments
STRIPE_SECRET_KEY=xxx
STRIPE_PUBLIC_KEY=xxx

# Email
RESEND_API_KEY=xxx
```

## API

SafeScoring provides a REST API for accessing scores:

```bash
# Get product score
GET /api/products/{slug}/score

# List all products
GET /api/products

# Get methodology
GET /api/methodology
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- Report bugs and request features
- Improve documentation
- Propose new security norms
- Add support for new product types
- Translate the interface

## License

SafeScoring is dual-licensed:

- **AGPL-3.0** for open source use
- **Commercial License** for proprietary use without copyleft requirements

See [LICENSE](LICENSE) for details.

## Security

Found a vulnerability? Please report it responsibly. See [SECURITY.md](SECURITY.md).

## Support

- [Documentation](docs/)
- [GitHub Issues](https://github.com/safescoring/safescoring/issues)
- [Discord Community](https://discord.gg/safescoring)
- Enterprise support: enterprise@safescoring.com

---

**SafeScoring** - Making crypto security transparent and accessible.

Built with transparency, rigor, and independence.
