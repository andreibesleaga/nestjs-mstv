# nest-ddd-chart

A minimal Helm chart for the NestJS template variant.

## Values overview

Core envs are set through `values.yaml` and mapped in `templates/deployment.yaml`:

- DATABASE_URL, REDIS_URL, KAFKA_BROKERS, JWT_SECRET, NODE_ENV
- ENABLE*OPENTELEMETRY, OTEL*\* (exporters), ENABLE_PROMETHEUS_METRICS
- ENABLE*STORAGE, STORAGE_PROVIDER, S3*_, AZURE\__, GCP\_\*
- ENABLE_CIRCUIT_BREAKER, CB_THRESHOLD, CB_TIMEOUT, CB_RESET_TIMEOUT

## Quickstart

Lint and render locally:

- `helm lint ./helm/nest-ddd-chart`
- `helm template local ./helm/nest-ddd-chart -f ./helm/nest-ddd-chart/values.yaml`

Install/upgrade:

- `helm upgrade --install nest-ddd ./helm/nest-ddd-chart -f ./helm/nest-ddd-chart/values.yaml`

Adjust `values.yaml` to your environment or override with `--set` flags.
