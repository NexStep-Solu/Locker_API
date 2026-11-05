@echo off
REM Pawn Locker Gateway - web server on LAN port 8080
REM Run this file directly, or via start-all.bat
cd /d "%~dp0..\.."
title Locker Web 8080
echo Starting web server on http://0.0.0.0:8080 ...
php artisan serve --host=0.0.0.0 --port=8080
echo.
echo Web server stopped. Press any key to close...
pause >nul
