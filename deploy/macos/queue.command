#!/bin/zsh
# Pawn Locker Gateway - queue worker (delivers store-bags to the locker)
# Auto-restarts if it ever stops. Run via start-all.command

# Homebrew paths for double-click launches, where PATH can be minimal.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/Library/Application Support/Herd/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
cd "$ROOT" || exit 1

if ! command -v php >/dev/null 2>&1; then
    echo "PHP was not found in PATH."
    echo "Install PHP 8.3+ (Homebrew: brew install php), or add it to PATH."
    echo
    echo "Press Enter to close..."
    read -r
    exit 1
fi

# Ctrl+C / closing the window stops the worker instead of restarting it.
trap 'echo; echo "Queue worker stopped."; exit 0' INT TERM

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Queue worker starting..."
    php artisan queue:work --sleep=3 --tries=3
    STATUS=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Queue worker stopped (exit $STATUS), restarting in 5 seconds..."
    sleep 5
done
