#!/usr/bin/env bash
# Tencent Cloud Lighthouse one-click setup
# Usage: curl -sSL https://raw.githubusercontent.com/chauncywayne64/spot/main/scripts/setup-lighthouse.sh | bash
set -euo pipefail

PROJECT_DIR="/opt/customer-radar"

echo "=== [1/5] Install Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
  # Install docker-compose plugin
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

echo "=== [2/5] Install Nginx ==="
if ! command -v nginx &>/dev/null; then
  apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx
  systemctl enable nginx
  systemctl start nginx
fi

echo "=== [3/5] Clone project ==="
if [ ! -d "$PROJECT_DIR" ]; then
  git clone https://github.com/chauncywayne64/spot.git "$PROJECT_DIR"
fi

echo "=== [4/5] Configure ==="
cd "$PROJECT_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "!!! Please edit $PROJECT_DIR/.env with your production values !!!"
  echo ""
fi

echo "=== [5/5] Build frontend ==="
cd src/client && npm ci && npm run build && cd ../..

echo ""
necho "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit $PROJECT_DIR/.env"
echo "  2. Run: cd $PROJECT_DIR && docker compose up -d"
echo "  3. Configure Nginx (see docs/tencent-lighthouse-deploy.md)"
