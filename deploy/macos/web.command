#!/bin/zsh
# Pawn Locker Gateway - web server on LAN port 8080
# Run this file directly, or via start-all.command

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

echo "Pawn Locker Gateway - web server"
echo "Local: http://localhost:8080"
echo "LAN:   http://<this-Mac-IP>:8080"
echo "Starting web server on http://0.0.0.0:8080 ..."
echo

php artisan serve --host=0.0.0.0 --port=8080
STATUS=$?

echo
echo "Web server stopped (exit $STATUS). Press Enter to close..."
read -r
