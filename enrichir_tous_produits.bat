@echo off
REM ============================================================
REM SAFESCORING - Enrichir TOUS les produits automatiquement
REM ============================================================

echo.
echo ============================================================
echo    SAFESCORING - Enrichissement TOUS les produits
echo ============================================================
echo.

REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installé ou pas dans le PATH
    echo Installez Python depuis https://python.org
    pause
    exit /b 1
)

echo [OK] Python installé
echo.

REM Vérifier si le fichier de config existe
if not exist "config\env.txt" (
    if not exist "config\env_template_free.txt" (
        echo [ERREUR] Fichier de configuration non trouvé
        echo Créez config\env.txt avec vos clés API
        pause
        exit /b 1
    ) else (
        echo [INFO] Copie du template de configuration...
        copy config\env_template_free.txt config\env.txt
        echo.
        echo [ACTION REQUISE] Éditez config\env.txt et ajoutez vos clés API:
        echo   - NEXT_PUBLIC_SUPABASE_URL
        echo   - NEXT_PUBLIC_SUPABASE_ANON_KEY
        echo   - GOOGLE_API_KEY ou MISTRAL_API_KEY
        echo.
        notepad config\env.txt
        echo.
        echo Appuyez sur une touche une fois la configuration terminée...
        pause >nul
    )
)

echo [OK] Configuration trouvée
echo.

REM Menu
:MENU
echo ============================================================
echo    Choisissez une option:
echo ============================================================
echo.
echo  1. Test (DRY RUN) - Seulement produits manquants
echo  2. Test (DRY RUN) - TOUS les produits
echo  3. PRODUCTION - Enrichir produits manquants
echo  4. PRODUCTION - Enrichir TOUS les produits
echo  5. Quitter
echo.
set /p choice="Votre choix (1-5): "

if "%choice%"=="1" goto DRY_RUN_MISSING
if "%choice%"=="2" goto DRY_RUN_ALL
if "%choice%"=="3" goto PROD_MISSING
if "%choice%"=="4" goto PROD_ALL
if "%choice%"=="5" goto END
goto MENU

:DRY_RUN_MISSING
echo.
echo [TEST] Simulation - Produits manquants seulement
echo ============================================================
python src\automation\enrich_all_products_geography.py --dry-run --missing-only
echo.
echo ============================================================
echo Test terminé. Aucune modification apportée.
echo.
pause
goto MENU

:DRY_RUN_ALL
echo.
echo [TEST] Simulation - TOUS les produits
echo ============================================================
python src\automation\enrich_all_products_geography.py --dry-run
echo.
echo ============================================================
echo Test terminé. Aucune modification apportée.
echo.
pause
goto MENU

:PROD_MISSING
echo.
echo [PRODUCTION] Enrichissement des produits manquants
echo ============================================================
echo ATTENTION: Ceci va modifier la base de données Supabase!
echo.
set /p confirm="Êtes-vous sûr? (oui/non): "
if /i not "%confirm%"=="oui" goto MENU
echo.
echo Lancement de l'enrichissement...
echo.
python src\automation\enrich_all_products_geography.py --missing-only
echo.
echo ============================================================
echo Enrichissement terminé!
echo.
pause
goto MENU

:PROD_ALL
echo.
echo [PRODUCTION] Enrichissement de TOUS les produits
echo ============================================================
echo ATTENTION: Ceci va modifier TOUS les produits dans Supabase!
echo Même ceux déjà enrichis seront mis à jour.
echo.
set /p confirm="Êtes-vous VRAIMENT sûr? (oui/non): "
if /i not "%confirm%"=="oui" goto MENU
echo.
echo Lancement de l'enrichissement complet...
echo.
python src\automation\enrich_all_products_geography.py
echo.
echo ============================================================
echo Enrichissement complet terminé!
echo.
pause
goto MENU

:END
echo.
echo Au revoir!
echo.
pause
exit /b 0
