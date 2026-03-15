# Contributing to SafeScoring

Thank you for your interest in contributing to SafeScoring! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [SAFE Methodology Contributions](#safe-methodology-contributions)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming and inclusive community.

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (or Supabase account)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SafeScoring.git
   cd SafeScoring
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/safescoring/SafeScoring.git
   ```

## Development Setup

### Backend (Python)

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Unix/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp config/env_template_free.txt config/.env

# Edit .env with your credentials
```

### Frontend (Next.js)

```bash
cd web

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials

# Start development server
npm run dev
```

### Database

1. Create a Supabase project at https://supabase.com
2. Run the SQL scripts in `config/` to set up the schema
3. Update your `.env` files with Supabase credentials

## How to Contribute

### Types of Contributions

We welcome:

- **Bug fixes**: Found a bug? Submit a fix!
- **New features**: Check issues labeled `enhancement`
- **Documentation**: Improve docs, add examples
- **SAFE Methodology**: Propose new norms or improvements
- **Translations**: Help translate the interface
- **Tests**: Increase test coverage

### Finding Issues

- Look for issues labeled `good first issue` for beginners
- Check `help wanted` for issues needing attention
- Review `enhancement` for feature requests

### Creating Issues

Before creating an issue:

1. Search existing issues to avoid duplicates
2. Use the appropriate issue template
3. Provide as much detail as possible

## Pull Request Process

### 1. Create a Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write clear, documented code
- Follow the coding standards below
- Add tests for new functionality
- Update documentation if needed

### 3. Commit

Use conventional commits:

```bash
git commit -m "feat: add new norm category"
git commit -m "fix: resolve score calculation bug"
git commit -m "docs: update API documentation"
```

Prefixes:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Link to related issues
- Screenshots if applicable
- Test results

### 5. Review Process

- Maintainers will review your PR
- Address feedback and make requested changes
- Once approved, your PR will be merged

## Coding Standards

### Python

- Follow PEP 8 style guide
- Use type hints where possible
- Maximum line length: 100 characters
- Use docstrings for functions and classes

```python
def calculate_score(product_id: str, pillar: str) -> float:
    """
    Calculate the SAFE score for a product pillar.

    Args:
        product_id: The unique product identifier
        pillar: One of 'S', 'A', 'F', 'E'

    Returns:
        The calculated score as a percentage (0-100)
    """
    pass
```

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow ESLint configuration
- Use meaningful variable names
- Prefer functional components in React

```typescript
interface ProductScore {
  productId: string;
  pillar: 'S' | 'A' | 'F' | 'E';
  score: number;
}

const calculateScore = (product: ProductScore): number => {
  // Implementation
};
```

### SQL

- Use uppercase for SQL keywords
- Use snake_case for table/column names
- Add comments for complex queries

## SAFE Methodology Contributions

### Proposing New Norms

The SAFE methodology is central to SafeScoring. To propose changes:

1. Open an issue with the `methodology` label
2. Describe the norm clearly:
   - Pillar (Security/Adversity/Fidelity/Efficiency)
   - Category and subcategory
   - Applicable product types
   - Evaluation criteria (YES/NO/N/A)
3. Provide justification and references

### Norm Evaluation Criteria

Norms should be:
- **Objective**: Measurable, not subjective
- **Verifiable**: Can be checked against public information
- **Relevant**: Addresses actual security concerns
- **Clear**: Unambiguous YES/NO answer

## Questions?

- Open a discussion on GitHub
- Join our Discord community
- Email: contributors@safescoring.com

## Contributor License Agreement (CLA)

By submitting a pull request or other contribution to SafeScoring, you agree to the terms of our [Contributor License Agreement (CLA)](CLA.md). Key points:

- You grant SafeScoring a non-exclusive copyright and **patent license** for your contributions
- You retain all rights to your contributions (non-exclusive grant)
- You represent that your contributions are your original work
- You represent that you are not aware of any patent claims that would be infringed

The patent license in the CLA protects SafeScoring and the entire user community from patent trolls who might attempt to claim rights over contributed code. Your first pull request constitutes your electronic signature of the CLA.

For contributions on behalf of an organization, please have an authorized representative email contributors@safescoring.io.

## License

By contributing, you agree that your contributions will be licensed under the project's [dual license](LICENSE), which includes an [Additional Patent Grant](PATENTS.md).

---

Thank you for contributing to SafeScoring! Together, we can make crypto security accessible to everyone.
