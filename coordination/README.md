Hybrid Temporal.io coordination for nestjs-mstv

This package adds a flexible coordination system combining:

- Cron schedules (Temporal Schedules)
- Orchestration (Saga-style workflow calling activities)
- Choreography via Signals (external services signal progress)

It is framework-agnostic and can coordinate multiple microservices based on the nestjs-mstv template.

Quick start

1. Ensure a Temporal Cluster is available (e.g., localhost:7233 with Temporal UI).
2. Copy `.env.example` to `.env` and adjust as needed.
3. Install deps in this package and run the worker.
4. Create a schedule for the hybrid workflow with your cron string.

Nightly health check example

- A workflow `nightlyHealthCheck` pings your API gateway health endpoint nightly (default 2 AM).
- Configure URL/cron via env: HEALTHCHECK_URL, HEALTHCHECK_CRON
- Create schedule: pnpm -F nestjs-mstv-coordination run create:health-schedule

Environment

- TEMPORAL_ADDRESS (default: localhost:7233)
- TEMPORAL_NAMESPACE (default: default)
- TEMPORAL_TASK_QUEUE (default: coordination)

Scripts

- pnpm --filter nestjs-mstv-coordination install
- pnpm --filter nestjs-mstv-coordination run dev:worker
- pnpm --filter nestjs-mstv-coordination run create:schedule
- pnpm --filter nestjs-mstv-coordination run create:health-schedule
- pnpm --filter nestjs-mstv-coordination test
- pnpm --filter nestjs-mstv-coordination run smoke

Architecture

- Workflows: src/workflows.ts
- Activities: src/activities.ts
- Worker: src/worker.ts
- Scheduler utility: src/scheduler.ts
- Health scheduler: src/schedule-health.ts
- Types: src/types.ts

Notes

- Activities here are placeholders. Replace with real HTTP/gRPC/Kafka/NATS integrations as needed.
- Saga compensations are included for partial failures.

Configuring external services (example)

- action1: call a billing service (HTTP POST /charge)
- action2: call inventory service (HTTP POST /reserve)
- action3: call shipping service (HTTP POST /schedule)
- reaction1: refund payment (HTTP POST /refund)
- reaction2: release inventory (HTTP POST /release)

See `src/activities.ts` for placeholders; replace with real clients and handle errors/timeouts.

Testing

- Unit tests for actions and health check live in `test/actions.spec.ts`
- Run tests with: pnpm -F nestjs-mstv-coordination test
- Tests run with ts-jest and use env defaults from `src/types.ts`

Local Temporal cluster (optional)

Use the provided compose file to run Temporal and UI locally:

1. Start Temporal and UI
   - docker compose -f coordination/docker-compose.temporal.yml up -d
   - Temporal UI at <http://localhost:8080>
2. Run the worker
   - pnpm -F nestjs-mstv-coordination run dev:worker
3. Run the smoke script (starts `hybridWorkflow`, sends signals, awaits result)
   - pnpm -F nestjs-mstv-coordination run smoke
