@echo off
echo Setting up Windows Task Scheduler for regeneration daemon...

REM Get current directory
set SCRIPT_DIR=%~dp0
set PYTHON_SCRIPT=%SCRIPT_DIR%run_regen_daemon.pyw

REM Create scheduled task to run now and persist
schtasks /create /tn "SafeScoring_RegenDaemon" /tr "pythonw \"%PYTHON_SCRIPT%\"" /sc once /st 00:00 /ru "%USERNAME%" /f

REM Run it immediately
schtasks /run /tn "SafeScoring_RegenDaemon"

echo.
echo Task created and started!
echo Check regen_daemon.log for progress.
echo.
echo To stop: schtasks /delete /tn "SafeScoring_RegenDaemon" /f
pause
