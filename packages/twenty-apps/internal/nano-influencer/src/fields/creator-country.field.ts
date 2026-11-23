import { defineField, FieldType } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';
import { COUNTRIES } from '../utils/countries';

export default defineField({
  universalIdentifier: IDENTIFIERS.creatorCountry,
  objectUniversalIdentifier: IDENTIFIERS.creator,
  name: 'creatorCountry',
  label: 'Country',
  type: FieldType.SELECT,
  icon: 'IconWorld',
  isNullable: true,
  isUIEditable: false,
  options: COUNTRIES.map((country, position) => ({
    ...country,
    position,
    color: 'gray',
  })),
});
