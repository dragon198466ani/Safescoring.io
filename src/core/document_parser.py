#!/usr/bin/env python3
"""
SAFESCORING.IO - Document Parser Module
Extracts text from PDFs (audits, whitepapers, documentation).

FEATURES:
- PDF text extraction via pdfplumber (free)
- Audit report finding extraction
- Intelligent summarization for AI context
- Caching to avoid re-downloading
"""

import os
import re
import hashlib
import tempfile
from datetime import datetime, timedelta
from threading import Lock
import sqlite3

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    print("[WARNING] pdfplumber not installed. PDF extraction disabled.")
    print("         Install with: pip install pdfplumber")

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# =============================================================================
# PDF CACHE - Persistent cache for extracted PDF content
# =============================================================================

class PDFCache:
    """SQLite-based cache for extracted PDF content. TTL: 30 days."""

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
        self.db_path = os.path.join(cache_dir, 'pdf_cache.db')
        self._db_lock = Lock()
        self._init_db()

    def _init_db(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS pdf_cache (
                    url_hash TEXT PRIMARY KEY,
                    url TEXT NOT NULL,
                    text_content TEXT NOT NULL,
                    page_count INTEGER,
                    findings_json TEXT,
                    pdf_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            ''')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_pdf_expires ON pdf_cache(expires_at)')
            conn.commit()

    def _hash_url(self, url: str) -> str:
        return hashlib.sha256(url.encode('utf-8')).hexdigest()[:32]

    def get(self, url: str) -> dict:
        """Get cached PDF extraction if exists and not expired."""
        url_hash = self._hash_url(url)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute(
                        '''SELECT text_content, page_count, findings_json, pdf_type
                           FROM pdf_cache
                           WHERE url_hash = ? AND expires_at > datetime("now")''',
                        (url_hash,)
                    )
                    row = cursor.fetchone()
                    if row:
                        return {
                            'text': row[0],
                            'pages': row[1],
                            'findings': row[2],
                            'type': row[3]
                        }
            except sqlite3.Error:
                pass
        return None

    def set(self, url: str, text: str, pages: int, findings: str = None, pdf_type: str = None, ttl_days: int = 30):
        """Cache extracted PDF content."""
        url_hash = self._hash_url(url)
        expires_at = datetime.now() + timedelta(days=ttl_days)
        with self._db_lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute('''
                        INSERT OR REPLACE INTO pdf_cache
                        (url_hash, url, text_content, page_count, findings_json, pdf_type, expires_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (url_hash, url, text, pages, findings, pdf_type, expires_at))
                    conn.commit()
            except sqlite3.Error:
                pass


# Global cache instance
_pdf_cache = None

def get_pdf_cache() -> PDFCache:
    global _pdf_cache
    if _pdf_cache is None:
        _pdf_cache = PDFCache()
    return _pdf_cache


# =============================================================================
# DOCUMENT PARSER - Main class for PDF extraction
# =============================================================================

class DocumentParser:
    """
    Extracts and analyzes PDF documents.
    Specialized for audit reports and whitepapers.
    """

    # Known audit firm patterns
    AUDIT_FIRMS = [
        'trail of bits', 'openzeppelin', 'certik', 'halborn',
        'consensys diligence', 'quantstamp', 'peckshield', 'slowmist',
        'chainsecurity', 'sigma prime', 'runtime verification',
        'least authority', 'zellic', 'spearbit', 'code4rena',
        'sherlock', 'immunefi', 'hacken', 'kudelski security'
    ]

    # Severity patterns for audit findings
    SEVERITY_PATTERNS = {
        'critical': re.compile(r'\b(critical|severity[:\s]*critical|P0|C\d+)\b', re.I),
        'high': re.compile(r'\b(high|severity[:\s]*high|P1|H\d+)\b', re.I),
        'medium': re.compile(r'\b(medium|med|severity[:\s]*medium|P2|M\d+)\b', re.I),
        'low': re.compile(r'\b(low|severity[:\s]*low|informational|info|P3|L\d+)\b', re.I),
    }

    # Status patterns for findings
    STATUS_PATTERNS = {
        'fixed': re.compile(r'\b(fixed|resolved|remediated|addressed|closed)\b', re.I),
        'acknowledged': re.compile(r'\b(acknowledged|accepted|won\'t fix|wontfix)\b', re.I),
        'pending': re.compile(r'\b(pending|open|unresolved|in progress)\b', re.I),
    }

    def __init__(self, use_cache: bool = True):
        self.use_cache = use_cache
        self.cache = get_pdf_cache() if use_cache else None

        # HTTP session with retry
        self.session = requests.Session()
        retry_strategy = Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def extract_pdf(self, url: str, max_chars: int = 50000) -> dict:
        """
        Download and extract text from a PDF.

        Args:
            url: URL of the PDF document
            max_chars: Maximum characters to extract

        Returns:
            dict with 'text', 'pages', 'type', 'findings' (if audit)
        """
        if not PDF_AVAILABLE:
            return {'text': '', 'pages': 0, 'type': 'unknown', 'error': 'pdfplumber not installed'}

        # Check cache first
        if self.use_cache and self.cache:
            cached = self.cache.get(url)
            if cached:
                return cached

        try:
            # Download PDF
            r = self.session.get(url, timeout=30, stream=True)
            if r.status_code != 200:
                return {'text': '', 'pages': 0, 'type': 'unknown', 'error': f'HTTP {r.status_code}'}

            # Check content type
            content_type = r.headers.get('content-type', '')
            if 'pdf' not in content_type.lower() and not url.lower().endswith('.pdf'):
                return {'text': '', 'pages': 0, 'type': 'unknown', 'error': 'Not a PDF'}

            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                for chunk in r.iter_content(chunk_size=8192):
                    tmp.write(chunk)
                tmp_path = tmp.name

            # Extract text with pdfplumber
            text_parts = []
            page_count = 0

            try:
                with pdfplumber.open(tmp_path) as pdf:
                    page_count = len(pdf.pages)
                    for i, page in enumerate(pdf.pages):
                        if len('\n'.join(text_parts)) >= max_chars:
                            break
                        page_text = page.extract_text() or ''
                        if page_text.strip():
                            text_parts.append(f"[Page {i+1}]\n{page_text}")
            finally:
                # Cleanup temp file
                try:
                    os.unlink(tmp_path)
                except:
                    pass

            full_text = '\n\n'.join(text_parts)[:max_chars]

            # Detect PDF type
            pdf_type = self._detect_pdf_type(url, full_text)

            # Extract findings if audit report
            findings = None
            if pdf_type == 'audit':
                findings = self._extract_audit_findings(full_text)

            result = {
                'text': full_text,
                'pages': page_count,
                'type': pdf_type,
                'findings': findings
            }

            # Cache result
            if self.use_cache and self.cache and full_text:
                import json
                findings_json = json.dumps(findings) if findings else None
                self.cache.set(url, full_text, page_count, findings_json, pdf_type)

            return result

        except Exception as e:
            return {'text': '', 'pages': 0, 'type': 'unknown', 'error': str(e)}

    def _detect_pdf_type(self, url: str, text: str) -> str:
        """Detect the type of PDF document."""
        url_lower = url.lower()
        text_lower = text.lower()[:5000]  # Check first 5000 chars

        # Check URL first
        if any(kw in url_lower for kw in ['audit', 'security-review', 'pentest', 'assessment']):
            return 'audit'
        if any(kw in url_lower for kw in ['whitepaper', 'white-paper', 'litepaper']):
            return 'whitepaper'
        if any(kw in url_lower for kw in ['technical', 'specification', 'spec']):
            return 'technical'

        # Check content
        if any(firm in text_lower for firm in self.AUDIT_FIRMS):
            return 'audit'
        if any(kw in text_lower for kw in ['security audit', 'audit report', 'vulnerability assessment', 'penetration test']):
            return 'audit'
        if any(kw in text_lower for kw in ['abstract', 'introduction', 'tokenomics', 'token economics']):
            return 'whitepaper'

        return 'documentation'

    def _extract_audit_findings(self, text: str) -> dict:
        """Extract structured findings from audit report text."""
        findings = {
            'auditor': None,
            'date': None,
            'severity_counts': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0},
            'status_counts': {'fixed': 0, 'acknowledged': 0, 'pending': 0},
            'sample_findings': []
        }

        text_lower = text.lower()

        # Detect auditor
        for firm in self.AUDIT_FIRMS:
            if firm in text_lower:
                findings['auditor'] = firm.title()
                break

        # Extract date (various formats)
        date_patterns = [
            r'(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}',
            r'\d{1,2}[/-]\d{1,2}[/-]\d{4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                findings['date'] = match.group(0)
                break

        # Count severities (look for patterns throughout document)
        for severity, pattern in self.SEVERITY_PATTERNS.items():
            matches = pattern.findall(text)
            findings['severity_counts'][severity] = len(matches)

        # Count statuses
        for status, pattern in self.STATUS_PATTERNS.items():
            matches = pattern.findall(text)
            findings['status_counts'][status] = len(matches)

        # Extract sample finding titles (look for common patterns)
        finding_patterns = [
            r'(?:finding|issue|vulnerability)[:\s#]*\d*[:\s]*([^\n]{10,100})',
            r'(?:critical|high|medium|low)[:\s]*([^\n]{10,100})',
        ]
        for pattern in finding_patterns:
            matches = re.findall(pattern, text, re.I)
            for match in matches[:5]:  # Max 5 sample findings
                clean_title = match.strip()
                if clean_title and clean_title not in findings['sample_findings']:
                    findings['sample_findings'].append(clean_title)

        return findings

    def format_for_evaluation(self, pdf_results: list) -> str:
        """
        Format extracted PDF content for AI evaluation context.

        Args:
            pdf_results: List of extract_pdf() results

        Returns:
            Formatted string for AI prompt
        """
        if not pdf_results:
            return ""

        sections = []

        for result in pdf_results:
            if not result.get('text'):
                continue

            pdf_type = result.get('type', 'document')

            if pdf_type == 'audit' and result.get('findings'):
                findings = result['findings']
                section = f"=== AUDIT REPORT ==="
                if findings.get('auditor'):
                    section += f"\nAuditor: {findings['auditor']}"
                if findings.get('date'):
                    section += f"\nDate: {findings['date']}"

                sev = findings.get('severity_counts', {})
                section += f"\nFindings: {sev.get('critical', 0)} Critical, {sev.get('high', 0)} High, {sev.get('medium', 0)} Medium, {sev.get('low', 0)} Low"

                status = findings.get('status_counts', {})
                total_fixed = status.get('fixed', 0)
                total_issues = sum(sev.values())
                if total_issues > 0:
                    fix_rate = (total_fixed / total_issues) * 100
                    section += f"\nRemediation: {total_fixed}/{total_issues} ({fix_rate:.0f}% fixed)"

                if findings.get('sample_findings'):
                    section += "\nSample Issues:"
                    for finding in findings['sample_findings'][:3]:
                        section += f"\n  - {finding[:80]}"

                section += f"\n\n[Full Report Excerpt]\n{result['text'][:8000]}"
                sections.append(section)

            elif pdf_type == 'whitepaper':
                sections.append(f"=== WHITEPAPER ===\n{result['text'][:10000]}")

            else:
                sections.append(f"=== DOCUMENTATION (PDF) ===\n{result['text'][:8000]}")

        return '\n\n'.join(sections)

    def summarize_for_ai(self, text: str, max_chars: int = 5000) -> str:
        """
        Intelligently summarize PDF text for AI context.
        Prioritizes security-relevant sections.
        """
        if len(text) <= max_chars:
            return text

        # Keywords indicating important sections
        important_keywords = [
            'security', 'vulnerability', 'audit', 'finding', 'risk',
            'critical', 'high', 'recommendation', 'cryptograph',
            'encryption', 'key management', 'access control', 'authentication'
        ]

        # Split into paragraphs
        paragraphs = text.split('\n\n')
        scored_paragraphs = []

        for para in paragraphs:
            para = para.strip()
            if len(para) < 50:
                continue

            # Score based on keyword presence
            score = sum(1 for kw in important_keywords if kw.lower() in para.lower())
            scored_paragraphs.append((score, para))

        # Sort by score (descending) and take best paragraphs
        scored_paragraphs.sort(key=lambda x: x[0], reverse=True)

        result = []
        total_chars = 0

        for score, para in scored_paragraphs:
            if total_chars + len(para) > max_chars:
                break
            result.append(para)
            total_chars += len(para) + 2

        return '\n\n'.join(result)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def extract_pdfs_from_urls(urls: list, max_per_pdf: int = 30000) -> list:
    """
    Extract text from multiple PDF URLs.

    Args:
        urls: List of PDF URLs
        max_per_pdf: Max chars per PDF

    Returns:
        List of extraction results
    """
    parser = DocumentParser()
    results = []

    for url in urls[:5]:  # Max 5 PDFs
        print(f"   Extracting PDF: {url[:60]}...")
        result = parser.extract_pdf(url, max_chars=max_per_pdf)
        if result.get('text'):
            print(f"   -> {result['pages']} pages, {len(result['text'])} chars ({result['type']})")
            results.append(result)
        else:
            error = result.get('error', 'Unknown error')
            print(f"   -> Failed: {error}")

    return results


# Global instance
document_parser = DocumentParser()
