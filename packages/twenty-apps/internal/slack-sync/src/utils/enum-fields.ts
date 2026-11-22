const ENUM_VALUES: Record<string, readonly string[]> = {
  slackAttachmentState: ['IMPORTED', 'UNAVAILABLE', 'FAILED', 'CHANGED'],
};

export const normalizeEnumValue = (
  field: string,
  value: unknown,
): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  let normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  if (field === 'eventCategory' && normalized.startsWith('LEAD_MARKED_AS_'))
    normalized = 'LEAD_LABEL_CHANGED';
  if (field === 'slackAttachmentState')
    normalized =
      normalized === 'IMPORTED'
        ? 'IMPORTED'
        : normalized.startsWith('IMPORT_FAILED')
          ? 'FAILED'
          : normalized.startsWith('EXISTING_NATIVE_ATTACHMENT_BATCH')
            ? 'CHANGED'
            : 'UNAVAILABLE';
  const values = ENUM_VALUES[field];
  if (!values) throw new Error('Unknown enum field');
  return values.includes(normalized)
    ? normalized
    : values.includes('OTHER')
      ? 'OTHER'
      : null;
};
