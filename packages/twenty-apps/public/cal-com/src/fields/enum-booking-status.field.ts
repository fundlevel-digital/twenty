import { defineField, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineField({
  universalIdentifier: '6057941f-52cb-5fc1-a9ec-a8587a8c1441',
  objectUniversalIdentifier: IDENTIFIERS.BOOKING,
  name: 'bookingStatus',
  label: 'Status',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '265fc8e8-625e-5036-8e1d-b771fe0b739e',
      value: 'ACCEPTED',
      label: 'Accepted',
      position: 0,
      color: 'green',
    },
    {
      id: 'b45b6f83-2a75-576c-8237-61a2f3eac4bc',
      value: 'PENDING',
      label: 'Pending',
      position: 1,
      color: 'yellow',
    },
    {
      id: '584309a3-7632-5c14-91a2-0cc4d9d84a0d',
      value: 'CANCELLED',
      label: 'Cancelled',
      position: 2,
      color: 'red',
    },
    {
      id: '446e47ea-3dfc-5dd5-ac9d-9bafdd7d1739',
      value: 'REJECTED',
      label: 'Rejected',
      position: 3,
      color: 'red',
    },
    {
      id: '0c156a5d-0f0b-569d-823c-8a10fca17f9f',
      value: 'RESCHEDULED',
      label: 'Rescheduled',
      position: 4,
      color: 'blue',
    },
    {
      id: '80760a3f-6837-51d0-b18c-fb9e758e2fc3',
      value: 'NO_SHOW',
      label: 'No-Show',
      position: 5,
      color: 'orange',
    },
    {
      id: '52ea5bd4-108c-5ff8-8824-222110fcd27b',
      value: 'OTHER',
      label: 'Other',
      position: 6,
      color: 'gray',
    },
  ],
});
