import { defineView } from 'twenty-sdk/define';
import { IDENTIFIERS } from '../constants/identifiers';

export default defineView({
  universalIdentifier: IDENTIFIERS.byCountryView,
  name: 'By Country',
  icon: 'IconLayoutList',
  type: 'TABLE',
  objectUniversalIdentifier: IDENTIFIERS.creator,
  mainGroupByFieldMetadataUniversalIdentifier: IDENTIFIERS.creatorCountry,
  groupLoadLimit: 100,
  shouldHideEmptyGroups: true,
  fields: [
    {
      universalIdentifier: '9dce39b0-e977-4b77-ac90-e95dafe91483',
      fieldMetadataUniversalIdentifier: IDENTIFIERS.creatorCountry,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: '82975853-3ce1-416d-8c0b-a03d32280f25',
      fieldMetadataUniversalIdentifier: '4a39d35e-18cd-5640-87ea-70aa58af95e7',
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: 'be809fd3-fa66-455a-95c8-742713864486',
      fieldMetadataUniversalIdentifier: 'eb5b82a0-ed9d-53a3-9d8a-91ee76dbc252',
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: 'f2310799-29b7-4c1c-84fe-914ac751773e',
      fieldMetadataUniversalIdentifier: 'c75be839-0fd9-54c1-ac09-a03b002965f9',
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: 'ee21b85f-0bdd-4785-a1a5-b8274338085b',
      fieldMetadataUniversalIdentifier: 'd0cbe69c-00d3-58a1-8c64-96a2aa8d2571',
      position: 4,
      isVisible: true,
      size: 220,
    },
  ],
});
