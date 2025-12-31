@echo off
REM SafeScoring - Daily Evaluation Script
REM Lancé automatiquement par Task Scheduler

cd /d C:\Users\alexa\Desktop\SafeScoring

REM Créer dossier logs si n'existe pas
if not exist "logs" mkdir logs

REM Log de démarrage
echo [%date% %time%] Starting daily evaluation... >> logs\cron.log

REM Activer l'environnement virtuel si existe
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Lancer les évaluations (10 produits max, 2 workers)
python run_parallel.py --workers 2 --limit 10 >> logs\cron.log 2>&1

REM Log de fin
echo [%date% %time%] Evaluation completed. >> logs\cron.log
echo. >> logs\cron.log
