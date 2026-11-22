import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect, useState } from 'react';
import { EXECUTE_ONE_LOGIC_FUNCTION } from '@/logic-functions/graphql/mutations/executeOneLogicFunction';
import { isString, isObject } from '@sniptt/guards';
import { doNotTranslate } from 'twenty-shared/i18n';

type Bot = {
  id: string;
  name: string;
  avatarUrl: string | null;
  enabled: boolean;
};
const DIRECTORY_QUERY = gql`
  query OpenBotDirectoryFunction {
    findManyLogicFunctions {
      id
      universalIdentifier
    }
  }
`;
const requests = new Map<
  string,
  { expiresAt: number; result: Promise<Bot[]> }
>();

export const useOpenBotDirectory = () => {
  const client = useApolloClient();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const [bots, setBots] = useState<Bot[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!currentWorkspace?.id) {
      return;
    }
    let active = true;
    const cacheKey = currentWorkspace.id;
    const cached = requests.get(cacheKey);
    const result =
      cached && cached.expiresAt > Date.now()
        ? cached.result
        : (async () => {
            const { data } = await client.query<{
              findManyLogicFunctions: {
                id: string;
                universalIdentifier: string;
              }[];
            }>({ query: DIRECTORY_QUERY });
            const logicFunction = data?.findManyLogicFunctions.find(
              (item) =>
                item.universalIdentifier ===
                '22dd6f67-f509-4c8f-aedb-75ca3c369954',
            );
            if (!logicFunction) {
              return [];
            }
            const response = await client.mutate<{
              executeOneLogicFunction: { status: string; data: unknown };
            }>({
              mutation: EXECUTE_ONE_LOGIC_FUNCTION,
              variables: { input: { id: logicFunction.id, payload: {} } },
            });
            const execution = response.data?.executeOneLogicFunction;
            if (
              execution?.status !== 'SUCCESS' ||
              !Array.isArray(execution.data)
            ) {
              throw new Error(doNotTranslate('Bot directory unavailable'));
            }
            return execution.data.filter(
              (value): value is Bot =>
                isObject(value) &&
                'id' in value &&
                isString(value.id) &&
                'name' in value &&
                isString(value.name) &&
                'avatarUrl' in value &&
                (value.avatarUrl === null || isString(value.avatarUrl)) &&
                'enabled' in value &&
                typeof value.enabled === 'boolean',
            );
          })();
    requests.set(cacheKey, { expiresAt: Date.now() + 60000, result });
    void result
      .then((items) => {
        if (active) {
          setBots(items);
          setError(false);
        }
      })
      .catch(() => {
        requests.delete(cacheKey);
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client, currentWorkspace?.id]);
  return { bots, error, loading };
};
