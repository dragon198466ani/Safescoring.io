export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import server config only in Node.js runtime
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Dynamically import edge config only in edge runtime
    await import("./sentry.edge.config");
  }
}
