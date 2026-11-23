import { isNonEmptyString } from '@sniptt/guards';
import {
  parseCanonicalTipTapJsonDocument,
  TIPTAP_NODE_TYPES,
  type TipTapNode,
} from 'twenty-shared/utils';

const collectMentionIds = (node: TipTapNode): string[] => {
  if (
    node.type === TIPTAP_NODE_TYPES.BLOCKQUOTE ||
    node.type === TIPTAP_NODE_TYPES.CODE_BLOCK
  ) {
    return [];
  }
  const id = node.attrs?.recordId;
  return [
    ...(node.type === TIPTAP_NODE_TYPES.MENTION_TAG &&
    ['externalAssistant', 'agent'].includes(
      String(node.attrs?.objectNameSingular),
    ) &&
    isNonEmptyString(id)
      ? [id]
      : []),
    ...(node.content ?? []).flatMap(collectMentionIds),
  ];
};
export const getExternalAssistantMentionIds = (
  serialized: string,
): string[] => {
  const document = parseCanonicalTipTapJsonDocument(serialized);
  return document ? [...new Set(collectMentionIds(document))] : [];
};
