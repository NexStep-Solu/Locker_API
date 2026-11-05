Pawn Locker Gateway - macOS startup scripts (LAN port 8080)
============================================================

WHAT THESE FILES DO
- start-all.command : opens 2 Terminal windows: web server (:8080) + queue worker
- web.command       : web server only  (php artisan serve --host=0.0.0.0 --port=8080)
- queue.command     : queue worker only (auto-restarts if it stops)

REQUIREMENTS (one-time setup on the Mac)
1. PHP 8.3+ in PATH (check: open Terminal, run "php -v").
   Homebrew:   brew install php
   Laravel Herd for macOS also works.
2. Composer and Node.js 20+:
   brew install composer node
3. Project dependencies installed:
   cd /path/to/lockerapi
   composer install
   npm install
4. .env configured:
   cp .env.example .env        (only if .env is missing)
   php artisan key:generate
   Edit .env for this Mac:
   - APP_URL=http://localhost:8080
     (or http://<this-Mac-IP>:8080 if other LAN machines use it)
   - DB_CONNECTION=sqlite
     DB_DATABASE=/absolute/path/to/lockerapi/pawn_locker
     touch pawn_locker
     (or use MySQL and set DB_HOST / DB_DATABASE / DB_USERNAME / DB_PASSWORD)
   - LOCKER_API_URL=http://<locker-ip>:<port>/api/integration/v1
   - LOCKER_API_TOKEN=<locker token>
   - QUEUE_CONNECTION=database
5. Create the database tables and admin user:
   php artisan migrate --force
   php artisan db:seed --force
   (admin@locker.com / password - change it in production)
6. Build the frontend once (the scripts do not start Vite):
   npm run build

RUN NOW
- Make the scripts executable once after copying the project:
  chmod +x deploy/macos/*.command
- Double-click start-all.command
  If macOS blocks it: right-click the file > Open > Open.
- Or from Terminal:
  ./deploy/macos/start-all.command
- Open http://localhost:8080 on this Mac
- From another LAN machine: http://<this-Mac-IP>:8080
  (find the IP in System Settings > Network, or run: ipconfig getifaddr en0)

STOP EVERYTHING
- Close the two Terminal windows titled "Pawn Locker Gateway - web server"
  and the queue worker window, or press Ctrl+C in each.

RUN AUTOMATICALLY WHEN YOU LOG IN
Option A (simple):
1. Open System Settings > General > Login Items.
2. Click + and add start-all.command.
   If macOS will not accept the script, wrap it in an Automator "Application"
   that runs a shell script, then add that app to Login Items.

Option B (headless/server):
Use launchd or Supervisor to run the two commands directly, without Terminal:
  php artisan serve --host=0.0.0.0 --port=8080
  php artisan queue:work --sleep=3 --tries=3
This is the better choice for an always-on shop computer.

FIREWALL (so the locker and other PCs can reach port 8080)
- Allow incoming connections when macOS asks about "php".
- Or open System Settings > Network > Firewall > Options, and allow php.
- The web server listens on 0.0.0.0:8080, so other LAN machines can connect.

TROUBLESHOOTING
- "PHP was not found in PATH": install PHP, or add Homebrew to PATH:
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  Then close and reopen Terminal.
- "bad interpreter" or "^M" errors: the file has Windows line endings. Fix with:
  sed -i '' 's/\r$//' deploy/macos/*.command
- "Missing Composer dependencies": run composer install.
- Frontend looks unstyled: run npm install && npm run build.
- Store-bags stays "Waiting": the queue worker window must be running.
- Locker calls fail with 401: check LOCKER_API_TOKEN in .env.
- Locker calls fail to connect: check LOCKER_API_URL and that the locker is reachable:
  curl -H "Authorization: Bearer $LOCKER_API_TOKEN" "$LOCKER_API_URL/drawers?available=true"
- If you changed .env while the server is running, restart the scripts
  (or run: php artisan config:clear).

NOTES
- These scripts are the macOS equivalent of deploy/windows/*.bat.
- php artisan serve is intended for local/LAN use, not for exposing the
  gateway to the public internet.
