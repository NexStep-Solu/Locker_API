Pawn Locker Gateway - Windows auto-start (LAN port 8080)
=====================================================

WHAT THESE FILES DO
- start-all.bat : opens 2 minimized windows: web server (:8080) + queue worker
- web.bat       : web server only  (php artisan serve --host=0.0.0.0 --port=8080)
- queue.bat     : queue worker only (auto-restarts if it stops)

REQUIREMENTS (one-time setup on the customer PC)
1. PHP 8.3+ must be in PATH (check: open cmd, run "php -v").
   Laragon / XAMPP users: add its php folder to PATH, or run from its terminal.
2. Copy the whole project folder to this PC, e.g. C:\lockerapi
   These .bat files find the project automatically (they live in deploy\windows\).

RUN NOW
- Double-click start-all.bat
- Open http://localhost:8080 on this PC
- From another LAN machine: http://<this-PC-IP>:8080  (find IP with: ipconfig)

RUN AUTOMATICALLY WHEN PC STARTS
Option A (simple, recommended):
1. Press Win+R, type: shell:startup   -> Enter (opens Startup folder)
2. Right-click > New > Shortcut
3. Location: C:\lockerapi\deploy\windows\start-all.bat   (adjust to your path)
4. Name: Locker Gateway - Finish the wizard
5. Done. The 2 minimized windows open on every logon.

Option B (hidden, no windows at all):
1. Do Option A first.
2. Edit the shortcut: right-click > Properties.
3. Change Target to: wscript.exe "C:\lockerapi\deploy\windows\hidden.vbs"
   (create hidden.vbs with the content shown below, fixing the path)
4. Change Run: Minimized.

hidden.vbs content:
   Set W = CreateObject("WScript.Shell")
   W.Run "C:\lockerapi\deploy\windows\start-all.bat", 0, False

STOP EVERYTHING
- Close the two windows titled "Locker Web 8080" and "Locker Queue",
  or run: taskkill /FI "WINDOWTITLE eq Locker*" /F

FIREWALL (so locker + other PCs can reach port 8080)
- Windows Defender Firewall > Inbound Rules > New Rule > TCP port 8080 > Allow.
- Or run as admin: netsh advfirewall firewall add rule name="Locker Gateway 8080" protocol=TCP dir=in localport=8080 action=allow
