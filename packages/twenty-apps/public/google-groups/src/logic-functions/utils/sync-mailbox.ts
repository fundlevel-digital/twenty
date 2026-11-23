import { z } from 'zod';
import { kv } from 'twenty-sdk/logic-function';
import { type SyncState } from 'src/types/settings';
import {
  loadPreferences,
  assertActiveRevision,
} from 'src/logic-functions/utils/preferences';
import {
  GoogleApiError,
  googleProfileSchema,
  googleMessageSchema,
  googleRequest,
  googleSendAsSchema,
} from 'src/logic-functions/utils/google';
import {
  buildBackfillQuery,
  matchingGroups,
} from 'src/logic-functions/utils/routing';
import { importMessage } from 'src/logic-functions/utils/import-message';

const listSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
  nextPageToken: z.string().optional(),
});
const historySchema = z.object({
  historyId: z.string(),
  nextPageToken: z.string().optional(),
  history: z
    .array(
      z.object({
        messagesAdded: z
          .array(z.object({ message: z.object({ id: z.string() }) }))
          .optional(),
        labelsAdded: z
          .array(z.object({ message: z.object({ id: z.string() }) }))
          .optional(),
      }),
    )
    .optional(),
});

export const syncMailbox = async (): Promise<SyncState | null> => {
  const preferences = await loadPreferences();
  const { settings, revision } = preferences;
  if (
    settings.paused ||
    !settings.connectionId ||
    !settings.groups.some((group) => group.enabled)
  )
    return null;
  const connectionId = settings.connectionId;
  const key = `sync:${revision}`;
  let state = (await kv.get<SyncState>(key)) ?? {
    revision,
    phase: 'BACKFILL',
    imported: 0,
  };
  try {
    const profile = await googleRequest(
      connectionId,
      '/profile',
      googleProfileSchema,
    );
    const aliases =
      settings.contactCreation && settings.contactCreation !== 'NONE'
        ? await googleRequest(
            connectionId,
            '/settings/sendAs',
            googleSendAsSchema,
          )
        : { sendAs: [] };
    const excludedHandles = [
      profile.emailAddress,
      ...aliases.sendAs.map((alias) => alias.sendAsEmail),
    ];
    let messageIds: string[];
    let nextState: SyncState;
    if (state.phase === 'BACKFILL' || !state.historyId) {
      const backfillStartedAt = state.backfillStartedAt ?? Date.now();
      state = { ...state, backfillStartedAt };
      const params = new URLSearchParams({
        q: buildBackfillQuery(
          settings.groups,
          settings.historyDays,
          backfillStartedAt,
        ),
        maxResults: '10',
      });
      if (state.pageToken) params.set('pageToken', state.pageToken);
      const page = await googleRequest(
        connectionId,
        `/messages?${params}`,
        listSchema,
      );
      messageIds = (page.messages ?? []).map((message) => message.id);
      nextState = {
        ...state,
        historyId: state.historyId ?? profile.historyId,
        pageToken: page.nextPageToken,
        phase: page.nextPageToken ? 'BACKFILL' : 'IDLE',
      };
    } else {
      const params = new URLSearchParams({
        startHistoryId: state.historyId,
        maxResults: '10',
      });
      if (state.historyPageToken)
        params.set('pageToken', state.historyPageToken);
      let page;
      try {
        page = await googleRequest(
          connectionId,
          `/history?${params}`,
          historySchema,
        );
      } catch (error) {
        if (!(error instanceof GoogleApiError && error.status === 404))
          throw error;
        state = { revision, phase: 'BACKFILL', imported: state.imported };
        await kv.set(key, state);
        return state;
      }
      messageIds = [
        ...new Set(
          (page.history ?? []).flatMap((history) =>
            [
              ...(history.messagesAdded ?? []),
              ...(history.labelsAdded ?? []),
            ].map((entry) => entry.message.id),
          ),
        ),
      ];
      nextState = {
        ...state,
        historyPageToken: page.nextPageToken,
        historyId: page.nextPageToken ? state.historyId : page.historyId,
        phase: page.nextPageToken ? 'SYNCING' : 'IDLE',
      };
    }
    let imported = 0;
    for (const messageId of messageIds) {
      await assertActiveRevision(revision);
      let message;
      try {
        message = await googleRequest(
          connectionId,
          `/messages/${encodeURIComponent(messageId)}?format=full`,
          googleMessageSchema,
        );
      } catch (error) {
        if (error instanceof GoogleApiError && error.status === 404) continue;
        throw error;
      }
      for (const group of matchingGroups(message, settings.groups)) {
        await importMessage(
          connectionId,
          group,
          message,
          revision,
          excludedHandles,
        );
        imported += 1;
      }
    }
    await assertActiveRevision(revision);
    state = {
      ...nextState,
      imported: state.imported + imported,
      error: undefined,
      lastSuccess: new Date().toISOString(),
    };
    await kv.set(key, state);
    return state;
  } catch (error) {
    await kv.set(key, {
      ...state,
      error:
        error instanceof Error ? error.message : 'Google Groups sync failed.',
    });
    throw error;
  }
};
