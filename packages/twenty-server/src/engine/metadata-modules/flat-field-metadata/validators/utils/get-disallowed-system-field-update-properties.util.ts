export const SYSTEM_FIELD_ALLOWED_UPDATE_PROPERTIES = [
  'universalSettings',
  'isActive',
] as const;

export const getDisallowedSystemFieldUpdateProperties = ({
  columnUpdate,
  overrideEntry,
}: {
  columnUpdate: Record<string, unknown>;
  overrideEntry: Record<string, unknown> | undefined;
}): string[] => {
  const allowedColumnProperties = new Set<string>(
    SYSTEM_FIELD_ALLOWED_UPDATE_PROPERTIES,
  );

  return [
    ...new Set([
      ...Object.keys(columnUpdate).filter(
        (property) => !allowedColumnProperties.has(property),
      ),
      ...Object.keys(overrideEntry ?? {}).filter(
        (property) => property !== 'isActive' && property !== 'translations',
      ),
    ]),
  ];
};
