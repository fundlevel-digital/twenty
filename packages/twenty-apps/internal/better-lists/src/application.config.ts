import { defineApplication } from 'twenty-sdk/define';
import { IDENTIFIERS } from 'src/constants/identifiers';

export default defineApplication({
  universalIdentifier: IDENTIFIERS.APPLICATION,
  displayName: 'Better Lists',
  description:
    'Create lists and add selected records with list-specific attributes and views.',
  author: 'Fundlevel',
  logo: 'public/logo.svg',
});
