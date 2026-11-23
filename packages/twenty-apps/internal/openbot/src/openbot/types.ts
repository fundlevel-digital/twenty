export type OpenBotAgent = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type OpenBotTaskPolicy = {
  onAssigned: boolean;
  onDue: boolean;
  warningMinutes: number | null;
  overdueEveryMinutes: number | null;
};

export type OpenBotConnection = OpenBotAgent & {
  enabled?: boolean;
  taskPolicy?: OpenBotTaskPolicy;
  webhookUrl: string;
  webhookSecret: string;
};

export type OpenBotTask = {
  inboxRequestId?: string;
  agentId: string;
  commentId: string;
  threadId: string;
  objectName: string;
  recordId: string;
  recordLabel: string;
  requestedBy: string | null;
  text: string;
  replyUrl: string;
  taskEvent?: OpenBotTaskEvent;
};

export type OpenBotReply = {
  deliveryId: string;
  text: string;
};

export type OpenBotTaskEvent = {
  taskId: string;
  type:
    | 'crm.task.assigned'
    | 'crm.task.due'
    | 'crm.task.due_soon'
    | 'crm.task.overdue';
  cycle: string;
  dueAt: string | null;
  intervalMinutes?: number;
  expiresAt?: number;
  source?: 'policy' | 'workflow';
};
