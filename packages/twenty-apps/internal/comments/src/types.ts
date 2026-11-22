export type Mention = { id: string; label: string; objectName: string };
export type RecordComment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  resolved: boolean;
  deleted: boolean;
  createdAt: string;
  mentions: string;
  targetObject: string;
  targetRecordId: string;
};
export type CommentTarget = { objectName: string; recordId: string };
export type CommentRequest = CommentTarget & {
  action: 'list' | 'create' | 'resolve' | 'delete' | 'search';
  id?: string;
  parentId?: string;
  body?: string;
  mentions?: Mention[];
  resolved?: boolean;
  query?: string;
};
export type CommentResponse = {
  comments: RecordComment[];
  memberId: string;
  recordLabel: string;
  notificationFailed?: boolean;
};
