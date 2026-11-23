import { z } from 'zod';
import { v5 as uuidv5 } from 'uuid';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { type IngestMessageParticipant } from 'twenty-sdk/logic-function';
import { IDENTIFIERS } from 'src/constants/identifiers';
import { type Settings } from 'src/types/settings';

const peopleSchema = z.object({
  people: z.object({
    edges: z.array(z.object({ node: z.object({ id: z.string().uuid() }) })),
  }),
});

export const resolvePerson = async (
  email: string,
  displayName: string,
  role: IngestMessageParticipant['role'],
  policy: Settings['contactCreation'],
  excludedHandles: string[],
): Promise<string | undefined> => {
  const normalizedEmail = email.toLowerCase();
  if (
    excludedHandles.some((handle) => handle.toLowerCase() === normalizedEmail)
  )
    return undefined;
  const client = new CoreApiClient({ runAs: 'application' });
  const find = async () =>
    peopleSchema.parse(
      await client.query({
        people: {
          __args: {
            filter: {
              emails: {
                primaryEmail: {
                  ilike: normalizedEmail.replace(/[\\%_]/g, '\\$&'),
                },
              },
            },
            first: 2,
          },
          edges: { node: { id: true } },
        },
      }),
    ).people.edges;
  const matches = await find();
  if (matches.length === 1) return matches[0].node.id;
  if (matches.length > 1) return undefined;
  const allowed =
    policy === 'EVERYONE' ||
    (policy === 'SENDERS' && role === 'FROM') ||
    (policy === 'RECIPIENTS' && ['TO', 'CC', 'BCC'].includes(role));
  if (!allowed) return undefined;
  const id = uuidv5(normalizedEmail, IDENTIFIERS.APPLICATION);
  try {
    await client.mutation({
      createPerson: {
        __args: {
          data: {
            id,
            name: { firstName: displayName.trim(), lastName: '' },
            emails: { primaryEmail: normalizedEmail, additionalEmails: [] },
          },
        },
        id: true,
      },
    });
    return id;
  } catch (error) {
    const concurrentMatches = await find();
    if (concurrentMatches.length === 1) return concurrentMatches[0].node.id;
    throw error;
  }
};
