import client from "prom-client";

const globalForMetrics = globalThis as unknown as {
  metricsRegistered?: boolean;
};

if (!globalForMetrics.metricsRegistered) {
  client.collectDefaultMetrics({ register: client.register });
  globalForMetrics.metricsRegistered = true;
}

export const httpRequestDuration = new client.Histogram({
  name: "forgedocs_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [client.register],
});

export const exportJobsTotal = new client.Counter({
  name: "forgedocs_export_jobs_total",
  help: "Export jobs by format and status",
  labelNames: ["format", "status"] as const,
  registers: [client.register],
});

export async function metricsText(): Promise<string> {
  return client.register.metrics();
}

export function observeHttp(
  method: string,
  route: string,
  status: number,
  seconds: number,
) {
  httpRequestDuration.observe({ method, route, status: String(status) }, seconds);
}
