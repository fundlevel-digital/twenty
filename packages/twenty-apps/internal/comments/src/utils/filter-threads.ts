import { type RecordComment } from '../types';
export const filterThreads = (
  comments: RecordComment[],
  memberId: string,
  showResolved: boolean,
  onlyMine: boolean,
): RecordComment[] =>
  comments.filter(
    (comment) =>
      !comment.parentId &&
      (!comment.deleted ||
        comments.some(
          (reply) => reply.parentId === comment.id && !reply.deleted,
        )) &&
      (showResolved || !comment.resolved) &&
      (!onlyMine ||
        comment.authorId === memberId ||
        comments.some(
          (reply) =>
            reply.parentId === comment.id &&
            reply.authorId === memberId &&
            !reply.deleted,
        )),
  );
