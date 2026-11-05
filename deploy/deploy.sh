#!/usr/bin/env bash
set -e
# Pawn Locker Integration — LAN deploy helper
# Ubuntu LAN: 192.168.1.50 /var/www/lockerapi (nginx+supervisor+php-fpm)
# macOS dev: auto-detects project root, skips Linux-only steps
if [ -n "$APP_DIR" ]; then
  echo "Using APP_DIR=$APP_DIR"
else
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  echo "Auto-detected APP_DIR=$APP_DIR"
fi
cd "$APP_DIR"
echo "== Composer =="
composer install --no-dev --optimize-autoloader --no-interaction
echo "== Migrate =="
php artisan migrate --force
php artisan db:seed --force
echo "== Build =="
npm install
npm run build
if [ "$APP_ENV" = "production" ] || grep -q "APP_ENV=production" .env 2>/dev/null; then
  echo "== Cache (production) =="
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
else
  echo "== Cache (dev) — clearing for local dev =="
  php artisan config:clear
  php artisan route:clear
  php artisan view:clear
fi
echo "== Permissions =="
if command -v supervisorctl >/dev/null 2>&1 && id -nG 2>/dev/null | grep -q "www-data\|sudo"; then
  sudo chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
  sudo chmod -R 775 storage bootstrap/cache
else
  echo "macOS/dev: skipping chown www-data"
  chmod -R 775 storage bootstrap/cache || true
fi
echo "== Queue restart =="
if command -v supervisorctl >/dev/null 2>&1; then
  sudo supervisorctl restart locker-queue:* || echo "supervisor not running — start with sudo supervisorctl reread && update"
  sudo systemctl reload php8.4-fpm 2>/dev/null || true
else
  echo "macOS/dev: skipping supervisor — run separately: php artisan queue:work --sleep=3 --tries=3"
fi
if [ "$APP_ENV" = "production" ] || grep -q "APP_ENV=production" .env 2>/dev/null; then
  echo "== Done — check http://192.168.1.50/dashboard and /admin/system-status"
else
  echo "== Done (dev) — run 'composer run dev' or 'php artisan serve' + 'npm run dev'"
fi
