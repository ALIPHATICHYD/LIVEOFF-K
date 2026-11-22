import type { Instrumentation } from "next";
import { sendAlert } from "@/lib/alert";

/**
 * Server error tracking. Every uncaught server error is logged as one JSON line (searchable in
 * Vercel -> Logs) and, if ERROR_WEBHOOK_URL is set, posted to a Slack or Discord channel so
 * someone hears about it before students do. Swap this for Sentry when the team grows.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  const entry = {
    level: "error",
    msg: message,
    digest,
    method: request.method,
    path: request.path.split("?")[0], // never log query strings: they can carry payment references
    route: context.routePath,
    kind: context.routeType,
  };
  console.error(JSON.stringify(entry));

  await sendAlert(`LiveOff-K error on ${entry.method} ${entry.path}: ${message.slice(0, 300)}${digest ? ` (digest ${digest})` : ""}`);
};
