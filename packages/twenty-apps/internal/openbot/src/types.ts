export type BotMessage = {
  botOwned?: boolean;
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorKind?: 'HUMAN' | 'BOT' | 'SYSTEM' | null;
  parentId: string | null;
  resolved: boolean;
  deleted: boolean;
  createdAt: string;
  mentions: string;
  targetObject: string;
  targetRecordId: string;
};
export type RecordTarget = { objectName: string; recordId: string };
