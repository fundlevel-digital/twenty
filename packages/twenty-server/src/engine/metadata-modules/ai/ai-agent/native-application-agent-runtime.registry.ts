import { Injectable } from '@nestjs/common';
import { type AgentChatMemberMessageActor } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-member-message-actor.type';

export type NativeApplicationAgentRun = {
  agentId: string;
  threadId: string;
  runId: string;
  actor: AgentChatMemberMessageActor;
  text: string;
};

@Injectable()
export class NativeApplicationAgentRuntimeRegistry {
  private handler?: (input: NativeApplicationAgentRun) => Promise<void>;

  register(handler: (input: NativeApplicationAgentRun) => Promise<void>) {
    this.handler = handler;
  }

  async run(input: NativeApplicationAgentRun) {
    if (!this.handler) {
      throw new Error('Native application agent runtime is unavailable');
    }
    await this.handler(input);
  }
}
