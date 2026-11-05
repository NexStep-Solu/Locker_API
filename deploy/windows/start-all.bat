@echo off
REM ============================================================
REM  Pawn Locker Gateway - start everything (Windows)
REM  Opens 2 minimized windows: web server (:8080) + queue worker
REM  To auto-run when the PC starts, see README.txt in this folder
REM ============================================================
set ROOT=%~dp0..\..\
start "Locker Web 8080" /min "%ROOT%deploy\windows\web.bat"
start "Locker Queue" /min "%ROOT%deploy\windows\queue.bat"
echo Started: web server on port 8080 + queue worker (both minimized).
echo Open http://localhost:8080 to check.
timeout /t 3 >nul
