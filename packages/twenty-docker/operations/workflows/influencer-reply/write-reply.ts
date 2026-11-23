export const main = async ({ reply }: { reply: string }) => {
  if (typeof reply !== 'string' || !reply.trim()) {
    throw new Error('The AI step returned no reply. No draft was created.');
  }
  return {
    body: JSON.stringify({
      type: 'doc',
      content: reply
        .trim()
        .split(/\n\s*\n/)
        .map((paragraph) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraph }],
        })),
    }),
  };
};
