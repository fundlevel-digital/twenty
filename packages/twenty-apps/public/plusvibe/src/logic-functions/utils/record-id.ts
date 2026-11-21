import { v5 as uuidV5 } from 'uuid';
import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export const recordId = (...parts: string[]) =>
  uuidV5(JSON.stringify(parts), APPLICATION_UNIVERSAL_IDENTIFIER);
