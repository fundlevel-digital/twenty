import { type CoreApiClient } from 'twenty-client-sdk/core';

import { hasLastContactChanged } from 'src/utils/has-last-contact-changed';
import {
  buildPersonLastContactUpdate,
  collectPersonLastContactState,
  type Interaction,
  pickLatestInteraction,
} from 'src/utils/update-person-last-contact';
import {
  type RelatedInteraction,
  updateRelatedLastContactForPeople,
} from 'src/utils/update-related-last-contact';
import {
  type RecordUpsert,
  upsertRecordsInBatches,
} from 'src/utils/upsert-records-in-batches';

export const applyPersonInteractions = async (
  client: Pick<CoreApiClient, 'query' | 'mutation'>,
  interactionsByPersonId: Map<string, Interaction[]>,
  lastSenderStreakByPersonId: Map<string, number | null> = new Map(),
): Promise<void> => {
  const personIds = [...interactionsByPersonId.keys()];

  if (personIds.length === 0) {
    return;
  }

  const stateByPersonId = await collectPersonLastContactState(
    client,
    personIds,
  );
  const updates: RecordUpsert[] = [];
  const contactByPersonId = new Map<string, RelatedInteraction>();

  for (const [personId, interactions] of interactionsByPersonId) {
    const current = stateByPersonId.get(personId);

    if (!current) {
      continue;
    }

    const update = buildPersonLastContactUpdate(
      personId,
      current,
      interactions,
    );

    const lastSenderStreak = lastSenderStreakByPersonId.get(personId);
    const lastSenderStreakData =
      lastSenderStreak !== undefined &&
      hasLastContactChanged(current, { lastSenderStreak })
        ? { lastSenderStreak }
        : undefined;

    if (update || lastSenderStreakData) {
      updates.push({ id: personId, ...update, ...lastSenderStreakData });
    }

    const latest = pickLatestInteraction(interactions);

    if (latest) {
      contactByPersonId.set(personId, {
        occurredAt: latest.occurredAt,
        itemId: latest.itemId,
        kind: latest.kind,
      });
    }
  }

  await upsertRecordsInBatches(client, 'createPeople', updates);
  await updateRelatedLastContactForPeople(
    client,
    contactByPersonId,
    stateByPersonId,
  );
};
