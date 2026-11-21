import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS, BOOKING_FIELDS } from 'src/constants/identifiers';
export default defineView({
  universalIdentifier: IDENTIFIERS.VIEW,
  name: 'All Cal.com Bookings',
  icon: 'IconCalendarEvent',
  objectUniversalIdentifier: IDENTIFIERS.BOOKING,
  type: 'TABLE',
  fields: [
    {
      universalIdentifier: 'bd5c26e2-b65e-4748-b2aa-c1921a3bae61',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.name,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: 'ffd602cc-eb4d-4e53-a7ea-5c0166145b34',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.status,
      position: 1,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: '1ba28828-b681-4f7a-bd0f-5ac57f4d2cb4',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.startsAt,
      position: 2,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: 'a32d24a9-550a-4a48-8fff-7e46c9ffd8b9',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.attendeeEmail,
      position: 3,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: '85a2bd13-8599-494c-952c-512abf6b5255',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.hostEmail,
      position: 4,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'e7e7213f-9e07-4e64-b880-b922059f82bb',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.person,
      position: 5,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: 'ec236cc6-587d-4ef3-b8fb-290e50569eb4',
      fieldMetadataUniversalIdentifier: BOOKING_FIELDS.eventType,
      position: 6,
      isVisible: true,
      size: 150,
    },
  ],
});
