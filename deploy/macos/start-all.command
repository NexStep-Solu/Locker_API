#!/bin/zsh
# ============================================================
#  Pawn Locker Gateway - start everything (macOS)
#  Opens 2 Terminal windows: web server (:8080) + queue worker
#  To auto-run when you log in, see README.txt in this folder
# ============================================================

# Homebrew paths for double-click launches, where PATH can be minimal.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/Library/Application Support/Herd/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"

# Make the other scripts runnable if this folder was copied from Windows.
chmod +x "$DIR/web.command" "$DIR/queue.command" 2>/dev/null

if ! command -v php >/dev/null 2>&1; then
    echo "PHP was not found in PATH."
    echo "Install PHP 8.3+ (Homebrew: brew install php), or add it to PATH."
    echo
    echo "Press Enter to close..."
    read -r
    exit 1
fi

if [[ ! -f "$ROOT/.env" ]]; then
    echo "Missing .env in $ROOT"
    echo "Run: cp .env.example .env && php artisan key:generate"
    echo
    echo "Press Enter to close..."
    read -r
    exit 1
fi

if [[ ! -f "$ROOT/vendor/autoload.php" ]]; then
    echo "Missing Composer dependencies."
    echo "Run: composer install"
    echo
    echo "Press Enter to close..."
    read -r
    exit 1
fi

if [[ ! -f "$ROOT/public/build/manifest.json" ]]; then
    echo "Warning: frontend assets are not built. Run: npm install && npm run build"
    echo
fi

open -a Terminal "$DIR/web.command"
open -a Terminal "$DIR/queue.command"

echo "Started: web server on port 8080 + queue worker (two Terminal windows)."
echo "Open http://localhost:8080 to check."
echo "Close the two Terminal windows to stop everything."
echo
echo "Press Enter to close this window..."
read -r
