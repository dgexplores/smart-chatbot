#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ASEP — one-command Railway deploy
#
# Deploys the full stack to Railway:
#   • MongoDB service (template)          → data store
#   • Qdrant service (docker image)       → vector search
#   • server service (Express + TS)       → API + Socket.io + pricing engine
#   • client service (static Vite build)  → chat widget + dashboard
#
# Requirements:
#   • `railway` CLI installed and logged in  (railway login)
#   • Railway plan with provisioning capacity (the free plan may block this —
#     upgrade to Hobby in the dashboard if you see "resource provision limit")
#
# Env overrides (optional):  JWT_SECRET, MOCK_LLM, GEMINI_API_KEY
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

railway whoami >/dev/null 2>&1 || { echo "❌ Not logged in. Run: railway login"; exit 1; }

PROJECT="smart-chatbot"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
MOCK_LLM="${MOCK_LLM:-true}"   # set MOCK_LLM=false + GEMINI_API_KEY for real AI

echo "→ [1/6] Creating/linking project '$PROJECT'"
railway init --name "$PROJECT" 2>/dev/null || echo "   (project already exists / linked — continuing)"

echo "→ [2/6] Adding MongoDB (template) + Qdrant (image) + server service"
railway add -d mongo || true
railway add -s qdrant -i qdrant/qdrant || true
railway add -s server || true

echo "→ [3/6] Setting server environment variables"
# Railway injects PORT automatically; MONGO_URI/QDRANT_URL use internal domains.
railway variable set NODE_ENV=production -s server --skip-deploys || true
railway variable set JWT_SECRET="$JWT_SECRET" -s server --skip-deploys || true
railway variable set MOCK_LLM="$MOCK_LLM" -s server --skip-deploys || true
railway variable set GEMINI_API_KEY="${GEMINI_API_KEY:-}" -s server --skip-deploys || true
railway variable set MONGO_URI="${MONGO_URI:-mongodb://mongo.railway.internal:27017/asep}" -s server --skip-deploys || true
railway variable set QDRANT_URL="${QDRANT_URL:-http://qdrant.railway.internal:6333}" -s server --skip-deploys || true
railway variable set SMTP_FROM="${SMTP_FROM:-noreply@asep.local}" -s server --skip-deploys || true

echo "→ [4/6] Deploying server (first build takes a few minutes)"
cd "$ROOT/server"
railway up --service server -d || { echo "❌ Server deploy failed — check 'railway logs'"; exit 1; }

echo "→ [5/6] Assigning server domain + wiring PUBLIC_BASE_URL"
railway domain -s server || true
sleep 3
SERVER_URL="$(railway domain list -s server --json 2>/dev/null | grep -o 'https://[a-z0-9.-]*\.up\.railway\.app' | head -1 || true)"
if [ -n "$SERVER_URL" ]; then
  echo "   Server URL: $SERVER_URL"
  railway variable set PUBLIC_BASE_URL="$SERVER_URL" -s server || true
  echo "   ✓ PUBLIC_BASE_URL set — proposals/PDFs will use $SERVER_URL"
else
  echo "   ⚠️  Could not read server domain automatically — set PUBLIC_BASE_URL manually in the dashboard."
fi

echo "→ [6/6] Deploying client (chat widget + dashboard)"
cd "$ROOT/client"
if [ -n "$SERVER_URL" ]; then
  railway add -s client || true
  railway variable set VITE_API_URL="$SERVER_URL" -s client --skip-deploys || true
  railway variable set VITE_SOCKET_URL="$SERVER_URL" -s client --skip-deploys || true
  railway up --service client -d || { echo "❌ Client deploy failed — check 'railway logs'"; exit 1; }
  echo "   ✓ Client deployed with VITE_API_URL=$SERVER_URL"
  CLIENT_URL="$(railway domain list -s client --json 2>/dev/null | grep -o 'https://[a-z0-9.-]*\.up\.railway\.app' | head -1 || true)"
  if [ -n "$CLIENT_URL" ]; then
    echo "   Client URL: $CLIENT_URL"
    # Point CORS at the deployed client so the dashboard can talk to the API.
    railway variable set CLIENT_URL="$CLIENT_URL" -s server || true
  fi
fi

echo ""
echo "✅ Deploy complete!"
echo "   Server: $SERVER_URL"
echo "   Client: $CLIENT_URL"
echo ""
echo "Next steps:"
echo "  1. (Recommended) Set a real GEMINI_API_KEY and MOCK_LLM=false for real AI."
echo "  2. Add competitor market targets:  POST $SERVER_URL/api/v1/market-targets"
echo "  3. Watch the rate card adapt:      GET  $SERVER_URL/api/v1/pricing/rates"
