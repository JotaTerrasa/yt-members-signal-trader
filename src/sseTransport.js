export function formatSseEvent(event, payload) {
  const name = String(event || 'message').replace(/[\r\n]/g, '') || 'message';
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function formatSseRetry(milliseconds) {
  const delay = Math.max(1000, Math.trunc(Number(milliseconds) || 0));
  return `retry: ${delay}\n\n`;
}
