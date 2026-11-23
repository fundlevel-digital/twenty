import { defineField, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineField({
  universalIdentifier: 'eb5b82a0-ed9d-53a3-9d8a-91ee76dbc252',
  objectUniversalIdentifier: IDENTIFIERS.creator,
  name: 'creatorPlatform',
  label: 'Platform',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '919a196a-9566-57b4-8c86-c84815b15788',
      value: 'YTB',
      label: 'YouTube',
      position: 0,
      color: 'red',
    },
    {
      id: '91ea3519-fbbb-5bf1-bdf6-294afeb2ab68',
      value: 'TWT',
      label: 'X',
      position: 1,
      color: 'gray',
    },
    {
      id: '0492d3c3-2ed9-5c9e-8919-a6f940c3daec',
      value: 'INS',
      label: 'Instagram',
      position: 2,
      color: 'pink',
    },
    {
      id: 'fa02814a-a0c0-5ddd-af6b-9ca5f2e0f9f6',
      value: 'TIK',
      label: 'TikTok',
      position: 3,
      color: 'purple',
    },
  ],
});
