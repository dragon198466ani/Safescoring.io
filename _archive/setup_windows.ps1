# ============================================
# SAFESCORING.IO - Setup Windows (PowerShell)
# ============================================
# Usage: Clic droit > "Exécuter avec PowerShell"
# Ou: powershell -ExecutionPolicy Bypass -File setup_windows.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SAFESCORING.IO - Setup Windows" -ForegroundColor Cyan
Write-Host "  Automatisation 100% GRATUITE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Vérifier Python
# ============================================
Write-Host "[1/6] Verification de Python..." -ForegroundColor Blue

try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python (\d+\.\d+)") {
        Write-Host "  OK Python $($Matches[1]) trouve" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERREUR: Python non trouve!" -ForegroundColor Red
    Write-Host "  Telechargez Python sur: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  IMPORTANT: Cochez 'Add Python to PATH' lors de l'installation!" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

# ============================================
# 2. Créer environnement virtuel
# ============================================
Write-Host "[2/6] Creation de l'environnement virtuel..." -ForegroundColor Blue

if (-Not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "  OK Environnement virtuel cree" -ForegroundColor Green
} else {
    Write-Host "  INFO: Environnement virtuel existe deja" -ForegroundColor Yellow
}

# Activer l'environnement
Write-Host "  Activation de l'environnement..." -ForegroundColor Gray
& ".\venv\Scripts\Activate.ps1"

# ============================================
# 3. Installer dépendances Python
# ============================================
Write-Host "[3/6] Installation des dependances Python..." -ForegroundColor Blue

# Mettre à jour pip
python -m pip install --upgrade pip --quiet

# Installer les packages
$packages = @(
    "mistralai",
    "google-generativeai", 
    "playwright",
    "supabase",
    "requests",
    "beautifulsoup4",
    "fake-useragent",
    "python-dotenv",
    "tenacity",
    "tqdm"
)

foreach ($pkg in $packages) {
    Write-Host "  Installation de $pkg..." -ForegroundColor Gray -NoNewline
    pip install $pkg --quiet 2>$null
    Write-Host " OK" -ForegroundColor Green
}

Write-Host "  OK Dependances Python installees" -ForegroundColor Green

# ============================================
# 4. Installer Playwright
# ============================================
Write-Host "[4/6] Installation de Playwright Chromium..." -ForegroundColor Blue

playwright install chromium 2>$null
Write-Host "  OK Playwright Chromium installe" -ForegroundColor Green

# ============================================
# 5. Créer fichier .env
# ============================================
Write-Host "[5/6] Configuration du fichier .env..." -ForegroundColor Blue

if (-Not (Test-Path ".env")) {
    @"
# ============================================
# SAFESCORING.IO - Configuration Windows
# ============================================
# Remplissez les cles API ci-dessous (toutes GRATUITES!)

# MISTRAL (GRATUIT) - https://console.mistral.ai
MISTRAL_API_KEY=

# GEMINI (GRATUIT) - https://aistudio.google.com  
GOOGLE_API_KEY=

# SUPABASE - https://supabase.com
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Optionnel
NVD_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
"@ | Out-File -FilePath ".env" -Encoding UTF8

    Write-Host "  OK Fichier .env cree" -ForegroundColor Green
    Write-Host "  IMPORTANT: Editez .env avec vos cles API!" -ForegroundColor Yellow
} else {
    Write-Host "  INFO: Fichier .env existe deja" -ForegroundColor Yellow
}

# ============================================
# 6. Installer Ollama (optionnel)
# ============================================
Write-Host "[6/6] Installation d'Ollama (optionnel)..." -ForegroundColor Blue

$installOllama = Read-Host "  Installer Ollama pour backup local? (o/n)"

if ($installOllama -eq "o" -or $installOllama -eq "O") {
    # Vérifier si Ollama est déjà installé
    $ollamaExists = Get-Command ollama -ErrorAction SilentlyContinue
    
    if ($ollamaExists) {
        Write-Host "  INFO: Ollama deja installe" -ForegroundColor Yellow
    } else {
        Write-Host "  Telechargement d'Ollama..." -ForegroundColor Gray
        
        # Télécharger l'installeur
        $ollamaUrl = "https://ollama.com/download/OllamaSetup.exe"
        $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
        
        try {
            Invoke-WebRequest -Uri $ollamaUrl -OutFile $ollamaInstaller
            Write-Host "  Lancement de l'installeur Ollama..." -ForegroundColor Gray
            Start-Process -FilePath $ollamaInstaller -Wait
            Write-Host "  OK Ollama installe" -ForegroundColor Green
        } catch {
            Write-Host "  ERREUR: Impossible de telecharger Ollama" -ForegroundColor Red
            Write-Host "  Telechargez manuellement: https://ollama.com/download" -ForegroundColor Yellow
        }
    }
    
    # Télécharger le modèle
    Write-Host "  Telechargement du modele llama3.2..." -ForegroundColor Gray
    ollama pull llama3.2
    Write-Host "  OK Modele llama3.2 telecharge" -ForegroundColor Green
} else {
    Write-Host "  INFO: Ollama ignore (optionnel)" -ForegroundColor Yellow
}

# ============================================
# Résumé
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INSTALLATION TERMINEE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Obtenir les cles API gratuites:" -ForegroundColor White
Write-Host "   - Mistral: https://console.mistral.ai" -ForegroundColor Gray
Write-Host "   - Gemini: https://aistudio.google.com" -ForegroundColor Gray
Write-Host "   - Supabase: https://supabase.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Editer le fichier .env avec vos cles:" -ForegroundColor White
Write-Host "   notepad .env" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Tester l'automatisation:" -ForegroundColor White
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "   python safescoring_automation_free.py --mode test" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Lancer en mode complet:" -ForegroundColor White
Write-Host "   python safescoring_automation_free.py --mode full" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cout total: 0 EUR/mois" -ForegroundColor Green
Write-Host ""

Read-Host "Appuyez sur Entree pour fermer"
