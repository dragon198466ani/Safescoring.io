@echo off
REM ============================================
REM SETUP AUTO INCIDENTS IMPORT - Daily Task
REM ============================================
REM This script creates a Windows scheduled task
REM that runs the incident importer daily at 6 AM
REM ============================================

echo Setting up SafeScoring Auto Incidents Import Task...

REM Create the scheduled task
schtasks /create /tn "SafeScoring_AutoIncidents" /tr "python %~dp0auto_incidents.py" /sc daily /st 06:00 /f

if %errorlevel% == 0 (
    echo.
    echo SUCCESS! Task created successfully.
    echo.
    echo Task Name: SafeScoring_AutoIncidents
    echo Schedule: Daily at 6:00 AM
    echo Script: %~dp0auto_incidents.py
    echo.
    echo To run manually: python %~dp0auto_incidents.py
    echo To view task: schtasks /query /tn "SafeScoring_AutoIncidents"
    echo To delete task: schtasks /delete /tn "SafeScoring_AutoIncidents" /f
) else (
    echo.
    echo FAILED! Run this script as Administrator.
)

pause
