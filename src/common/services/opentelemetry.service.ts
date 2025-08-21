import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// Initialize OpenTelemetry according to env flags.
// Returns an SDK instance or undefined if disabled.
export function initOpenTelemetry(): NodeSDK | undefined {
  // Backward compatibility with older flag names
  const tracingEnabled =
    process.env.ENABLE_DISTRIBUTED_TRACING === 'true' ||
    process.env.ENABLE_JAEGER_TRACING === 'true' ||
    process.env.OTEL_TRACES_EXPORTER === 'otlp';
  if (!tracingEnabled) return undefined;

  // Optional diagnostics
  if (process.env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const serviceName = process.env.SERVICE_NAME || 'nestjs-mstv';
  const resource = new Resource({ [ATTR_SERVICE_NAME]: serviceName });

  // Configure trace exporter endpoint (works with Jaeger, SigNoz, Datadog when using OTLP)
  const tracesExporter =
    process.env.OTEL_TRACES_EXPORTER === 'none'
      ? undefined
      : new OTLPTraceExporter({
          url:
            process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/?$/, '') + '/v1/traces' ||
            process.env.SIGNOZ_ENDPOINT ||
            process.env.DATADOG_OTLP_ENDPOINT ||
            'http://localhost:4318/v1/traces',
          headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
        });

  // Metrics: either Prometheus or OTLP
  let metricReader: PeriodicExportingMetricReader | PrometheusExporter | undefined = undefined;
  if (
    process.env.ENABLE_PROMETHEUS_METRICS === 'true' ||
    process.env.OTEL_METRICS_EXPORTER === 'prometheus'
  ) {
    const prometheus = new PrometheusExporter({
      port: Number(process.env.PROMETHEUS_PORT || 9464),
      host: process.env.PROMETHEUS_HOST || '0.0.0.0',
    });
    metricReader = prometheus as any;
  } else if (
    process.env.OTEL_METRICS_EXPORTER === 'otlp' ||
    process.env.ENABLE_PROMETHEUS_METRICS !== 'true'
  ) {
    const otlpMetrics = new OTLPMetricExporter({
      url: `${
        process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318'
      }/v1/metrics`,
      headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    });
    metricReader = new PeriodicExportingMetricReader({ exporter: otlpMetrics });
  }

  const sdk = new NodeSDK({
    resource,
    traceExporter: tracesExporter,
    metricReader: metricReader as any,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Start OTel SDK
  try {
    // Start and ignore return value (void in current SDK)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sdk.start();
  } catch (err: any) {
    // Do not crash the app if OTel fails
    console.error('OpenTelemetry init failed:', err?.message || err);
  }

  // Ensure clean shutdown
  process.on('SIGTERM', () => sdk.shutdown().catch(() => undefined));
  process.on('SIGINT', () => sdk.shutdown().catch(() => undefined));

  return sdk;
}

function parseHeaders(h?: string): Record<string, string> | undefined {
  if (!h) return undefined;
  try {
    // Support both JSON and comma-separated key=value pairs
    if (h.trim().startsWith('{')) return JSON.parse(h);
    const out: Record<string, string> = {};
    h.split(',').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) out[k.trim()] = v.trim();
    });
    return out;
  } catch {
    return undefined;
  }
}
