import { describe, expect, it } from 'vitest';
import { getProfileRelationLoadFailure } from 'src/front-components/utils/get-profile-relation-load-failure.util';

describe('Profile relation settings load failures', () => {
  it('identifies an expired session after the REST client cannot refresh it', () => {
    expect(getProfileRelationLoadFailure({ status: 401 }, 'settings')).toBe(
      'session',
    );
  });

  it('distinguishes a REST permission failure from a server failure', () => {
    expect(getProfileRelationLoadFailure({ status: 403 }, 'settings')).toBe(
      'permission',
    );
    expect(getProfileRelationLoadFailure({ status: 503 }, 'settings')).toBe(
      'settings',
    );
  });

  it.each(['FORBIDDEN', 'PERMISSION_DENIED'])(
    'identifies GraphQL %s as a permission failure',
    (code) => {
      expect(
        getProfileRelationLoadFailure(
          { errors: [{ extensions: { code } }] },
          'application',
        ),
      ).toBe('permission');
    },
  );

  it('identifies an expired metadata session', () => {
    expect(
      getProfileRelationLoadFailure(
        { errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] },
        'application',
      ),
    ).toBe('session');
  });

  it('preserves the failing request when the server error is unknown', () => {
    expect(
      getProfileRelationLoadFailure(
        new TypeError('Failed to fetch'),
        'settings',
      ),
    ).toBe('settings');
    expect(
      getProfileRelationLoadFailure(
        { errors: [null, 'unexpected', { extensions: null }] },
        'application',
      ),
    ).toBe('application');
  });

  it('does not expose arbitrary error messages or response bodies', () => {
    expect(
      getProfileRelationLoadFailure(
        { message: 'Private server diagnostic', body: { detail: 'Private' } },
        'settings',
      ),
    ).toBe('settings');
  });
});
