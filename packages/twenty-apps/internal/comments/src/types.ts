export type Mention = {
  id: string;
  label: string;
  objectName: string;
  avatarUrl?: string | null;
};
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
export type CommentRecordRequest = CommentTarget & {
  action: 'list' | 'create' | 'resolve' | 'delete' | 'search';
  id?: string;
  parentId?: string;
  body?: string;
  mentions?: Mention[];
  resolved?: boolean;
  query?: string;
};
export type CommentRequest =
  | CommentRecordRequest
  | { action: 'inbox'; cursor?: string }
  | { action: 'inbox-target'; notificationId: string };
export type CommentDiscussion = CommentTarget & {
  recordLabel: string;
  objectLabel: string;
  latestComment: Pick<RecordComment, 'body' | 'authorName' | 'createdAt'>;
};
export type CommentInboxResponse = {
  discussions: CommentDiscussion[];
  cursor: string | null;
};
export type CommentInboxTargetResponse = { target: CommentTarget };
export type CommentResponse = {
  comments: RecordComment[];
  memberId: string;
  recordLabel: string;
  objectLabel?: string;
  notificationFailed?: boolean;
};
