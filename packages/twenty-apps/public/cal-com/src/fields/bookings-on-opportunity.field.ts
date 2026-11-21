import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import {
  IDENTIFIERS,
  BOOKING_FIELDS,
  REVERSE_FIELDS,
} from 'src/constants/identifiers';
export default defineField({
  universalIdentifier: REVERSE_FIELDS.opportunity,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  name: 'calComBookings',
  label: 'Cal.com Bookings',
  type: FieldType.RELATION,
  icon: 'IconCalendarEvent',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: IDENTIFIERS.BOOKING,
  relationTargetFieldMetadataUniversalIdentifier: BOOKING_FIELDS.opportunity,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
