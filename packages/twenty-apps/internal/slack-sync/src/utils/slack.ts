import { isNonEmptyString } from '@sniptt/guards';

export type SlackFile = {
  id: string;
  name?: string;
  title?: string;
  size?: number;
  url_private_download?: string;
  url_private?: string;
  is_external?: boolean;
  mode?: string;
  filetype?: string;
  file_access?: string;
};

export type SlackMessage = {
  ts: string;
  thread_ts?: string;
  user?: string;
  bot_id?: string;
  text?: string;
  reply_count?: number;
  edited?: { ts: string };
  reactions?: { name: string; count: number; users: string[] }[];
  files?: SlackFile[];
};
export type SlackConversation = {
  id: string;
  name?: string;
  user?: string;
  is_ext_shared?: boolean;
  is_member?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
};
export class SlackRateLimitError extends Error {
  constructor(readonly delayMs: number) {
    super('Slack rate limit');
  }
}
export const variable = (name: string): string => {
  const value = process.env[name];
  if (!isNonEmptyString(value)) throw new Error(`${name} is required`);
  return value;
};
export const slackRequest = async <TData>(
  token: string,
  method: string,
  parameters: Record<string, string> = {},
): Promise<TData> => {
  const response = await fetch(
    `https://slack.com/api/${method}?${new URLSearchParams(parameters)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (response.status === 429)
    throw new SlackRateLimitError(
      Math.max(1, Number(response.headers.get('retry-after')) || 60) * 1000,
    );
  if (!response.ok) throw new Error(`Slack HTTP ${response.status}`);
  const data = (await response.json()) as TData & {
    ok: boolean;
    error?: string;
  };
  if (!data.ok) throw new Error(`Slack ${data.error ?? 'request failed'}`);
  return data;
};
export const slackIdentity = (
  teamId: string,
  channelId: string,
  timestamp: string,
): string => `${teamId}:${channelId}:${timestamp}`;
export const timestampDate = (timestamp: string): string =>
  new Date(Number(timestamp) * 1000).toISOString();
