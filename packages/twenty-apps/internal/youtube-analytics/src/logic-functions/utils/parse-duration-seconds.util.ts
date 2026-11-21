import { isNonEmptyString } from '@sniptt/guards';

const ISO_8601_DURATION_PATTERN =
  /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

export const parseDurationSeconds = (duration: string | undefined): number => {
  if (!isNonEmptyString(duration)) {
    return 0;
  }

  const match = duration.match(ISO_8601_DURATION_PATTERN);

  if (match === null) {
    return 0;
  }

  return (
    Number(match[1] ?? 0) * 86_400 +
    Number(match[2] ?? 0) * 3_600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
};
