#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ASEP — one-command LIVE DEMO restart (free, no accounts)
#
# Brings the whole product back up as a public site:
#   Docker (MongoDB + Qdrant) → cloudflared quick tunnel → server → client
#
# NOTE: quick tunnels get a NEW random URL on every restart. Re-run this
# whenever the tunnel dies; the new URL is printed at the end.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "→ [1/5] Checking Docker + infrastructure"
docker info >/dev/null 2>&1 || { echo "❌ Docker is not running — start Docker Desktop first."; exit 1; }
docker compose up -d >/dev/null 2>&1 && echo "   ✓ MongoDB + Qdrant containers up"

echo "→ [2/5] Stopping stale tunnel/server processes"
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "dist/index.js" 2>/dev/null || true
sleep 2
screen -wipe >/dev/null 2>&1 || true

echo "→ [3/5] Starting public tunnel"
rm -f /tmp/cloudflared.log  # clear stale URLs from a previous run
screen -dmS asep-tunnel bash -c "cd '$ROOT' && npx -y cloudflared tunnel --url http://localhost:5001 --no-autoupdate > /tmp/cloudflared.log 2>&1"
URL=""
for _ in $(seq 1 40); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1 || true)
  [ -n "$URL" ] && break
  sleep 2
done
[ -n "$URL" ] || { echo "❌ Tunnel failed to start:"; tail -5 /tmp/cloudflared.log; exit 1; }
echo "   ✓ Tunnel: $URL"

echo "→ [4/5] Building client (same-origin default — no URL baked in)"
(cd "$ROOT/client" && npm run build >/dev/null 2>&1) && echo "   ✓ Client built"

echo "→ [5/5] Starting server (demo data seeded on first boot)"
screen -dmS asep-server bash -c "cd '$ROOT/server' && JWT_SECRET=\$(openssl rand -hex 32) MOCK_LLM=true SEED_DEMO_DATA=true NODE_ENV=production MONGO_URI=mongodb://localhost:27017/asep QDRANT_URL=http://localhost:6333 PUBLIC_BASE_URL='$URL' PORT=5001 node dist/index.js > /tmp/asep-server.log 2>&1"
for _ in $(seq 1 30); do
  curl -sf -m 3 http://localhost:5001/health >/dev/null 2>&1 && break
  sleep 1
done
curl -sf -m 5 http://localhost:5001/health >/dev/null 2>&1 || { echo "❌ Server did not come up — check /tmp/asep-server.log"; exit 1; }

echo ""
echo "✅ LIVE — open this URL anywhere:"
echo "   $URL"
echo ""
echo "   Admin login: admin@example.com / AdminPassword123!"
echo "   (Server must stay on; re-run this script if the tunnel drops.)"
