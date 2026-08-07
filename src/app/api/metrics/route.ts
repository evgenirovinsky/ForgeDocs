import { metricsText } from "@/server/metrics";

export async function GET() {
  const body = await metricsText();
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}
