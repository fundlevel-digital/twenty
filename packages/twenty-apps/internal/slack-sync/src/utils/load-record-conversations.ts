import { RestApiClient } from 'twenty-client-sdk/rest';

export type SlackRecordThread = {
  id: string;
  subject: string;
  lastMessageBody: string;
  lastMessageReceivedAt: string;
  numberOfMessagesInThread: number;
  visibility: string;
  channel: { id: string; name: string } | null;
};

type TimelineThread = Omit<SlackRecordThread, 'channel'>;
type GraphqlResult<TData> = { data?: TData; errors?: { message: string }[] };

export const loadRecordConversations = async ({
  objectNameSingular,
  recordId,
  page,
}: {
  objectNameSingular: string;
  recordId: string;
  page: number;
}) => {
  const client = new RestApiClient();
  const result = await client.post<
    GraphqlResult<{
      getTimelineThreadsFromObjectRecord: {
        totalNumberOfThreads: number;
        timelineThreads: TimelineThread[];
      };
    }>
  >('/graphql', {
    query: `query($object:String!,$recordId:UUID!,$page:Int!){
      getTimelineThreadsFromObjectRecord(objectNameSingular:$object,recordId:$recordId,page:$page,pageSize:20){
        totalNumberOfThreads timelineThreads{id subject lastMessageBody lastMessageReceivedAt numberOfMessagesInThread visibility}
      }
    }`,
    variables: { object: objectNameSingular, recordId, page },
  });
  if (result.errors?.length || !result.data)
    throw new Error('Unable to load record conversations');
  const timeline = result.data.getTimelineThreadsFromObjectRecord;
  if (timeline.timelineThreads.length === 0)
    return { threads: [], hasMore: false };
  const links = await client.post<
    GraphqlResult<{
      messageThreads: {
        edges: {
          node: {
            id: string;
            slackThreadId: string | null;
            slackChannel: { id: string; name: string } | null;
          };
        }[];
      };
    }>
  >('/graphql', {
    query: `query($ids:[UUID!]!){messageThreads(filter:{id:{in:$ids}},first:100){edges{node{id slackThreadId slackChannel{id name}}}}}`,
    variables: { ids: timeline.timelineThreads.map(({ id }) => id) },
  });
  if (links.errors?.length || !links.data)
    throw new Error('Unable to load conversation channels');
  const linksByThreadId = new Map(
    links.data.messageThreads.edges
      .filter(({ node }) => node.slackThreadId)
      .map(({ node }) => [node.id, node]),
  );
  return {
    threads: timeline.timelineThreads.flatMap((thread): SlackRecordThread[] => {
      const link = linksByThreadId.get(thread.id);
      return link ? [{ ...thread, channel: link.slackChannel }] : [];
    }),
    hasMore: page * 20 < timeline.totalNumberOfThreads,
  };
};

export const groupRecordConversations = (threads: SlackRecordThread[]) => {
  const groups = new Map<
    string,
    { id: string; name: string | null; threads: SlackRecordThread[] }
  >();
  for (const thread of threads) {
    const id = thread.channel?.id ?? 'private';
    const group = groups.get(id) ?? {
      id,
      name: thread.channel?.name ?? null,
      threads: [],
    };
    group.threads.push(thread);
    groups.set(id, group);
  }
  return [...groups.values()].map((group) => {
    const standaloneMessageCount = group.threads.filter(
      (thread) => thread.numberOfMessagesInThread === 1,
    ).length;
    return {
      ...group,
      standaloneMessageCount,
      threadCount: group.threads.length - standaloneMessageCount,
    };
  });
};
