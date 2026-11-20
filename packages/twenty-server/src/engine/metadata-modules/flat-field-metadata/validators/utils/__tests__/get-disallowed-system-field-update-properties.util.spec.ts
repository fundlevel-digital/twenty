import { getDisallowedSystemFieldUpdateProperties } from 'src/engine/metadata-modules/flat-field-metadata/validators/utils/get-disallowed-system-field-update-properties.util';

describe('system field presentation updates', () => {
  it('allows workspace translations without changing the system field definition', () => {
    expect(
      getDisallowedSystemFieldUpdateProperties({
        columnUpdate: {},
        overrideEntry: { translations: { en: { label: 'Creation Date' } } },
      }),
    ).toEqual([]);
  });

  it('preserves existing settings and activation updates', () => {
    expect(
      getDisallowedSystemFieldUpdateProperties({
        columnUpdate: { universalSettings: {}, isActive: true },
        overrideEntry: { isActive: false },
      }),
    ).toEqual([]);
  });

  it('continues rejecting schema edits and base-label changes', () => {
    expect(
      getDisallowedSystemFieldUpdateProperties({
        columnUpdate: { name: 'newName', type: 'TEXT', label: 'New Label' },
        overrideEntry: { name: 'overriddenName', label: 'Overridden Label' },
      }),
    ).toEqual(['name', 'type', 'label']);
  });
});
