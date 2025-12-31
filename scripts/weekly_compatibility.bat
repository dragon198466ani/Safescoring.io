@echo off
REM SafeScoring - Weekly Compatibility Analysis Script
REM Lancé automatiquement par Task Scheduler (1x/semaine)

cd /d C:\Users\alexa\Desktop\SafeScoring

REM Créer dossier logs si n'existe pas
if not exist "logs" mkdir logs

REM Log de démarrage
echo [%date% %time%] Starting weekly compatibility analysis... >> logs\cron.log

REM Activer l'environnement virtuel si existe
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Lancer l'analyse de compatibilité (50 paires)
python scripts\compatibility_analyzer.py --batch 50 >> logs\cron.log 2>&1

REM Log de fin
echo [%date% %time%] Compatibility analysis completed. >> logs\cron.log
echo. >> logs\cron.log
