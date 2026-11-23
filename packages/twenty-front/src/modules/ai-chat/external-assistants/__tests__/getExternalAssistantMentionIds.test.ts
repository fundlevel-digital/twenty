import { type JSONContent } from '@tiptap/core';
import { serializeJsonContentAsAdvancedTextEditorDocument } from '@/advanced-text-editor/utils/serializeJsonContentAsAdvancedTextEditorDocument';
import { getExternalAssistantMentionIds } from '@/ai-chat/external-assistants/getExternalAssistantMentionIds';
const mention = {
  type: 'mentionTag',
  attrs: {
    objectNameSingular: 'externalAssistant',
    recordId: 'bot',
    label: 'Research Bot',
  },
};
const serialize = (content: JSONContent[]) =>
  serializeJsonContentAsAdvancedTextEditorDocument({ type: 'doc', content });
it('addresses selected assistant chips while deduplicating the same identity', () => {
  expect(
    getExternalAssistantMentionIds(
      serialize([{ type: 'paragraph', content: [mention, mention] }]),
    ),
  ).toEqual(['bot']);
});
it('does not address quoted, code or plain-text references', () => {
  expect(
    getExternalAssistantMentionIds(
      serialize([
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [mention] }],
        },
        { type: 'codeBlock', content: [mention] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '[[record:externalAssistant:bot:Research Bot]]',
            },
          ],
        },
      ]),
    ),
  ).toEqual([]);
});
