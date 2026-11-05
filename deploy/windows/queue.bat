@echo off
REM Pawn Locker Gateway - queue worker (delivers store-bags to the locker)
REM Auto-restarts if it ever stops. Run via start-all.bat
cd /d "%~dp0..\.."
title Locker Queue
:loop
echo [%date% %time%] Queue worker starting...
php artisan queue:work --sleep=3 --tries=3
echo [%date% %time%] Queue worker stopped, restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop
