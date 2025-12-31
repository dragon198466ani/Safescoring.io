@echo off
REM ============================================
REM SAFESCORING - Lancer en mode TEST (3 produits)
REM ============================================
REM Double-cliquez pour tester sur 3 produits

title SAFESCORING - Mode TEST
color 0B

echo.
echo ========================================
echo   SAFESCORING.IO - Mode TEST
echo   (3 produits seulement)
echo ========================================
echo.

REM Activer l'environnement virtuel
call venv\Scripts\activate.bat

REM Lancer le script
python safescoring_automation_free.py --mode test

echo.
echo ========================================
echo   Termine!
echo ========================================
pause
