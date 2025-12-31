# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at SafeScoring. If you discover a security vulnerability, please follow these guidelines:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it's fixed
- Exploit the vulnerability beyond what's necessary to demonstrate it

### Do

1. **Email us directly**: security@safescoring.com
2. **Include details**:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Allow time**: Give us reasonable time to respond and fix the issue

### What to Expect

| Timeline | Action |
| --- | --- |
| 24 hours | Acknowledgment of your report |
| 72 hours | Initial assessment and response |
| 7-30 days | Fix development and testing |
| Post-fix | Public disclosure (coordinated with you) |

## Security Best Practices

When running SafeScoring:

### Environment Variables

Never commit sensitive credentials:

```bash
# Bad - never do this
SUPABASE_KEY=eyJ...

# Good - use environment variables
SUPABASE_KEY=${SUPABASE_KEY}
```

### API Keys

- Rotate keys regularly
- Use different keys for development/production
- Set appropriate rate limits
- Monitor for unusual activity

### Database

- Enable Row Level Security (RLS) in Supabase
- Use prepared statements (already implemented)
- Limit database user permissions
- Regular backups

### Deployment

- Use HTTPS only
- Enable CORS appropriately
- Set secure cookie flags
- Use Content Security Policy headers

## Known Security Considerations

### AI API Keys

SafeScoring uses multiple AI providers. Ensure:
- API keys are stored securely in environment variables
- Rate limiting is configured
- Usage is monitored for anomalies

### Web Scraping

The scraper component (`src/core/scraper.py`) accesses external websites:
- Only scrape public information
- Respect robots.txt
- Implement rate limiting
- Validate all scraped data

### User Authentication

NextAuth handles authentication:
- Session tokens are properly secured
- CSRF protection is enabled
- Password policies are enforced (if applicable)

## Bug Bounty

We appreciate security researchers helping us keep SafeScoring secure. While we don't currently have a formal bug bounty program, we:

- Acknowledge security researchers in our release notes
- May offer rewards for critical vulnerabilities at our discretion
- Will work with you on responsible disclosure

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed. Subscribe to:

- GitHub releases for notifications
- Our security mailing list (coming soon)

## Contact

- Security issues: security@safescoring.com
- General questions: hello@safescoring.com
- PGP key: Available on request

---

Thank you for helping keep SafeScoring and its users safe!
