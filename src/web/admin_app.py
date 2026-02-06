#!/usr/bin/env python3
"""
SAFESCORING.IO - Admin Interface
Web interface for adding products/norms with automatic calculation
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, g
from functools import wraps
import requests
import os
import hashlib
import secrets
from datetime import datetime

# Configuration
def load_config():
    config = {}
    # Try multiple config file locations
    config_paths = [
        os.path.join(os.path.dirname(__file__), 'env_template_free.txt'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'env_template_free.txt'),
    ]
    for config_path in config_paths:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip()
    return config

CONFIG = load_config()
SUPABASE_URL = CONFIG.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = CONFIG.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

# Validate required configuration
if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_KEY in config. Admin panel cannot start.")

app = Flask(__name__)
# SECURITY: Use environment variable for secret key, with a random fallback
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

# SECURITY: Session cookie settings
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)
if os.environ.get('FLASK_ENV') == 'production':
    app.config['SESSION_COOKIE_SECURE'] = True

# =============================================================================
# ADMIN AUTHENTICATION
# =============================================================================
# Admin credentials - MUST be set via environment variables
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', '')

# If no password hash is set, generate a temporary one and print it
if not ADMIN_PASSWORD_HASH:
    _temp_password = secrets.token_urlsafe(16)
    ADMIN_PASSWORD_HASH = hashlib.sha256(_temp_password.encode()).hexdigest()
    print(f"[SECURITY] No ADMIN_PASSWORD_HASH set. Temporary password: {_temp_password}")
    print(f"[SECURITY] Set ADMIN_PASSWORD_HASH={ADMIN_PASSWORD_HASH} in your environment")


def check_password(password):
    """Verify password against stored hash (timing-safe comparison)"""
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    return secrets.compare_digest(password_hash, ADMIN_PASSWORD_HASH)


def login_required(f):
    """Decorator to require authentication on admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_authenticated'):
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Admin login page"""
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        if username == ADMIN_USERNAME and check_password(password):
            session['admin_authenticated'] = True
            session.permanent = True
            next_url = request.args.get('next', url_for('index'))
            return redirect(next_url)
        error = "Invalid credentials"
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    """Admin logout"""
    session.clear()
    return redirect(url_for('login'))

# Headers Supabase
def get_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }


# ============== PAGES ==============

@app.route('/')
@login_required
def index():
    """Home page"""
    return render_template('index.html')


@app.route('/products')
@login_required
def products_list():
    """Product list"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=*,product_types(name),brands(name)&order=name.asc",
        headers=get_headers()
    )
    products = r.json() if r.status_code == 200 else []
    return render_template('products.html', products=products)


@app.route('/products/add', methods=['GET', 'POST'])
@login_required
def add_product():
    """Add product form"""
    if request.method == 'POST':
        data = {
            'name': request.form['name'],
            'slug': request.form['name'].lower().replace(' ', '-'),
            'description': request.form.get('description', ''),
            'type_id': int(request.form['type_id']) if request.form.get('type_id') else None,
            'brand_id': int(request.form['brand_id']) if request.form.get('brand_id') else None,
            'url': request.form.get('url', ''),
            'created_at': datetime.now().isoformat()
        }
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/products",
            headers=get_headers(),
            json=data
        )
        
        if r.status_code == 201:
            product = r.json()[0]
            # Create evaluations automatically
            create_evaluations_for_product(product['id'], product.get('type_id'))
            return redirect(url_for('evaluate_product', product_id=product['id']))
        
        return render_template('add_product.html', error=r.text, types=get_types(), brands=get_brands())
    
    return render_template('add_product.html', types=get_types(), brands=get_brands())


@app.route('/products/<int:product_id>/evaluate', methods=['GET', 'POST'])
@login_required
def evaluate_product(product_id):
    """Product evaluation form"""
    if request.method == 'POST':
        # Save evaluations
        evaluations = []
        for key, value in request.form.items():
            if key.startswith('norm_'):
                norm_id = int(key.replace('norm_', ''))
                evaluations.append({
                    'product_id': product_id,
                    'norm_id': norm_id,
                    'result': value,
                    'evaluated_by': 'admin_form',
                    'evaluation_date': datetime.now().strftime('%Y-%m-%d')
                })
        
        if evaluations:
            # Delete old evaluations
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}",
                headers=get_headers()
            )
            
            # Insert new ones
            requests.post(
                f"{SUPABASE_URL}/rest/v1/evaluations",
                headers=get_headers(),
                json=evaluations
            )
        
        # Calculate score
        score = calculate_product_score(product_id)
        
        return redirect(url_for('product_detail', product_id=product_id))
    
    # GET: Display form
    product = get_product(product_id)
    norms = get_applicable_norms(product.get('type_id'))
    existing_evals = get_product_evaluations(product_id)
    
    return render_template('evaluate_product.html', 
                          product=product, 
                          norms=norms, 
                          evaluations=existing_evals)


@app.route('/products/<int:product_id>')
@login_required
def product_detail(product_id):
    """Product detail with score"""
    product = get_product(product_id)
    score = calculate_product_score(product_id)
    evaluations = get_product_evaluations(product_id)
    
    return render_template('product_detail.html', 
                          product=product, 
                          score=score,
                          evaluations=evaluations)


@app.route('/norms')
@login_required
def norms_list():
    """Norms list"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=*&order=code.asc",
        headers=get_headers()
    )
    norms = r.json() if r.status_code == 200 else []
    return render_template('norms.html', norms=norms)


@app.route('/norms/add', methods=['GET', 'POST'])
@login_required
def add_norm():
    """Add norm form"""
    if request.method == 'POST':
        data = {
            'code': request.form['code'].upper(),
            'pillar': request.form['pillar'].upper(),
            'title': request.form['title'],
            'description': request.form.get('description', ''),
            'is_essential': request.form.get('is_essential') == 'on',
            'consumer': request.form.get('consumer') == 'on',
            'full': True,
            'access_type': request.form.get('access_type', 'G'),
            'official_link': request.form.get('official_link', ''),
            'created_at': datetime.now().isoformat()
        }
        
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/norms",
            headers=get_headers(),
            json=data
        )
        
        if r.status_code == 201:
            norm = r.json()[0]
            # Create applicability for selected types
            type_ids = request.form.getlist('applicable_types')
            if type_ids:
                create_norm_applicability(norm['id'], type_ids)
            return redirect(url_for('norms_list'))
        
        return render_template('add_norm.html', error=r.text, types=get_types())
    
    return render_template('add_norm.html', types=get_types())


# ============== API ENDPOINTS ==============

@app.route('/api/calculate-score/<int:product_id>')
@login_required
def api_calculate_score(product_id):
    """API: Calculates and returns product score"""
    score = calculate_product_score(product_id)
    return jsonify(score)


@app.route('/api/products')
def api_products():
    """API: Product list with scores"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=id,name,type_id",
        headers=get_headers()
    )
    products = r.json() if r.status_code == 200 else []
    
    # Add scores
    for p in products:
        score = calculate_product_score(p['id'])
        p['score'] = score.get('global_score') if score else None
    
    return jsonify(products)


@app.route('/api/norms')
def api_norms():
    """API: Norms list"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,code,title,pillar,is_essential",
        headers=get_headers()
    )
    return jsonify(r.json() if r.status_code == 200 else [])


# ============== HELPERS ==============

def get_types():
    """Gets product types"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/product_types?select=id,code,name&order=code.asc",
        headers=get_headers()
    )
    return r.json() if r.status_code == 200 else []


def get_brands():
    """Gets brands"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/brands?select=id,name&order=name.asc",
        headers=get_headers()
    )
    return r.json() if r.status_code == 200 else []


def get_product(product_id):
    """Gets a product"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=*,product_types(name,code),brands(name)",
        headers=get_headers()
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]
    return None


def get_applicable_norms(type_id):
    """Gets applicable norms for a type"""
    if not type_id:
        # If no type, return all norms
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/norms?select=*&order=code.asc",
            headers=get_headers()
        )
        return r.json() if r.status_code == 200 else []
    
    # Get applicable norms
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norm_applicability?type_id=eq.{type_id}&is_applicable=eq.true&select=norm_id,norms(*)",
        headers=get_headers()
    )
    
    if r.status_code == 200:
        return [item['norms'] for item in r.json() if item.get('norms')]
    return []


def get_product_evaluations(product_id):
    """Gets product evaluations"""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result",
        headers=get_headers()
    )
    if r.status_code == 200:
        return {e['norm_id']: e['result'] for e in r.json()}
    return {}


def create_evaluations_for_product(product_id, type_id):
    """Creates empty evaluations for a new product"""
    norms = get_applicable_norms(type_id)
    
    evaluations = []
    for norm in norms:
        evaluations.append({
            'product_id': product_id,
            'norm_id': norm['id'],
            'result': 'N/A',
            'evaluated_by': 'auto_init',
            'evaluation_date': datetime.now().strftime('%Y-%m-%d')
        })
    
    if evaluations:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers=get_headers(),
            json=evaluations
        )


def create_norm_applicability(norm_id, type_ids):
    """Creates norm applicability for selected types"""
    applicability = []
    for type_id in type_ids:
        applicability.append({
            'norm_id': norm_id,
            'type_id': int(type_id),
            'is_applicable': True
        })
    
    if applicability:
        requests.post(
            f"{SUPABASE_URL}/rest/v1/norm_applicability",
            headers=get_headers(),
            json=applicability
        )


def calculate_product_score(product_id):
    """Calculates SAFE score for a product"""
    # Get norms
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/norms?select=id,pillar,is_essential",
        headers=get_headers()
    )
    norms = {n['id']: n for n in r.json()} if r.status_code == 200 else {}
    
    # Get evaluations
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/evaluations?product_id=eq.{product_id}&select=norm_id,result",
        headers=get_headers()
    )
    evaluations = r.json() if r.status_code == 200 else []
    
    if not evaluations:
        return None
    
    # Calculate by pillar
    pillar_stats = {
        'S': {'yes': 0, 'no': 0, 'na': 0},
        'A': {'yes': 0, 'no': 0, 'na': 0},
        'F': {'yes': 0, 'no': 0, 'na': 0},
        'E': {'yes': 0, 'no': 0, 'na': 0}
    }
    
    for eval in evaluations:
        norm = norms.get(eval['norm_id'])
        if not norm:
            continue
        
        pillar = norm.get('pillar', 'S')
        if pillar not in pillar_stats:
            pillar = 'S'
        
        result = eval.get('result', 'N/A').upper()
        
        if result == 'YES':
            pillar_stats[pillar]['yes'] += 1
        elif result == 'NO':
            pillar_stats[pillar]['no'] += 1
        else:
            pillar_stats[pillar]['na'] += 1
    
    # Calculate scores
    pillar_weights = {'S': 0.35, 'A': 0.25, 'F': 0.20, 'E': 0.20}
    pillar_scores = {}
    
    for pillar, stats in pillar_stats.items():
        applicable = stats['yes'] + stats['no']
        if applicable > 0:
            pillar_scores[pillar] = round((stats['yes'] / applicable) * 100, 1)
        else:
            pillar_scores[pillar] = None
    
    # Global score
    total_weight = 0
    weighted_sum = 0
    
    for pillar, weight in pillar_weights.items():
        if pillar_scores.get(pillar) is not None:
            weighted_sum += pillar_scores[pillar] * weight
            total_weight += weight
    
    global_score = round(weighted_sum / total_weight, 1) if total_weight > 0 else None
    
    return {
        'global_score': global_score,
        'security_score': pillar_scores.get('S'),
        'accessibility_score': pillar_scores.get('A'),
        'functionality_score': pillar_scores.get('F'),
        'experience_score': pillar_scores.get('E'),
        'stats': pillar_stats
    }


if __name__ == '__main__':
    # Create templates folder if it doesn't exist
    os.makedirs('templates', exist_ok=True)

    # SECURITY: Only enable debug in development
    is_debug = os.environ.get('FLASK_ENV', 'development') != 'production'

    print("SAFE SCORING Admin Interface")
    print("=" * 50)
    print(f"   URL: http://localhost:5000")
    print(f"   Mode: {'DEBUG' if is_debug else 'PRODUCTION'}")
    print(f"   Auth: ENABLED (login required)")
    print("=" * 50)

    app.run(debug=is_debug, port=5000)
