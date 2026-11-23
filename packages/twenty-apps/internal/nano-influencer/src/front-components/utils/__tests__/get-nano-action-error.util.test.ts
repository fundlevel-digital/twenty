import { describe, expect, it } from 'vitest';
import { RestApiClientError } from 'twenty-client-sdk/rest';
import { getNanoActionError } from '../get-nano-action-error.util';

describe('Nano action errors', () => {
  it('shows the server explanation instead of the generic HTTP failure', () => {
    const error = new RestApiClientError('Request failed', {
      status: 500,
      body: { messages: ['No usable Nano connections remain.'] },
    });
    expect(getNanoActionError(error)).toBe(
      'No usable Nano connections remain.',
    );
  });

  it('preserves a network failure when no server response was received', () => {
    expect(getNanoActionError(new TypeError('Failed to fetch'))).toBe(
      'Failed to fetch',
    );
  });

  it('does not turn an unknown thrown value into a misleading explanation', () => {
    expect(getNanoActionError({})).toBeUndefined();
  });
});
