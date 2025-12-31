# Changelog

All notable changes to SafeScoring will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Open source release with AGPL-3.0 + Commercial dual license
- Contributing guidelines (CONTRIBUTING.md)
- Code of Conduct (CODE_OF_CONDUCT.md)
- Security policy (SECURITY.md)
- Docker Compose configuration for easy deployment
- GitHub Actions CI/CD workflows
- Comprehensive .gitignore

### Changed
- Improved documentation for self-hosting

### Security
- Removed hardcoded credentials from worker.py
- Added environment variable templates

---

## [1.0.0] - 2025-01-XX

### Added
- **SAFE Methodology**: Complete framework with 916 norms across 4 pillars
  - Security (S): Cryptographic standards, key management, authentication
  - Adversity (A): Incident response, vulnerability handling, resilience
  - Fidelity (F): Transparency, governance, compliance
  - Efficiency (E): Performance, usability, accessibility
- **Multi-AI Evaluation Engine**: Support for multiple AI providers
  - DeepSeek (primary)
  - Claude (Anthropic)
  - Gemini (Google)
  - Ollama (local)
  - Mistral
- **Product Types**: Support for 21 crypto product categories
  - Hardware wallets
  - Software wallets (mobile, desktop, browser)
  - DeFi protocols (DEX, lending, bridges)
  - Smart contract platforms
- **Web Application**: Next.js frontend with
  - Product browsing and search
  - Detailed score breakdowns
  - User authentication (NextAuth + Supabase)
  - Stripe subscription management
- **Admin Interface**: Flask-based administration
  - Product management
  - Norm evaluation
  - Score calculation
- **Automation**: Monthly automated re-evaluation
  - Parallel processing with workers
  - Incremental updates
  - Score history tracking
- **API**: RESTful API for score access
- **Documentation**: Comprehensive methodology documentation

### Technical Stack
- Backend: Python 3.10+ with Flask
- Frontend: Next.js 15 with React 19
- Database: Supabase (PostgreSQL)
- Payments: Stripe
- Email: Resend
- AI: Multi-provider support

---

## Version History

### Pre-release Development

#### v0.9.0 - Beta Release
- Initial public beta
- Core scoring engine
- Basic web interface

#### v0.8.0 - MOAT Integration
- Added MOAT (Method of Approach Technology) analysis
- Multi-type product support

#### v0.7.0 - SAFE Methodology v7
- Final methodology refinements
- 916 norms finalized
- Excel export (SAFE_SCORING_V7_FINAL.xlsx)

#### v0.6.0 - Smart Evaluator
- AI-powered evaluation system
- Automatic applicability detection

#### v0.5.0 - Automation
- Monthly cron jobs
- Parallel evaluation

#### v0.4.0 - Web Frontend
- Next.js application
- User authentication
- Stripe integration

#### v0.3.0 - Flask Admin
- Administrative interface
- Manual evaluation tools

#### v0.2.0 - Core Engine
- Scoring calculation
- Database schema

#### v0.1.0 - Initial Concept
- SAFE methodology design
- Norm definition framework

---

## Upgrade Notes

### From Pre-release to 1.0.0

1. **Environment Variables**: Update your `.env` file with new variables
2. **Database Migration**: Run new SQL scripts in `config/`
3. **Dependencies**: Update Python and Node.js dependencies
4. **Configuration**: Review `web/config.js` for new options

---

[Unreleased]: https://github.com/safescoring/safescoring/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/safescoring/safescoring/releases/tag/v1.0.0
