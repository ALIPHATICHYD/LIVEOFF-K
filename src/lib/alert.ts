/** Post a short message to the team's Slack or Discord channel (ERROR_WEBHOOK_URL). Never throws. */
export async function sendAlert(text: string) {
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }), // Slack reads "text", Discord reads "content"
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // reporting must never break the request
  }
}
