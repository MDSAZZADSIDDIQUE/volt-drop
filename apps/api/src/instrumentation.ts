// OpenTelemetry bootstrap (spec §13). Preloaded with `node --import ./dist/instrumentation.js` so that
// HTTP traffic is traced from the first request. It does nothing unless OTEL_EXPORTER_OTLP_ENDPOINT is
// set, so local development and tests pay no cost.
import { register } from 'node:module';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

if (endpoint !== undefined && endpoint !== '') {
  // ES modules are instrumented through this loader hook; CommonJS modules through require hooks.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const entrypoint = process.argv[1] ?? '';
  const serviceName =
    process.env.OTEL_SERVICE_NAME ??
    (entrypoint.endsWith('worker.js') ? 'voltdrop-worker' : 'voltdrop-api');

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/+$/, '')}/v1/traces` }),
    instrumentations: [new HttpInstrumentation()],
  });
  sdk.start();

  const shutdown = (): void => {
    void sdk.shutdown();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
