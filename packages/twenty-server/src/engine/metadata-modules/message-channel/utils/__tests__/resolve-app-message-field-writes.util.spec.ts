import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { resolveAppMessageFieldWrites } from '../resolve-app-message-field-writes.util';

const IDENTIFIER = 'a0e6e9ab-ddb0-44ae-b1da-e8217ebc1dd4';
const RECORD_ID = '6a2a2ce5-94a7-4ae4-a1a4-fcfb79b549a7';
const FIELD = {
  universalIdentifier: IDENTIFIER,
  applicationId: 'app',
  objectMetadataId: 'messages',
  isActive: true,
  name: 'slackMessageId',
  type: FieldMetadataType.TEXT,
} as FlatFieldMetadata;
const OBJECTS = [
  { id: 'messages', nameSingular: 'message', applicationId: 'standard' },
  { id: 'channels', nameSingular: 'slackChannel', applicationId: 'app' },
] as FlatObjectMetadata[];
const resolve = (field: FlatFieldMetadata, value: string | null = 'T:C:123') =>
  resolveAppMessageFieldWrites({
    applicationId: 'app',
    objectName: 'message',
    values: { [IDENTIFIER]: value },
    fields: [field],
    objects: OBJECTS,
  });

describe('resolveAppMessageFieldWrites', () => {
  it('writes app-owned native messaging extension fields by universal identifier', () => {
    expect(resolve(FIELD)).toEqual({
      patch: { slackMessageId: 'T:C:123' },
      references: [],
    });
  });
  it('rejects native, other-app and unrelated-object fields', () => {
    expect(() => resolve({ ...FIELD, applicationId: 'standard' })).toThrow();
    expect(() => resolve({ ...FIELD, applicationId: 'other' })).toThrow();
    expect(() => resolve({ ...FIELD, objectMetadataId: 'channels' })).toThrow();
  });
  it('only permits many-to-one references to own objects or native messages', () => {
    const relation = {
      ...FIELD,
      name: 'slackChannel',
      type: FieldMetadataType.RELATION,
      settings: { relationType: RelationType.MANY_TO_ONE },
      relationTargetObjectMetadataId: 'channels',
    } as FlatFieldMetadata;
    expect(resolve(relation, RECORD_ID)).toEqual({
      patch: { slackChannelId: RECORD_ID },
      references: [{ objectName: 'slackChannel', id: RECORD_ID }],
    });
    expect(() => resolve(relation, 'not-a-uuid')).toThrow();
    expect(() =>
      resolve(
        { ...relation, relationTargetObjectMetadataId: 'foreign-object' },
        RECORD_ID,
      ),
    ).toThrow();
  });
});
