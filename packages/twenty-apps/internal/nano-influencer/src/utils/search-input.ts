import { z } from 'zod';
import { isObject } from '@sniptt/guards';
import { COUNTRIES, normalizeCountry } from './countries';
import { COUNTRY_NUMERIC_CODES } from './country-numeric-codes';

export const PERSONA_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'org', label: 'Organization' },
];

export const EMAIL_FILTER_OPTIONS = [
  { value: 'ANY', label: 'Any Email Availability' },
  { value: 'AVAILABLE', label: 'Has Email' },
  { value: 'DEEP', label: 'Has Email Including Deep Search' },
];

const bound = z.number().finite().nonnegative();
const rangeSchema = z
  .union([
    z.object({ min: bound.optional(), max: bound.optional() }).strict(),
    z.array(bound).min(1).max(2),
  ])
  .refine((range) => {
    const [minimum, maximum] = Array.isArray(range)
      ? range
      : [range.min, range.max];
    return minimum === undefined || maximum === undefined || minimum <= maximum;
  }, 'Minimum must be at most maximum.');

const countrySchema = z
  .union([z.string(), z.number().int()])
  .transform((value, context) => {
    if (
      typeof value === 'number' &&
      Object.values(COUNTRY_NUMERIC_CODES).includes(value)
    )
      return value;
    const code =
      typeof value === 'string' ? normalizeCountry(value) : undefined;
    if (code && COUNTRY_NUMERIC_CODES[code] !== undefined)
      return COUNTRY_NUMERIC_CODES[code];
    context.addIssue({ code: 'custom', message: 'Select a valid country.' });
    return z.NEVER;
  });

const removeEmptyInputs = (value: unknown): unknown => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  )
    return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map(removeEmptyInputs)
      .filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (!isObject(value)) return value;
  const entries = Object.entries(value)
    .map(([key, child]) => [key, removeEmptyInputs(child)] as const)
    .filter(([, child]) => child !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

export const searchInputSchema = z.preprocess(
  removeEmptyInputs,
  z
    .object({
      creatorId: z.uuid(),
      connectionId: z.string().min(1).optional(),
      listId: z.uuid().optional(),
      requestId: z.uuid().optional(),
      keyword: z.string().trim().optional(),
      posTags: z.array(z.string().trim().min(1)).optional(),
      negTags: z.array(z.string().trim().min(1)).optional(),
      negativeTopics: z.array(z.string().min(1)).optional(),
      useShortsSearch: z.boolean().optional(),
      filterFavor: z.boolean().optional(),
      useRecentDedup: z.boolean().optional(),
      filters: z
        .object({
          subs: rangeSchema.optional(),
          views: rangeSchema.optional(),
          posts: rangeSchema.optional(),
          er: rangeSchema.optional(),
          vr: rangeSchema.optional(),
          lastPostDays: z.number().int().positive().optional(),
          email: z
            .union([
              z.boolean(),
              z.enum(['ANY', 'AVAILABLE', 'DEEP']),
              z.literal('deep'),
            ])
            .optional(),
          igender: z
            .array(z.enum(['male', 'female', 'neutral', 'org']))
            .optional(),
          country: z.array(countrySchema).optional(),
          excludeCountry: z.array(countrySchema).optional(),
          shopSales: z.boolean().optional(),
        })
        .strict()
        .refine(
          (filters) =>
            !filters.country?.length || !filters.excludeCountry?.length,
          {
            message:
              'Include Countries and Exclude Countries cannot both be selected.',
            path: ['excludeCountry'],
          },
        )
        .optional(),
      pagination: z
        .object({
          nextToken: z.string().min(1),
          nextIds: z.array(z.string().min(1)).min(1),
          excludeIds: z.array(z.string().min(1)).default([]),
        })
        .optional(),
    })
    .strict(),
);

export type SearchInput = z.infer<typeof searchInputSchema>;

export const getSearchFilters = (input: SearchInput['filters']) => {
  const filters: Record<string, unknown> = {};
  for (const key of ['subs', 'views', 'posts', 'er', 'vr'] as const) {
    const range = input?.[key];
    if (!range) continue;
    if (Array.isArray(range)) filters[key] = range;
    else if (range.min !== undefined || range.max !== undefined)
      filters[key] =
        range.max === undefined ? [range.min] : [range.min ?? 0, range.max];
  }
  if (input?.lastPostDays !== undefined)
    filters.lastPostDays = input.lastPostDays;
  if (input?.email === true || input?.email === 'AVAILABLE')
    filters.email = true;
  if (input?.email === 'DEEP' || input?.email === 'deep')
    filters.email = 'deep';
  for (const key of ['igender', 'country', 'excludeCountry'] as const)
    if (input?.[key]?.length) filters[key] = input[key];
  if (input?.shopSales) filters.shopSales = true;
  return filters;
};

export const SEARCH_COUNTRY_OPTIONS = [...COUNTRIES]
  .sort((left, right) => left.label.localeCompare(right.label))
  .map(({ value, label }) => ({ value, label }));
