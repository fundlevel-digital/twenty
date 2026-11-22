import { IDENTIFIERS } from '../constants/identifiers';
import {
  EMAIL_FILTER_OPTIONS,
  PERSONA_OPTIONS,
  SEARCH_COUNTRY_OPTIONS,
} from './search-input';

export type SearchField = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'record';
  label: string;
  description: string;
  hidden?: boolean;
  enum?: string[];
  enumLabels?: Record<string, string>;
  items?: SearchField;
  properties?: Record<string, SearchField>;
  objectUniversalIdentifier?: string;
  connectionProvider?: {
    applicationUniversalIdentifier: string;
    providerName: string;
    scope: 'WORKSPACE';
  };
};

const textArray = (label: string, description: string): SearchField => ({
  type: 'array',
  label,
  description,
  items: {
    type: 'string',
    label: 'Value',
    description: 'One keyword, topic or identifier per item.',
  },
});
const optionsField = (
  label: string,
  description: string,
  options: { value: string; label: string }[],
): SearchField => ({
  type: 'string',
  label,
  description,
  enum: options.map(({ value }) => value),
  enumLabels: Object.fromEntries(
    options.map(({ value, label }) => [value, label]),
  ),
});
const rangeField = (label: string, description: string): SearchField => ({
  type: 'object',
  label,
  description,
  properties: {
    min: {
      type: 'number',
      label: 'Minimum',
      description: 'Inclusive lower bound. Leave empty for no minimum.',
    },
    max: {
      type: 'number',
      label: 'Maximum',
      description: 'Inclusive upper bound. Leave empty for no maximum.',
    },
  },
});
const countriesField = (label: string, description: string): SearchField => ({
  type: 'array',
  label,
  description,
  items: optionsField(
    'Country',
    'Choose countries by name. Nano receives ISO 3166-1 numeric codes.',
    SEARCH_COUNTRY_OPTIONS,
  ),
});

export const SEARCH_INPUT_PROPERTIES: Record<string, SearchField> = {
  creatorId: {
    type: 'record',
    label: 'Lookalike Seed',
    description:
      'The Nano Creator whose content and audience should guide this search.',
    objectUniversalIdentifier: IDENTIFIERS.creator,
  },
  connectionId: {
    type: 'string',
    label: 'API Connection',
    description:
      'Choose a saved NanoInfluencer connection from app settings. A selected list must belong to the same connection.',
    connectionProvider: {
      applicationUniversalIdentifier: IDENTIFIERS.application,
      providerName: 'nano-influencer',
      scope: 'WORKSPACE',
    },
  },
  requestId: {
    type: 'string',
    label: 'Retry Safety Key',
    hidden: true,
    description:
      'Optional advanced UUID for safely retrying the same submission. Commands generate it automatically; a reused key never submits another paid search.',
  },
  listId: {
    type: 'record',
    label: 'Nano List',
    description:
      'Optional Nano project that scopes favourites, hides and recent-result deduplication.',
    objectUniversalIdentifier: IDENTIFIERS.list,
  },
  keyword: {
    type: 'string',
    label: 'Keywords',
    description:
      'The keyword text passed to Nano alongside the lookalike seed. Leave empty to use the seed alone.',
  },
  posTags: textArray(
    'Include Keywords',
    'Content keywords or topics that matching creators should include.',
  ),
  negTags: textArray(
    'Exclude Keywords',
    'Content keywords or topics that matching creators should exclude.',
  ),
  negativeTopics: textArray(
    'Negative Seed Topics',
    'Exact topic names from the seed profile to subtract from similarity ranking. The full seed topic vector is retained.',
  ),
  filters: {
    type: 'object',
    label: 'Search Filters',
    description:
      'Optional limits passed to Nano. Empty limits do not restrict results.',
    properties: {
      subs: rangeField(
        'Subscribers / Followers',
        'Minimum and maximum subscriber or follower count.',
      ),
      views: rangeField(
        'Median Views',
        'Minimum and maximum median views per post.',
      ),
      posts: rangeField(
        'Posts',
        'Minimum and maximum number of published posts.',
      ),
      er: rangeField(
        'Engagement Rate (%)',
        'Minimum and maximum engagement rate as a percentage, such as 2 for 2%.',
      ),
      vr: rangeField(
        'View Rate (%)',
        'Minimum and maximum views divided by subscribers as a percentage.',
      ),
      lastPostDays: {
        type: 'number',
        label: 'Last Post Within Days',
        description:
          'Require a post within this many days. Leave empty for no activity limit.',
      },
      email: optionsField(
        'Email Availability',
        'Choose whether Nano should require an email, including its deep-search option.',
        EMAIL_FILTER_OPTIONS,
      ),
      igender: {
        type: 'array',
        label: 'Creator Personas',
        description: 'Include any of the selected creator personas.',
        items: optionsField(
          'Persona',
          'The creator persona inferred by Nano.',
          PERSONA_OPTIONS,
        ),
      },
      country: countriesField(
        'Include Countries',
        'Restrict results to these countries. Use either Include Countries or Exclude Countries.',
      ),
      excludeCountry: countriesField(
        'Exclude Countries',
        'Exclude these countries. Leave Include Countries empty when using this filter.',
      ),
      shopSales: {
        type: 'boolean',
        label: 'Has Shop Sales',
        description: 'Require shop sales. Available for TikTok seeds only.',
      },
    },
  },
  useShortsSearch: {
    type: 'boolean',
    label: 'Search YouTube Shorts',
    description: 'Search Shorts content. Available for YouTube seeds only.',
  },
  filterFavor: {
    type: 'boolean',
    label: 'Exclude List Favourites',
    description:
      'Exclude creators already favourited in the selected Nano list. Defaults to enabled.',
  },
  useRecentDedup: {
    type: 'boolean',
    label: 'Exclude Recent Results',
    description:
      'Ask Nano to deduplicate against recent searches for the list. Defaults to enabled.',
  },
  pagination: {
    type: 'object',
    label: 'Continue Previous Results',
    description:
      'Advanced: supply all continuation values from a prior Nano result to request another page. Leave empty for a new search.',
    properties: {
      nextToken: {
        type: 'string',
        label: 'Next Page Token',
        description: 'The nextToken returned by the previous Nano search.',
      },
      nextIds: textArray(
        'Next Creator IDs',
        'The nextIds returned by the previous Nano search.',
      ),
      excludeIds: textArray(
        'Previously Returned Creator IDs',
        'All creator IDs already returned, to prevent duplicate results.',
      ),
    },
  },
};
