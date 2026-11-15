// Unipile API v2 client for reads. Spaces calls so one LinkedIn account stays under the
// per-minute limit (30/min on our plan), waits out 429s while there is time, and never sends.

const BASE_URL = 'https://api.unipile.com/v2';
const DEFAULT_SPACING_MS = 2100;
const REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_RATE_LIMIT_WAIT_MS = 60000;

export class UnipileError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UnipileError';
  }
}

export class OutOfTimeError extends Error {
  constructor() {
    super('Out of time for this run');
    this.name = 'OutOfTimeError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type UnipilePage<T> = { data?: T[]; next_cursor?: string | null };

export class Unipile {
  private lastCallAt = 0;
  calls = 0;

  constructor(
    private readonly apiKey: string,
    private readonly options: { deadlineAt?: number; spacingMs?: number } = {},
  ) {
    if (!apiKey) throw new UnipileError('UNIPILE_API_KEY is not set');
  }

  hasTime(marginMs = 0) {
    return !this.options.deadlineAt || Date.now() + marginMs < this.options.deadlineAt;
  }

  async get<T = any>(path: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = this.lastCallAt + (this.options.spacingMs ?? DEFAULT_SPACING_MS) - Date.now();
      if (wait > 0) await sleep(wait);
      if (!this.hasTime()) throw new OutOfTimeError();
      this.lastCallAt = Date.now();
      this.calls++;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(BASE_URL + path, {
          headers: { 'X-API-KEY': this.apiKey, accept: 'application/json' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 + 500 : DEFAULT_RATE_LIMIT_WAIT_MS;
        if (!this.hasTime(waitMs + 5000)) throw new OutOfTimeError();
        await sleep(waitMs);
        continue;
      }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 200);
        throw new UnipileError(`Unipile HTTP ${response.status} for ${path.split('?')[0]}: ${detail}`, response.status);
      }
      return (await response.json()) as T;
    }
    throw new UnipileError(`Unipile rate limit did not clear for ${path.split('?')[0]}`, 429);
  }
}

export const withCursor = (path: string, cursor?: string | null) =>
  cursor ? `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}` : path;
