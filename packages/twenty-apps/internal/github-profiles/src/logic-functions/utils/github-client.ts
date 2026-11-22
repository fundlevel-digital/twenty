import { createHash } from 'node:crypto';
import { kv } from 'twenty-sdk/logic-function';
import { type GithubCredential } from 'src/logic-functions/utils/github-credentials';

export type GithubStateStore = {
  get: <TValue>(key: string) => Promise<TValue | null>;
  set: <TValue>(key: string, value: TValue) => Promise<void>;
};
export class GithubRateLimitError extends Error {
  constructor(
    readonly retryAt: number,
    readonly kind: 'primary' | 'secondary',
  ) {
    super(
      `GitHub ${kind} rate limit. Retry after ${new Date(retryAt).toISOString()}.`,
    );
    this.name = 'GithubRateLimitError';
  }
}
export class GithubClient {
  readonly #credentials: GithubCredential[];
  readonly #store: GithubStateStore;
  readonly #fetch: typeof fetch;
  readonly #now: () => number;
  readonly #wait: (milliseconds: number) => Promise<void>;
  readonly #unavailable = new Set<string>();
  constructor(options: {
    credentials: GithubCredential[];
    store?: GithubStateStore;
    fetchImplementation?: typeof fetch;
    now?: () => number;
    wait?: (milliseconds: number) => Promise<void>;
  }) {
    this.#credentials = options.credentials;
    this.#store = options.store ?? kv;
    this.#fetch =
      options.fetchImplementation ??
      ((input, init) => globalThis.fetch(input, init));
    this.#now = options.now ?? Date.now;
    this.#wait =
      options.wait ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }
  #fingerprint(credential: GithubCredential) {
    return createHash('sha256')
      .update(credential.token ?? 'anonymous')
      .digest('hex');
  }
  async #send(path: string, credential: GithubCredential) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.#fetch(`https://api.github.com${path}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Twenty-GitHub-Profiles',
            ...(credential.token
              ? { Authorization: `Bearer ${credential.token}` }
              : {}),
          },
          signal: AbortSignal.timeout(15_000),
        });
        if (response.status >= 500 && attempt < 2) {
          await response.body?.cancel();
          await this.#wait(1000 * 2 ** attempt);
          continue;
        }
        return response;
      } catch {
        if (attempt === 2)
          throw new Error(
            'GitHub network request failed. Retry the job later.',
          );
        await this.#wait(1000 * 2 ** attempt);
      }
    }
    throw new Error('GitHub request failed.');
  }
  #resetAt(response: Response, resource: 'core' | 'search' = 'core') {
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
    return Number.isFinite(reset) && reset > this.#now()
      ? reset + 1000
      : this.#now() + (resource === 'search' ? 60_000 : 3_600_000);
  }
  #quotaKey(owner: string, resource: 'core' | 'search') {
    return resource === 'core'
      ? `github:quota:${owner}`
      : `github:quota:search:${owner}`;
  }
  async #classify(
    response: Response,
    credential: GithubCredential,
    owner: string,
    resource: 'core' | 'search' = 'core',
  ) {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const until = this.#resetAt(response, resource);
      await this.#store.set(this.#quotaKey(owner, resource), until);
    }
    if (response.ok) return 'success' as const;
    let message = '';
    try {
      const body: unknown = await response.clone().json();
      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof body.message === 'string'
      )
        message = body.message;
    } catch {}
    if (
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.has('retry-after') ||
          /secondary rate limit|abuse detection/i.test(message)))
    ) {
      const previous = await this.#store.get<{ attempts: number }>(
        'github:secondary',
      );
      const attempts = Math.min((previous?.attempts ?? 0) + 1, 5);
      const header = response.headers.get('retry-after');
      const seconds = header === null ? Number.NaN : Number(header);
      const delay = Number.isFinite(seconds)
        ? seconds * 1000
        : header
          ? Date.parse(header) - this.#now()
          : 0;
      const until =
        this.#now() +
        Math.max(
          60_000 * 2 ** (attempts - 1),
          Number.isFinite(delay) ? delay : 0,
        ) +
        1000;
      await this.#store.set('github:secondary', { until, attempts });
      throw new GithubRateLimitError(until, 'secondary');
    }
    if (response.headers.get('x-ratelimit-remaining') === '0')
      return 'primary' as const;
    if (response.status === 401) {
      this.#unavailable.add(credential.id);
      await this.#store.set(
        `github:invalid:${this.#fingerprint(credential)}`,
        this.#now() + 300_000,
      );
      return 'invalid' as const;
    }
    if (response.status === 403) {
      this.#unavailable.add(credential.id);
      return 'invalid' as const;
    }
    throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  }
  async request(path: string): Promise<{ body: unknown; next: boolean }> {
    const resource = path.startsWith('/search/commits?') ? 'search' : 'core';
    if (
      !path.startsWith('/users/') &&
      path !== '/user' &&
      resource !== 'search'
    )
      throw new Error('Unsupported GitHub API path.');
    const secondary = await this.#store.get<{ until: number }>(
      'github:secondary',
    );
    if (secondary && secondary.until > this.#now())
      throw new GithubRateLimitError(secondary.until, 'secondary');
    const retryTimes: number[] = [];
    for (const credential of this.#credentials) {
      if (this.#unavailable.has(credential.id)) continue;
      const fingerprint = this.#fingerprint(credential);
      const invalidUntil = await this.#store.get<number>(
        `github:invalid:${fingerprint}`,
      );
      if (invalidUntil && invalidUntil > this.#now()) continue;
      let owner =
        credential.ownerId ??
        (await this.#store.get<string>(`github:owner:${fingerprint}`));
      if (!owner && credential.token) {
        const identity = await this.#send('/user', credential);
        const kind = await this.#classify(
          identity,
          credential,
          `unresolved:${fingerprint}`,
        );
        if (kind === 'primary') {
          retryTimes.push(this.#resetAt(identity));
          continue;
        }
        if (kind === 'invalid') continue;
        const body: unknown = await identity.json();
        if (
          !body ||
          typeof body !== 'object' ||
          !('id' in body) ||
          typeof body.id !== 'number'
        )
          throw new Error('GitHub could not identify the API key account.');
        owner = String(body.id);
        credential.ownerId = owner;
        await this.#store.set(`github:owner:${fingerprint}`, owner);
        if (identity.headers.get('x-ratelimit-remaining') === '0')
          await this.#store.set(
            `github:quota:${owner}`,
            this.#resetAt(identity),
          );
      }
      owner ??= 'anonymous';
      const until = await this.#store.get<number>(
        this.#quotaKey(owner, resource),
      );
      if (until && until > this.#now()) {
        retryTimes.push(until);
        continue;
      }
      const response = await this.#send(path, credential);
      const kind = await this.#classify(response, credential, owner, resource);
      if (kind === 'primary') {
        retryTimes.push(this.#resetAt(response, resource));
        continue;
      }
      if (kind === 'invalid') continue;
      return {
        body: (await response.json()) as unknown,
        next: response.headers.get('link')?.includes('rel="next"') ?? false,
      };
    }
    if (retryTimes.length)
      throw new GithubRateLimitError(Math.min(...retryTimes), 'primary');
    throw new Error(
      'No usable GitHub API keys remain. Reconnect GitHub OAuth or check personal access tokens in the app settings.',
    );
  }
}
