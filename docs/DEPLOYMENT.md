# Pawn Locker Integration — LAN Deployment Guide (Phase 10)

Per spec §49-51. This is a **local LAN gateway** — not exposed publicly unless required. Network model (spec §5):

```
POS PC 192.168.1.10 ──→ Integration Web Server 192.168.1.50 ──→ Locker Server 192.168.1.20:3000
```

All IPs/URLs are **configurable** via `.env` / `integration_settings` — never hard-code `192.168.1.20` (spec §5).

---

## 1. Target Stack (spec §49)

- Ubuntu Server 22.04/24.04 (static IP)
- Nginx + PHP-FPM (PHP 8.3+, we use 8.4)
- MySQL 8+
- Node.js 20+ + npm
- Composer 2
- Laravel 13, React+Inertia, Supervisor

## 2. Server Provision — Example `192.168.1.50`

```bash
# Static IP (Netplan example /etc/netplan/01-netcfg.yaml)
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses: [192.168.1.50/24]
      gateway4: 192.168.1.1
      nameservers: { addresses: [192.168.1.1, 8.8.8.8] }
sudo netplan apply
ip a | grep 192.168.1.50

# Dependencies
sudo apt update
sudo apt install -y nginx mysql-server php8.4 php8.4-fpm php8.4-mysql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-cli unzip nodejs npm supervisor git

composer --version
php --version   # >=8.3
mysql --version # 8+
node --version
```

## 3. App Deploy

```bash
cd /var/www
sudo git clone <repo> lockerapi
sudo chown -R www-data:www-data lockerapi
cd lockerapi

composer install --no-dev --optimize-autoloader --no-interaction
cp .env.example .env
php artisan key:generate

# Edit .env for LAN (spec §6, §50)
nano .env
# APP_NAME="Pawn Locker Integration"
# APP_ENV=production
# APP_URL=http://192.168.1.50
# APP_DEBUG=false
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=pawn_locker
# DB_USERNAME=locker_user
# DB_PASSWORD=<strong>
# POS_API_URL=http://192.168.1.10/api
# POS_API_TOKEN=<pos-bearer>
# POS_LOCATION_UPDATE_ENDPOINT=/bags/{bagNo}/location  # adapt to POS vendor
# LOCKER_API_URL=http://192.168.1.20:3000/api/integration/v1
# LOCKER_API_TOKEN=<locker-bearer>
# INTEGRATION_REQUEST_TIMEOUT=15
# INTEGRATION_RETRY_ATTEMPTS=3
# INTEGRATION_RETRY_DELAY=5
# QUEUE_CONNECTION=database

php artisan migrate --force
php artisan db:seed --force   # creates admin@locker.com / password + settings
npm install
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache

sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### MySQL — Create DB/User

```sql
sudo mysql
CREATE DATABASE pawn_locker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'locker_user'@'localhost' IDENTIFIED BY '<strong>';
GRANT ALL ON pawn_locker.* TO 'locker_user'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Nginx — ` /etc/nginx/sites-available/lockerapi `

```nginx
server {
    listen 80;
    server_name 192.168.1.50;
    root /var/www/lockerapi/public;
    index index.php;

    # Do not expose publicly; allow LAN only (spec §49)
    # allow 192.168.1.0/24;
    # deny all;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { deny all; }
    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lockerapi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable php8.4-fpm nginx
```

## 5. Queue Worker — Supervisor (spec §50: Queue worker running)

Database queue (spec §6 `QUEUE_CONNECTION=database`, `jobs` table already migrated).

`/etc/supervisor/conf.d/locker-queue.conf`:

```ini
[program:locker-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/lockerapi/artisan queue:work --sleep=3 --tries=3 --backoff=5 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/lockerapi/storage/logs/queue.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start locker-queue:*
sudo supervisorctl status
# logs: tail -f storage/logs/queue.log
```

**Failed jobs**: `php artisan queue:failed` / `php artisan queue:retry all`. `failed_jobs` table is created.

## 6. Scheduler (if needed for retries / cleanup)

```bash
# crontab -e as www-data
* * * * * cd /var/www/lockerapi && php artisan schedule:run >> /dev/null 2>&1
```

Add to `routes/console.php` or `app/Console/Kernel.php` if you add scheduled retry commands. Currently retries are handled inline via job backoff; scheduler optional per `spec §4`.

## 7. Firewall — Allow LAN only

```bash
sudo ufw allow from 192.168.1.0/24 to any port 80
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
# Do not expose 80 publicly unless required
```

## 8. Verify 4 Flows (spec §10)

### Quick LAN reachability (from each host)

```bash
# From POS PC 192.168.1.10
curl -H "Authorization: Bearer $POS_API_TOKEN" http://192.168.1.50/api/v1/pos/bags/BAG-001
# Expected 200 or 404 BAG_NOT_FOUND (auth ok)

# From Integration Server 192.168.1.50
curl http://192.168.1.20:3000/api/integration/v1/storage-assignments/batch -H "Authorization: Bearer $LOCKER_API_TOKEN" -H "Content-Type: application/json" -d '{"batchNo":"TEST-001","items":[]}'
# Expect 401/422 if reachable vs timeout if not

# For Locker → POS sync, POS must be reachable from 192.168.1.50
curl http://192.168.1.10/api/bags/BAG-001/location -X PUT -H "Content-Type: application/json" -d '{"newLocation":"C1-R1"}'
```

### Full integration verification (spec §44 scenarios)

On the **Integration Server**:

```bash
# Run automated integration suite (covers §44 1-7 + §55)
php artisan test --filter=IntegrationScenariosTest --verbose

# Or individual:
php artisan test --filter=test_scenario_5_consolidation
php artisan test --filter=test_scenario_7_duplicate_location_event
```

Manual trace:

1. **POS → Integration → Locker**: `POST http://192.168.1.50/api/v1/pos/storage-assignments` (with `POS_API_TOKEN`, batch `ST-...`, `X-Request-Id` preserved). Check `admin/storage-batches` → `COMPLETED`, `integration_logs` `POS_TO_APP` + `APP_TO_LOCKER` 200, items `ACCEPTED`.
2. **Locker → Integration**: `POST http://192.168.1.50/api/locker-integration/v1/location-updates` (with `LOCKER_API_TOKEN`, `eventId LOC-...`, `C1-R1→C3-R8`). Check `bags.current_location=C3-R8` in `admin/bags`, `locker_location_events` `PROCESSED`.
3. **Integration → POS**: Worker `PUT http://192.168.1.10/api/bags/{bagNo}/location` with `{newLocation:C3-R8}`. Check `pos_sync_jobs` `SUCCESS` and POS DB shows `C3-R8`.
4. **POS Offline**: Stop POS mock, send location event → must still get `200`, `bags` updated, `pos_sync_jobs` `RETRYING` (no data loss, spec §42).

Check via UI: `/dashboard` (POS●/Locker●), `/admin/system-status` (Database Healthy, Queue Running, POS/Locker configurable URLs).

## 9. Production Checklist (spec §50 — copy & tick)

```
[ ] Static IP configured (192.168.1.50 via Netplan, verified ip a)
[ ] DNS/hostname configured if required (or hosts entry on POS PC)
[ ] POS can reach application (curl 192.168.1.50/api/v1/pos/bags/... with POS token)
[ ] Application can reach Locker (curl 192.168.1.20:3000/api/integration/v1)
[ ] Application can reach POS (curl POS_API_URL/bags/... on integration host)
[ ] MySQL working (php artisan migrate:status, mysql -u locker_user -p pawn_locker -e "select 1")
[ ] Queue worker running (supervisorctl status locker-queue, tail storage/logs/queue.log)
[ ] Scheduler configured if required (crontab -l | grep schedule:run)
[ ] POS token configured (POS_API_TOKEN in .env, not in logs/frontend)
[ ] Locker token configured (LOCKER_API_TOKEN in .env, server-side only)
[ ] Locker API URL configured (LOCKER_API_URL, not hard-coded)
[ ] POS API URL configured (POS_API_URL)
[ ] Approved Locker locations verified (C1-R1 etc. per deployment agreement)
[ ] API logs working (admin/integration-logs shows POS_TO_APP etc., no Authorization header)
[ ] Retry system tested (php artisan test --filter LockerStorageAssignmentTest 500→ retry, 3 attempts)
[ ] Duplicate event tested (same eventId twice → 200 duplicate, one row)
[ ] Partial failure tested (batch 3: 2 accepted 1 rejected → StorageBatch PARTIAL)
[ ] POS offline tested (Locker 200 while POS 503 → pos_sync_jobs RETRYING)
[ ] Locker offline tested (500/503 → storage_batches RETRYING → FAILED after 3)
[ ] Backup configured (see §51)
```

Automated pre-flight:

```bash
php artisan migrate:status
php artisan db:seed --force
php artisan test  # 75 passed
curl http://192.168.1.50/up -f         # health
curl http://192.168.1.50/admin/system-status -H "Cookie: ..." # via browser
sudo supervisorctl status
```

## 10. Backup (spec §51)

Never expose secrets in backups for general users.

```bash
# Cron nightly 02:00 — DB dump (store securely, encrypt)
sudo crontab -e
0 2 * * * mysqldump -u locker_user -p'<strong>' pawn_locker | gzip > /var/backups/pawn_locker-$(date +\%F).sql.gz && find /var/backups -name "pawn_locker-*.sql.gz" -mtime +30 -delete

# .env / secret: backup via secure deployment procedure (e.g., Vault, encrypted S3)
# Example encrypted S3:
# aws s3 cp /var/www/lockerapi/.env s3://company-secrets/lockerapi/.env.gpg --sse

# App config: integration_settings table is in DB dump; verify
# Logs retention: keep integration_logs per business retention (e.g., 90 days then archive)
```

## 11. Admin Access

Seeded per Phase 8:

```
Admin: admin@locker.com / password  (change: php artisan tinker → Hash::make)
Test:  test@example.com / password
```

Change immediately in production:

```bash
php artisan tinker
>>> App\Models\User::whereEmail('admin@locker.com')->update(['password'=>Hash::make('StrongNewPass!')]);
```

## 12. Logs & Monitoring

- App logs: `storage/logs/laravel.log`
- Queue logs: `storage/logs/queue.log`
- Integration logs: `admin/integration-logs` (filtered by `direction/system/status`) — never contain `Authorization: Bearer ...` (sanitized via `IntegrationLogService::sanitize`)
- Failed: `admin/failed-integrations` + `php artisan queue:failed`

## 13. Updating (Zero-downtime)

```bash
cd /var/www/lockerapi && git pull
composer install --no-dev --optimize-autoloader
npm run build
php artisan migrate --force
php artisan config:cache && php artisan view:cache
sudo supervisorctl restart locker-queue:*
sudo systemctl reload php8.4-fpm
```

Keep `X-Request-Id` + `batchNo`/`eventId` stable across retries — never generate new logical batch on network retry (spec §13).

