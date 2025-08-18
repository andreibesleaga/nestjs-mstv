#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PNPM_HOME="$HOME/.pnpm"
export PATH="$PNPM_HOME:$PATH"

cd "$ROOT_DIR"

echo "[orchestrator] Bringing up Temporal..."
docker compose -f coordination/docker-compose.temporal.yml up -d

# Wait briefly for Temporal to be ready (best-effort)
echo "[orchestrator] Waiting for Temporal to initialize..."
sleep 5

# Start worker in background terminal
# Note: This will run until killed; we run smoke shortly after.
echo "[orchestrator] Starting coordination worker..."
( pnpm -F nestjs-mstv-coordination run dev:worker & )

# Give worker a moment to connect
sleep 2

echo "[orchestrator] Running smoke script..."
pnpm -F nestjs-mstv-coordination run smoke || true

cat <<EOF

Done. If the smoke worked, you should see a SUCCESS result in the logs.
- Temporal UI: http://localhost:8080
- To stop Temporal: npm run coordination:temporal:down
- Note: The worker is still running in the background of this shell.
EOF
