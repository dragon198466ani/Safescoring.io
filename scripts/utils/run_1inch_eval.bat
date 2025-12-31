@echo off
echo ===============================================================================
echo EVALUATING 1INCH WITH UPDATED DEX NORMS
echo ===============================================================================
echo.
echo This will:
echo   1. Load 1inch product (ID: 249)
echo   2. Scrape 1inch.io website
echo   3. Evaluate with AI using 501 applicable DEX norms
echo   4. Save results to database
echo.
echo Expected duration: 10-20 minutes
echo.
echo Starting evaluation...
echo.

cd /d "%~dp0"
python src\core\smart_evaluator.py --product "1inch" --limit 1

echo.
echo ===============================================================================
echo EVALUATION COMPLETE
echo ===============================================================================
echo.
echo Check results with: python check_1inch_status.py
pause
