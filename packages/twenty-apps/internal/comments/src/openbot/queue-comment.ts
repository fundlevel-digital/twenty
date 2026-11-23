import { botProviderRequest } from './provider';
export const queueOpenBotMentions = async (
  comment: { id: string; authorKind?: string | null },
  mentions: { objectName: string }[],
  _recordLabel: string,
): Promise<boolean> => {
  if (
    comment.authorKind === 'BOT' ||
    !mentions.some((mention) =>
      ['bot', 'openbotAgent'].includes(mention.objectName),
    )
  )
    return false;
  return (
    await botProviderRequest<{ queued: boolean }>({
      action: 'queue',
      commentId: comment.id,
    })
  ).queued;
};
