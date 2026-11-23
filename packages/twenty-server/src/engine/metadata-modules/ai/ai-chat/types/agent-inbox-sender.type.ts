import { type ExternalAssistantIdentity } from 'twenty-shared/ai';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';

export type AgentInboxSender =
  | {
      type: 'application';
      application: FlatApplication;
      externalAssistant?: ExternalAssistantIdentity;
    }
  | { type: 'workflow'; workflowId: string; workflowName: string };
