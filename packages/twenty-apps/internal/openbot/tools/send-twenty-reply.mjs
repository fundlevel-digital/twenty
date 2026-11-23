import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sendTwentyReply = async (input, configuration) => {
  if (
    !input ||
    typeof input.deliveryId !== 'string' ||
    input.deliveryId.split(':').length !== 2 ||
    !input.deliveryId.split(':').every((id) => UUID_PATTERN.test(id)) ||
    typeof input.text !== 'string' ||
    !input.text.trim() ||
    input.text.length > 10000
  )
    throw new Error(
      'Provide a delivery ID and an answer of up to 10,000 characters',
    );
  if (
    !UUID_PATTERN.test(configuration.workspaceId ?? '') ||
    typeof configuration.webhookSecret !== 'string' ||
    configuration.webhookSecret.length < 32 ||
    !URL.canParse(configuration.replyUrl)
  )
    throw new Error('Reply helper configuration is incomplete');
  const url = new URL(configuration.replyUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/s/openbot/reply'
  )
    throw new Error('Configure the HTTPS Twenty reply endpoint');

  const replySecret = createHmac('sha256', configuration.webhookSecret)
    .update(
      `crm-comment-reply:${configuration.workspaceId}:${input.deliveryId}`,
    )
    .digest('hex');
  const body = JSON.stringify({
    deliveryId: input.deliveryId,
    text: input.text.trim(),
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', replySecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-OpenBot-Timestamp': timestamp,
      'X-OpenBot-Signature': `sha256=${signature}`,
    },
    body,
  });
  if (response.status !== 200)
    throw new Error(
      `Twenty did not accept the reply (HTTP ${response.status})`,
    );
  return { saved: true };
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    let raw = '';
    for await (const chunk of process.stdin) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 65536)
        throw new Error('Reply input is too large');
    }
    const result = await sendTwentyReply(JSON.parse(raw), {
      workspaceId: process.env.TWENTY_WORKSPACE_ID,
      webhookSecret: process.env.OPENBOT_WEBHOOK_SECRET,
      replyUrl: process.env.TWENTY_REPLY_URL,
    });
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch {
    process.stderr.write(
      'Twenty reply failed. Check helper configuration, request eligibility and callback reachability.\n',
    );
    process.exitCode = 1;
  }
}
