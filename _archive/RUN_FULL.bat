@echo off
REM ============================================
REM SAFESCORING - Lancer en mode COMPLET
REM ============================================
REM Double-cliquez pour traiter TOUS les produits

title SAFESCORING - Mode COMPLET
color 0A

echo.
echo ========================================
echo   SAFESCORING.IO - Mode COMPLET
echo   (Tous les produits - ~2h)
echo ========================================
echo.

set /p CONFIRM="Lancer le traitement complet? (o/n): "
if /i not "%CONFIRM%"=="o" (
    echo Annule.
    pause
    exit /b
)

REM Activer l'environnement virtuel
call venv\Scripts\activate.bat

REM Lancer le script
python safescoring_automation_free.py --mode full

echo.
echo ========================================
echo   Termine!
echo ========================================
pause
