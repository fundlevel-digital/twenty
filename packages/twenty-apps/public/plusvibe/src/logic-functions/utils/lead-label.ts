import { isNonEmptyString } from '@sniptt/guards';
import { z } from 'zod';
const LEAD_LABEL_SCHEMA = z
  .enum([
    'INTERESTED',
    'NOT_INTERESTED',
    'OUT_OF_OFFICE',
    'UNSUBSCRIBED',
    'OTHER',
  ])
  .catch('OTHER');
export const normalizeLeadLabel = (value: string | null | undefined) =>
  isNonEmptyString(value)
    ? LEAD_LABEL_SCHEMA.parse(value.trim().toUpperCase().replaceAll(' ', '_'))
    : null;
