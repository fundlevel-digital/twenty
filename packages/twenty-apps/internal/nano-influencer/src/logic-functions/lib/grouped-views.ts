import { createHash } from 'node:crypto';
import { z } from 'zod';
import { IDENTIFIERS } from '../../constants/identifiers';
import { enqueue } from './jobs';
import { getEmailAvailability } from '../../utils/email-availability';
import { Workspace, WorkspaceRateLimitError } from './workspace';

export const membershipGroupValuesSchema = z
  .array(
    z.object({
      creatorId: z.uuid(),
      listId: z.uuid(),
      decisionMakerId: z.uuid().nullable().optional(),
    }),
  )
  .max(100);
export const groupedViewsInputSchema = z.object({
  after: z.string().nullable().default(null),
  position: z.number().int().nonnegative().default(0),
  records: membershipGroupValuesSchema.optional(),
  attempt: z.number().int().min(0).max(3).optional(),
  phase: z.enum(['MEMBERSHIPS', 'COUNTRIES']).optional(),
});
type GroupedView = {
  id: string;
  universalIdentifier: string;
  mainGroupByFieldMetadataId: string | null;
  viewGroups: { id: string; fieldValue: string; position: number }[];
};
const GROUP_FIELDS = {
  listId: '0bfd398f-ff16-543b-b061-e5d633737344',
  creatorId: '9a00d802-d107-5b55-a6b0-a4b71d51c6a5',
  decisionMakerId: IDENTIFIERS.membershipDecisionMaker,
  creatorCountry: IDENTIFIERS.creatorCountry,
  emailAvailability: IDENTIFIERS.creatorEmailAvailability,
};
const VIEW_IDENTIFIERS = new Set([
  IDENTIFIERS.byCountryView,
  IDENTIFIERS.byEmailAvailabilityView,
  IDENTIFIERS.byListView,
  IDENTIFIERS.byCreatorView,
  IDENTIFIERS.byDecisionMakerView,
  'e1c544f8-bf62-5608-9fb2-c259dd218197',
]);
const groupId = (viewId: string, fieldValue: string) => {
  const digest = createHash('sha256')
    .update(`${viewId}:${fieldValue}`)
    .digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
};

export const saveDecisionMaker = async (
  workspace: Workspace,
  operatorId: string,
  operator: Record<string, unknown>,
  connectionId: string,
) => {
  const email =
    typeof operator.email === 'string' &&
    z.email().safeParse(operator.email.trim()).success
      ? operator.email.trim().toLowerCase()
      : '';
  const displayName =
    typeof operator.name === 'string' ? operator.name : operatorId;
  return workspace.upsert(
    'User',
    email ? `email:${email}` : `${connectionId}:${operatorId}`,
    {
      name: email || displayName || operatorId,
      displayName,
      email: { primaryEmail: email, additionalEmails: [] },
      rawNanoUser: operator,
    },
  );
};

type GroupValues = Partial<Record<keyof typeof GROUP_FIELDS, string | null>>;

const ensureRecordGroups = async (
  workspace: Workspace,
  objectIdentifier: string,
  values: GroupValues[],
) => {
  const metadata = await workspace.request<{
    getViews: GroupedView[];
    objects: {
      edges: {
        node: {
          fields: {
            edges: { node: { id: string; universalIdentifier: string } }[];
          };
        };
      }[];
    };
  }>(
    `query{getViews{id universalIdentifier mainGroupByFieldMetadataId viewGroups{id fieldValue position}}
  objects(paging:{first:1},filter:{universalIdentifier:{eq:"${objectIdentifier}"}}){edges{node{fields(paging:{first:100},filter:{}){edges{node{id universalIdentifier}}}}}}}`,
    {},
    '/metadata',
  );
  const fields =
    metadata.objects.edges[0]?.node.fields.edges.map(({ node }) => node) ?? [];
  for (const view of metadata.getViews.filter((view) =>
    VIEW_IDENTIFIERS.has(view.universalIdentifier),
  )) {
    const fieldIdentifier = fields.find(
      (field) => field.id === view.mainGroupByFieldMetadataId,
    )?.universalIdentifier;
    const entry = Object.entries(GROUP_FIELDS).find(
      ([, identifier]) => identifier === fieldIdentifier,
    );
    if (!entry) continue;
    const key = entry[0] as keyof typeof GROUP_FIELDS;
    const saved = new Set(view.viewGroups.map((group) => group.fieldValue));
    const missing = [
      ...new Set(
        values
          .map((value) => (value[key] === null ? '' : value[key]))
          .filter((value): value is string => typeof value === 'string'),
      ),
    ].filter((value) => !saved.has(value));
    let position =
      Math.max(-1, ...view.viewGroups.map((group) => group.position)) + 1;
    for (let offset = 0; offset < missing.length; offset += 100) {
      const inputs = missing.slice(offset, offset + 100).map((fieldValue) => ({
        id: groupId(view.id, fieldValue),
        viewId: view.id,
        fieldValue,
        isVisible: true,
        position: position++,
      }));
      await workspace.request(
        'mutation($inputs:[CreateViewGroupInput!]!){createManyViewGroups(inputs:$inputs){id}}',
        { inputs },
        '/metadata',
      );
    }
  }
};

export const ensureMembershipGroups = (
  workspace: Workspace,
  values: GroupValues[],
) => ensureRecordGroups(workspace, IDENTIFIERS.membership, values);

export const refreshGroupedViews = async (
  input: z.infer<typeof groupedViewsInputSchema>,
  workspace = new Workspace(),
) => {
  try {
    if (input.records) {
      await ensureMembershipGroups(workspace, input.records);
      return { status: 'REFRESHED', processed: input.records.length };
    }
    if (input.phase === 'COUNTRIES') {
      const result = await workspace.request<{
        nanoCreators: {
          edges: {
            node: {
              id: string;
              creatorCountry: string | null;
              emails?: string[] | null;
              emailAvailability?: string | null;
            };
          }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(
        'query($after:String){nanoCreators(first:100,after:$after){edges{node{id creatorCountry emails emailAvailability}}pageInfo{hasNextPage endCursor}}}',
        { after: input.after },
      );
      const page = result.nanoCreators;
      const updates = new Map<string, string[]>();
      for (const { node } of page.edges) {
        const availability = getEmailAvailability(node.emails);
        if (node.emailAvailability !== availability)
          updates.set(availability, [
            ...(updates.get(availability) ?? []),
            node.id,
          ]);
        node.emailAvailability = availability;
      }
      for (const [emailAvailability, ids] of updates)
        await workspace.request(
          'mutation($data:NanoCreatorUpdateInput!,$filter:NanoCreatorFilterInput!){updateNanoCreators(data:$data,filter:$filter){id}}',
          { data: { emailAvailability }, filter: { id: { in: ids } } },
        );
      await ensureRecordGroups(
        workspace,
        IDENTIFIERS.creator,
        page.edges.map(({ node }) => node),
      );
      if (page.pageInfo.hasNextPage) {
        if (!page.pageInfo.endCursor || page.pageInfo.endCursor === input.after)
          throw new Error('Nano creator pagination did not advance.');
        await enqueue(IDENTIFIERS.refreshGroups, {
          phase: 'COUNTRIES',
          after: page.pageInfo.endCursor,
          position: input.position + page.edges.length,
        });
      }
      return {
        status: page.pageInfo.hasNextPage ? 'REFRESHING' : 'REFRESHED',
        processed: input.position + page.edges.length,
      };
    }
    const page = await workspace.request<{
      nanoMemberships: {
        edges: {
          node: {
            id: string;
            creatorId: string;
            listId: string;
            decisionMakerId?: string | null;
            nanoOperatorId?: string;
            nanoOperatorName?: string;
            nanoOperatorEmail?: { primaryEmail?: string };
            list?: { connectionId?: string };
          };
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(
      'query($after:String){nanoMemberships(first:100,after:$after){edges{node{id creatorId listId decisionMakerId nanoOperatorId nanoOperatorName nanoOperatorEmail{primaryEmail} list{connectionId}}}pageInfo{hasNextPage endCursor}}}',
      { after: input.after },
    );
    const rows = page.nanoMemberships.edges.map(({ node }) => node);
    const operators = new Map<string, string>();
    const memberships = new Map<string, string[]>();
    for (const row of rows) {
      if (row.decisionMakerId || !row.nanoOperatorId) continue;
      const identity = `${row.list?.connectionId ?? 'legacy'}:${row.nanoOperatorId}:${row.nanoOperatorEmail?.primaryEmail ?? ''}`;
      let actorId = operators.get(identity);
      if (!actorId) {
        const actor = await saveDecisionMaker(
          workspace,
          row.nanoOperatorId,
          {
            name: row.nanoOperatorName,
            email: row.nanoOperatorEmail?.primaryEmail,
          },
          row.list?.connectionId ?? 'legacy',
        );
        actorId = actor.id;
        operators.set(identity, actorId);
      }
      row.decisionMakerId = actorId;
      memberships.set(actorId, [...(memberships.get(actorId) ?? []), row.id]);
    }
    for (const [actorId, ids] of memberships) {
      await workspace.request(
        'mutation($data:NanoMembershipUpdateInput!,$filter:NanoMembershipFilterInput!){updateNanoMemberships(data:$data,filter:$filter){id}}',
        {
          data: { decisionMakerId: actorId },
          filter: {
            and: [{ id: { in: ids } }, { decisionMakerId: { is: 'NULL' } }],
          },
        },
      );
    }
    await ensureMembershipGroups(workspace, rows);
    if (page.nanoMemberships.pageInfo.hasNextPage) {
      const after = page.nanoMemberships.pageInfo.endCursor;
      if (!after || after === input.after)
        throw new Error('Nano membership pagination did not advance.');
      await enqueue(IDENTIFIERS.refreshGroups, {
        after,
        position: input.position + rows.length,
      });
    } else
      await enqueue(IDENTIFIERS.refreshGroups, {
        phase: 'COUNTRIES',
        after: null,
        position: 0,
      });
    return {
      status: 'REFRESHING',
      processed: input.position + rows.length,
    };
  } catch (error) {
    if (error instanceof WorkspaceRateLimitError) {
      await enqueue(
        IDENTIFIERS.refreshGroups,
        input,
        error.retryAfterMs + 2000,
      );
      return { status: 'DEFERRED' };
    }
    if ((input.attempt ?? 0) < 3) {
      await enqueue(
        IDENTIFIERS.refreshGroups,
        { ...input, attempt: (input.attempt ?? 0) + 1 },
        5000,
      );
      return { status: 'DEFERRED' };
    }
    throw error;
  }
};
