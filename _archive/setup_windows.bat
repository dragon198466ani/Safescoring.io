@echo off
REM ============================================
REM SAFESCORING.IO - Setup Windows (Batch)
REM ============================================
REM Double-cliquez sur ce fichier pour installer
REM ============================================

title SAFESCORING.IO - Installation Windows
color 0A

echo.
echo ========================================
echo   SAFESCORING.IO - Setup Windows
echo   Automatisation 100%% GRATUITE
echo ========================================
echo.

REM ============================================
REM 1. Vérifier Python
REM ============================================
echo [1/6] Verification de Python...

python --version >nul 2>&1
if errorlevel 1 (
    echo   ERREUR: Python non trouve!
    echo.
    echo   Telechargez Python sur: https://www.python.org/downloads/
    echo   IMPORTANT: Cochez "Add Python to PATH" lors de l'installation!
    echo.
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
echo   OK Python %PYVER% trouve

REM ============================================
REM 2. Créer environnement virtuel
REM ============================================
echo [2/6] Creation de l'environnement virtuel...

if not exist "venv" (
    python -m venv venv
    echo   OK Environnement virtuel cree
) else (
    echo   INFO: Environnement virtuel existe deja
)

REM Activer l'environnement
call venv\Scripts\activate.bat

REM ============================================
REM 3. Installer dépendances Python
REM ============================================
echo [3/6] Installation des dependances Python...
echo   Cela peut prendre quelques minutes...

python -m pip install --upgrade pip --quiet

pip install mistralai --quiet
echo   - mistralai OK
pip install google-generativeai --quiet
echo   - google-generativeai OK
pip install playwright --quiet
echo   - playwright OK
pip install supabase --quiet
echo   - supabase OK
pip install requests --quiet
echo   - requests OK
pip install beautifulsoup4 --quiet
echo   - beautifulsoup4 OK
pip install fake-useragent --quiet
echo   - fake-useragent OK
pip install python-dotenv --quiet
echo   - python-dotenv OK
pip install tenacity --quiet
echo   - tenacity OK
pip install tqdm --quiet
echo   - tqdm OK

echo   OK Toutes les dependances installees

REM ============================================
REM 4. Installer Playwright
REM ============================================
echo [4/6] Installation de Playwright Chromium...

playwright install chromium
echo   OK Playwright Chromium installe

REM ============================================
REM 5. Créer fichier .env
REM ============================================
echo [5/6] Configuration du fichier .env...

if not exist ".env" (
    (
        echo # ============================================
        echo # SAFESCORING.IO - Configuration Windows
        echo # ============================================
        echo # Remplissez les cles API ci-dessous ^(toutes GRATUITES!^)
        echo.
        echo # MISTRAL ^(GRATUIT^) - https://console.mistral.ai
        echo MISTRAL_API_KEY=
        echo.
        echo # GEMINI ^(GRATUIT^) - https://aistudio.google.com
        echo GOOGLE_API_KEY=
        echo.
        echo # SUPABASE - https://supabase.com
        echo SUPABASE_URL=
        echo SUPABASE_SERVICE_KEY=
        echo.
        echo # Optionnel
        echo NVD_API_KEY=
        echo TELEGRAM_BOT_TOKEN=
        echo TELEGRAM_ADMIN_CHAT_ID=
    ) > .env
    echo   OK Fichier .env cree
    echo   IMPORTANT: Editez .env avec vos cles API!
) else (
    echo   INFO: Fichier .env existe deja
)

REM ============================================
REM 6. Ollama (optionnel)
REM ============================================
echo [6/6] Ollama (optionnel - backup local)...

set /p INSTALL_OLLAMA="  Installer Ollama? (o/n): "
if /i "%INSTALL_OLLAMA%"=="o" (
    echo   Ouverture de la page de telechargement Ollama...
    start https://ollama.com/download
    echo   Apres installation, executez: ollama pull llama3.2
) else (
    echo   INFO: Ollama ignore
)

REM ============================================
REM Résumé
REM ============================================
echo.
echo ========================================
echo   INSTALLATION TERMINEE!
echo ========================================
echo.
echo Prochaines etapes:
echo.
echo 1. Obtenir les cles API gratuites:
echo    - Mistral: https://console.mistral.ai
echo    - Gemini: https://aistudio.google.com
echo    - Supabase: https://supabase.com
echo.
echo 2. Editer .env avec Notepad:
echo    notepad .env
echo.
echo 3. Tester (ouvrez CMD dans ce dossier):
echo    venv\Scripts\activate
echo    python safescoring_automation_free.py --mode test
echo.
echo 4. Mode complet:
echo    python safescoring_automation_free.py --mode full
echo.
echo Cout total: 0 EUR/mois
echo.

pause
