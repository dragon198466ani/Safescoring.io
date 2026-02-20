#!/usr/bin/env python3
"""
SAFESCORING.IO - Code Analyzer Module
Analyzes smart contract code from GitHub for security patterns.

FEATURES:
- Fetch Solidity files from GitHub (free API: 60 req/h unauthenticated)
- Detect common security patterns (reentrancy, access control, etc.)
- Generate security summary for AI evaluation context
- Cache results to avoid rate limiting
"""

import os
import re
import hashlib
import sqlite3
from datetime import datetime, timedelta
from threading import Lock
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# =============================================================================
# CODE CACHE - Persistent cache for analyzed code
# =============================================================================

class CodeCache:
    """SQLite-based cache for code analysis results. TTL: 14 days."""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        cache_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'cache')
        os.makedirs(cache_dir, exist_ok=True)
        self.db_path = os.path.join(cache_dir, 'code_cache.db')
        self._db_lock = Lock()
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS code_cache (
                    repo_hash TEXT PRIMARY KEY,
                    repo_url TEXT NOT NULL,
                    analysis_json TEXT NOT NULL,
                    file_count INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            ''')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_code_expires ON code_cache(expires_at)')
            conn.commit()

    def _hash_url(self, url: str) -> str:
        return hashlib.sha256(url.encode('utf-8')).hexdigest()[:32]

    def get(self, repo_url: str) -> dict:
        """Get cached analysis if exists and not expired."""
        import json
        repo_hash = self._hash_url(repo_url)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        '''SELECT analysis_json FROM code_cache
                           WHERE repo_hash = ? AND expires_at > datetime("now")''',
                        (repo_hash,)
                    )
                    row = cursor.fetchone()
                    if row:
                        return json.loads(row[0])
            except (sqlite3.Error, json.JSONDecodeError):
                pass
        return None

    def set(self, repo_url: str, analysis: dict, ttl_days: int = 14):
        """Cache analysis results."""
        import json
        repo_hash = self._hash_url(repo_url)
        expires_at = datetime.now() + timedelta(days=ttl_days)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO code_cache
                        (repo_hash, repo_url, analysis_json, file_count, expires_at)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (repo_hash, repo_url, json.dumps(analysis), analysis.get('file_count', 0), expires_at))
                    conn.commit()
            except sqlite3.Error:
                pass


# Global cache instance
_code_cache = None

def get_code_cache() -> CodeCache:
    global _code_cache
    if _code_cache is None:
        _code_cache = CodeCache()
    return _code_cache


# =============================================================================
# CODE ANALYZER - Main class for smart contract analysis
# =============================================================================

class CodeAnalyzer:
    """
    Analyzes smart contract code from GitHub.
    Detects security patterns and generates evaluation context.

    Uses GitHub API (60 req/h unauthenticated, 5000/h with token).
    """

    # Security patterns to detect in Solidity code
    SECURITY_PATTERNS = {
        # Reentrancy protection
        'nonReentrant': {
            'pattern': re.compile(r'\bnonReentrant\b', re.I),
            'description': 'ReentrancyGuard modifier detected',
            'category': 'reentrancy',
            'positive': True
        },
        'ReentrancyGuard': {
            'pattern': re.compile(r'import.*ReentrancyGuard|is\s+ReentrancyGuard', re.I),
            'description': 'OpenZeppelin ReentrancyGuard imported',
            'category': 'reentrancy',
            'positive': True
        },

        # Access control
        'onlyOwner': {
            'pattern': re.compile(r'\bonlyOwner\b'),
            'description': 'Owner-only access control',
            'category': 'access_control',
            'positive': True
        },
        'AccessControl': {
            'pattern': re.compile(r'import.*AccessControl|is\s+AccessControl', re.I),
            'description': 'OpenZeppelin AccessControl',
            'category': 'access_control',
            'positive': True
        },
        'Ownable': {
            'pattern': re.compile(r'import.*Ownable|is\s+Ownable', re.I),
            'description': 'OpenZeppelin Ownable',
            'category': 'access_control',
            'positive': True
        },

        # Overflow protection
        'SafeMath': {
            'pattern': re.compile(r'import.*SafeMath|using\s+SafeMath', re.I),
            'description': 'SafeMath library for overflow protection',
            'category': 'overflow',
            'positive': True
        },
        'solidity_08': {
            'pattern': re.compile(r'pragma\s+solidity\s*[\^~>=]*\s*0\.[89]', re.I),
            'description': 'Solidity 0.8+ (built-in overflow checks)',
            'category': 'overflow',
            'positive': True
        },

        # Upgradability
        'Proxy': {
            'pattern': re.compile(r'import.*Proxy|is\s+.*Proxy|delegatecall', re.I),
            'description': 'Proxy pattern (upgradable)',
            'category': 'upgradability',
            'positive': None  # Neutral - depends on implementation
        },
        'initializer': {
            'pattern': re.compile(r'\binitializer\b|\binitialize\b', re.I),
            'description': 'Initializer pattern (for proxies)',
            'category': 'upgradability',
            'positive': None
        },
        'Timelock': {
            'pattern': re.compile(r'Timelock|timelock|TimelockController', re.I),
            'description': 'Timelock for delayed execution',
            'category': 'governance',
            'positive': True
        },

        # Oracle security
        'Chainlink': {
            'pattern': re.compile(r'AggregatorV3Interface|Chainlink|priceFeed', re.I),
            'description': 'Chainlink oracle integration',
            'category': 'oracle',
            'positive': True
        },

        # Emergency controls
        'Pausable': {
            'pattern': re.compile(r'import.*Pausable|is\s+Pausable|\bwhenNotPaused\b', re.I),
            'description': 'Pausable (emergency stop)',
            'category': 'emergency',
            'positive': True
        },

        # Common vulnerabilities (negative patterns)
        'tx_origin': {
            'pattern': re.compile(r'\btx\.origin\b'),
            'description': 'WARNING: tx.origin used (phishing risk)',
            'category': 'vulnerability',
            'positive': False
        },
        'selfdestruct': {
            'pattern': re.compile(r'\bselfdestruct\b|\bsuicide\b', re.I),
            'description': 'WARNING: selfdestruct present',
            'category': 'vulnerability',
            'positive': False
        },
        'assembly': {
            'pattern': re.compile(r'\bassembly\s*\{'),
            'description': 'Inline assembly detected (review needed)',
            'category': 'low_level',
            'positive': None
        },
    }

    # File patterns to analyze
    SOLIDITY_EXTENSIONS = ['.sol']
    IGNORED_DIRS = ['node_modules', 'lib', 'test', 'tests', 'mock', 'mocks', 'scripts']

    def __init__(self, github_token: str = None, use_cache: bool = True):
        """
        Initialize CodeAnalyzer.

        Args:
            github_token: GitHub API token (optional, increases rate limit)
            use_cache: Whether to cache analysis results (default: True)
        """
        self.github_token = github_token or os.environ.get('GITHUB_TOKEN')
        self.use_cache = use_cache
        self.cache = get_code_cache() if use_cache else None

        # HTTP session
        self.session = requests.Session()
        retry_strategy = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("https://", adapter)

        headers = {'Accept': 'application/vnd.github.v3+json'}
        if self.github_token:
            headers['Authorization'] = f'token {self.github_token}'
        self.session.headers.update(headers)

    def analyze_github_repo(self, github_url: str, max_files: int = 20) -> dict:
        """
        Analyze a GitHub repository for security patterns.

        Args:
            github_url: URL to GitHub repository
            max_files: Maximum number of .sol files to analyze

        Returns:
            dict with analysis results
        """
        # Check cache first
        if self.use_cache and self.cache:
            cached = self.cache.get(github_url)
            if cached:
                return cached

        # Parse GitHub URL
        parsed = urlparse(github_url)
        if 'github.com' not in parsed.netloc:
            return {'error': 'Not a GitHub URL', 'files': [], 'patterns': {}}

        path_parts = parsed.path.strip('/').split('/')
        if len(path_parts) < 2:
            return {'error': 'Invalid GitHub URL format', 'files': [], 'patterns': {}}

        owner, repo = path_parts[0], path_parts[1]

        try:
            # Get repository contents
            api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
            r = self.session.get(api_url, timeout=15)

            if r.status_code == 404:
                # Try master branch
                api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
                r = self.session.get(api_url, timeout=15)

            if r.status_code != 200:
                return {'error': f'GitHub API error: {r.status_code}', 'files': [], 'patterns': {}}

            tree = r.json().get('tree', [])

            # Find Solidity files
            sol_files = []
            for item in tree:
                if item['type'] != 'blob':
                    continue
                path = item['path']
                if not any(path.endswith(ext) for ext in self.SOLIDITY_EXTENSIONS):
                    continue
                if any(ignored in path.lower() for ignored in self.IGNORED_DIRS):
                    continue
                sol_files.append(path)

            if not sol_files:
                return {
                    'repo': f"{owner}/{repo}",
                    'file_count': 0,
                    'patterns': {},
                    'summary': 'No Solidity files found in repository'
                }

            # Analyze files (limit to max_files)
            all_patterns = {}
            analyzed_files = []

            for file_path in sol_files[:max_files]:
                content_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
                r = self.session.get(content_url, timeout=10, headers={'Accept': 'application/vnd.github.v3.raw'})

                if r.status_code != 200:
                    continue

                code = r.text
                file_patterns = self._analyze_code(code)

                analyzed_files.append({
                    'path': file_path,
                    'patterns': list(file_patterns.keys())
                })

                # Merge patterns
                for pattern, data in file_patterns.items():
                    if pattern not in all_patterns:
                        all_patterns[pattern] = data
                        all_patterns[pattern]['count'] = 1
                        all_patterns[pattern]['files'] = [file_path]
                    else:
                        all_patterns[pattern]['count'] += 1
                        all_patterns[pattern]['files'].append(file_path)

            # Generate analysis result
            result = {
                'repo': f"{owner}/{repo}",
                'file_count': len(analyzed_files),
                'total_sol_files': len(sol_files),
                'patterns': all_patterns,
                'files': analyzed_files,
                'summary': self._generate_summary(all_patterns),
                'security_score': self._calculate_security_score(all_patterns)
            }

            # Cache result
            if self.use_cache and self.cache:
                self.cache.set(github_url, result)

            return result

        except Exception as e:
            return {'error': str(e), 'files': [], 'patterns': {}}

    def _analyze_code(self, code: str) -> dict:
        """Analyze Solidity code for security patterns."""
        found_patterns = {}

        for name, config in self.SECURITY_PATTERNS.items():
            if config['pattern'].search(code):
                found_patterns[name] = {
                    'description': config['description'],
                    'category': config['category'],
                    'positive': config['positive']
                }

        return found_patterns

    def _calculate_security_score(self, patterns: dict) -> dict:
        """Calculate security assessment from patterns."""
        score = {
            'reentrancy': 'unknown',
            'access_control': 'unknown',
            'overflow': 'unknown',
            'oracle': 'unknown',
            'emergency': 'unknown',
            'vulnerabilities': []
        }

        for name, data in patterns.items():
            category = data['category']
            positive = data['positive']

            if category == 'vulnerability' and positive is False:
                score['vulnerabilities'].append(data['description'])
            elif category == 'reentrancy' and positive:
                score['reentrancy'] = 'protected'
            elif category == 'access_control' and positive:
                score['access_control'] = 'present'
            elif category == 'overflow' and positive:
                score['overflow'] = 'protected'
            elif category == 'oracle' and positive:
                score['oracle'] = 'chainlink'
            elif category == 'emergency' and positive:
                score['emergency'] = 'pausable'

        return score

    def _generate_summary(self, patterns: dict) -> str:
        """Generate human-readable security summary."""
        positive = []
        negative = []
        neutral = []

        for name, data in patterns.items():
            desc = data['description']
            if data['positive'] is True:
                positive.append(f"+ {desc}")
            elif data['positive'] is False:
                negative.append(f"- {desc}")
            else:
                neutral.append(f"? {desc}")

        parts = []
        if positive:
            parts.append("SECURITY FEATURES:\n" + "\n".join(positive))
        if negative:
            parts.append("CONCERNS:\n" + "\n".join(negative))
        if neutral:
            parts.append("REVIEW NEEDED:\n" + "\n".join(neutral))

        return "\n\n".join(parts) if parts else "No notable security patterns detected"

    def format_for_evaluation(self, analysis: dict) -> str:
        """
        Format analysis for AI evaluation context.

        Args:
            analysis: Result from analyze_github_repo()

        Returns:
            Formatted string for AI prompt
        """
        if analysis.get('error'):
            return f"[CODE ANALYSIS ERROR] {analysis['error']}"

        if analysis.get('file_count', 0) == 0:
            return "[CODE ANALYSIS] No Solidity files found"

        parts = [
            f"=== CODE ANALYSIS ({analysis['repo']}) ===",
            f"Files analyzed: {analysis['file_count']}/{analysis.get('total_sol_files', '?')} .sol files",
            "",
            analysis.get('summary', 'No patterns detected')
        ]

        # Add security score summary
        score = analysis.get('security_score', {})
        if score:
            score_parts = []
            if score.get('reentrancy') == 'protected':
                score_parts.append("Reentrancy: PROTECTED")
            if score.get('access_control') == 'present':
                score_parts.append("Access Control: PRESENT")
            if score.get('overflow') == 'protected':
                score_parts.append("Overflow: PROTECTED")
            if score.get('oracle') == 'chainlink':
                score_parts.append("Oracle: CHAINLINK")
            if score.get('emergency') == 'pausable':
                score_parts.append("Emergency: PAUSABLE")
            if score.get('vulnerabilities'):
                score_parts.append(f"WARNINGS: {len(score['vulnerabilities'])} potential issues")

            if score_parts:
                parts.append("")
                parts.append("SECURITY ASSESSMENT:")
                parts.extend([f"  {s}" for s in score_parts])

        return "\n".join(parts)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def analyze_github_url(url: str) -> str:
    """
    Quick analysis of a GitHub URL, returns formatted string.

    Args:
        url: GitHub repository URL

    Returns:
        Formatted analysis string for AI context
    """
    analyzer = CodeAnalyzer()
    result = analyzer.analyze_github_repo(url)
    return analyzer.format_for_evaluation(result)


# Global instance
code_analyzer = CodeAnalyzer()
