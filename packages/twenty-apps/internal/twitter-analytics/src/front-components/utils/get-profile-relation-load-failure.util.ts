import { isObject } from '@sniptt/guards';

export type ProfileRelationLoadFailure =
  'preview-access' | 'session' | 'permission' | 'settings' | 'application';

export const getProfileRelationLoadFailure = (
  error: unknown,
  source: 'settings' | 'application',
): ProfileRelationLoadFailure => {
  if (!isObject(error)) return source;
  if ('status' in error) {
    if (
      error.status === 401 &&
      'body' in error &&
      typeof error.body === 'string' &&
      error.body.trim() === 'Sign in to view this preview.'
    )
      return 'preview-access';
    if (error.status === 401) return 'session';
    if (error.status === 403) return 'permission';
  }
  if ('errors' in error && Array.isArray(error.errors)) {
    const codes = error.errors.flatMap((entry: unknown) =>
      isObject(entry) &&
      'extensions' in entry &&
      isObject(entry.extensions) &&
      'code' in entry.extensions
        ? [entry.extensions.code]
        : [],
    );
    if (codes.includes('UNAUTHENTICATED')) return 'session';
    if (codes.includes('FORBIDDEN') || codes.includes('PERMISSION_DENIED'))
      return 'permission';
  }
  return source;
};
