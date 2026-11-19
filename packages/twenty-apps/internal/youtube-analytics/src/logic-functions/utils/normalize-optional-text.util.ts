import { isNonEmptyString, isString } from '@sniptt/guards';

// Twenty TEXT fields store an empty string where Attio had no value, which
// would otherwise stop the `??` fallbacks between identity fields.
export const normalizeOptionalText = (value: unknown): string | null => {
  if (!isString(value)) {
    return null;
  }

  const trimmedValue = value.trim();

  return isNonEmptyString(trimmedValue) ? trimmedValue : null;
};
