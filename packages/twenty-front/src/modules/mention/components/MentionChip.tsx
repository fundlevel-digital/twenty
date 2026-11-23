import { ExternalAssistantMentionChip } from '@/ai-chat/external-assistants/ExternalAssistantMentionChip';
import { type NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { isAgentChatAssistantReference } from 'twenty-shared/ai';

import { AiChatAssistantMentionChip } from '@/ai-chat/components/AiChatAssistantMentionChip';
import { MentionRecordChip } from '@/mention/components/MentionRecordChip';

type MentionChipProps = Pick<NodeViewProps, 'node'>;

export const MentionChip = ({ node }: MentionChipProps) => {
  const recordId = node.attrs.recordId as string;
  const objectNameSingular = node.attrs.objectNameSingular as string;
  const label = node.attrs.label as string;
  const imageUrl = (node.attrs.imageUrl as string) ?? '';

  if (['externalAssistant', 'agent'].includes(objectNameSingular)) {
    return (
      <NodeViewWrapper
        as="span"
        style={{ display: 'inline-flex', verticalAlign: 'middle' }}
      >
        <ExternalAssistantMentionChip
          id={recordId}
          name={label}
          avatarUrl={imageUrl}
        />
      </NodeViewWrapper>
    );
  }

  if (
    isAgentChatAssistantReference({
      kind: 'record',
      objectNameSingular,
      recordId,
    })
  ) {
    return (
      <NodeViewWrapper
        as="span"
        style={{ display: 'inline-flex', verticalAlign: 'middle' }}
      >
        <AiChatAssistantMentionChip />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <MentionRecordChip
        recordId={recordId}
        objectNameSingular={objectNameSingular}
        label={label}
        imageUrl={imageUrl}
      />
    </NodeViewWrapper>
  );
};
