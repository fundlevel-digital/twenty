import { useEffect, useMemo, useState } from 'react';
import { PageLayoutType, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useRecordId } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT } from 'src/constants/universal-identifiers';

type Attachment = {
  kind?: string;
  filename?: string;
  mimetype?: string;
  duration?: number;
  isVoiceNote?: boolean;
  mediaType?: string;
  author?: string;
  description?: string;
  url?: string;
  displayName?: string;
};

type Message = {
  id: string;
  sentAt: string | null;
  direction: 'INBOUND' | 'OUTBOUND' | null;
  channel: string | null;
  text: string | null;
  senderName: string | null;
  isSeen: boolean | null;
  isDelivered: boolean | null;
  isEdited: boolean | null;
  isDeleted: boolean | null;
  attachmentDetails: Attachment[] | null;
  accountName: string;
  connectionId: string;
};

type Connection = {
  id: string;
  status: string | null;
  connectedAt: string | null;
  requestedAt: string | null;
  account: { name: string | null } | null;
};

const QUERY = `query LinkedInConversation($personId: UUID) {
  linkedinConnections(filter: { personId: { eq: $personId } }) {
    edges { node {
      id status connectedAt requestedAt
      account { name }
      messages(first: 500, orderBy: [{ sentAt: AscNullsLast }]) {
        edges { node {
          id sentAt direction channel text senderName
          isSeen isDelivered isEdited isDeleted attachmentDetails
        } }
      }
    } }
  }
}`;

const CHANNEL_LABEL: Record<string, string> = {
  SALES_NAVIGATOR: 'Sales Navigator',
  INMAIL: 'InMail',
  COMPANY_PAGE: 'Company page',
};

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: 'Connected',
  REQUEST_SENT: 'Request sent',
  REQUEST_RECEIVED: 'Request received',
  NOT_CONNECTED: 'Not connected',
  WITHDRAWN: 'Request withdrawn',
  DECLINED: 'Declined',
  REMOVED: 'Removed',
  IGNORED: 'Ignored',
};

const palette = (dark: boolean) => ({
  text: dark ? '#e8e8e8' : '#1f1f1f',
  muted: dark ? '#9a9a9a' : '#6b6b6b',
  border: dark ? '#333' : '#e6e6e6',
  inbound: dark ? '#2a2a2a' : '#f1f1f1',
  outbound: dark ? '#1d4fa3' : '#0a66c2',
  outboundText: '#ffffff',
  chip: dark ? '#262626' : '#f4f4f4',
});

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const attachmentLabel = (attachment: Attachment) => {
  if (attachment.kind === 'shared_content') {
    return `Shared ${attachment.mediaType ?? 'content'}${attachment.author ? ` by ${attachment.author}` : ''}`;
  }
  if (attachment.kind === 'audio') return attachment.isVoiceNote ? 'Voice note' : 'Audio';
  if (attachment.kind === 'img') return 'Image';
  if (attachment.kind === 'video') return 'Video';
  if (attachment.kind === 'contact_card') return `Contact card${attachment.displayName ? `: ${attachment.displayName}` : ''}`;
  return attachment.filename ?? 'File';
};

const LinkedInConversation = () => {
  const personId = useRecordId();
  const dark = useColorScheme() === 'dark';
  const colors = palette(dark);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${process.env.TWENTY_API_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.TWENTY_APP_ACCESS_TOKEN ?? process.env.TWENTY_API_KEY ?? ''}`,
          },
          body: JSON.stringify({ query: QUERY, variables: { personId } }),
        });
        const body = await response.json();
        if (body.errors?.length) throw new Error(body.errors[0].message);
        const edges = body.data?.linkedinConnections?.edges ?? [];
        const all: Message[] = [];
        const conns: Connection[] = [];
        for (const { node } of edges) {
          conns.push(node);
          for (const { node: message } of node.messages?.edges ?? []) {
            all.push({ ...message, accountName: node.account?.name ?? '', connectionId: node.id });
          }
        }
        all.sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''));
        if (!cancelled) {
          setConnections(conns);
          setMessages(all);
          setState('ready');
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
          setState('error');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  // One tab per account (connection), plus "All" when there is more than one.
  // Default: the conversation with the most recent message, else the first connection.
  const [selected, setSelected] = useState<string | null>(null);
  const defaultTab = useMemo(() => {
    const latest = messages[messages.length - 1];
    return latest ? latest.connectionId : connections[0]?.id ?? null;
  }, [messages, connections]);
  const activeTab = selected ?? defaultTab;
  const hasTabs = connections.length > 1;
  const showAll = activeTab === 'ALL';
  const visibleMessages = useMemo(
    () => (showAll ? messages : messages.filter((message) => message.connectionId === activeTab)),
    [messages, activeTab, showAll],
  );
  const visibleConnections = showAll ? connections : connections.filter((connection) => connection.id === activeTab);
  const lastActivity = (connectionId: string) =>
    messages.filter((message) => message.connectionId === connectionId).slice(-1)[0]?.sentAt ?? null;

  const shell = {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: 13,
    color: colors.text,
    padding: 12,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    height: '100%',
    overflowY: 'auto' as const,
    boxSizing: 'border-box' as const,
  };

  if (state === 'loading') return <div style={shell}><span style={{ color: colors.muted }}>Loading LinkedIn conversation…</span></div>;
  if (state === 'error') return <div style={shell}><span style={{ color: colors.muted }}>Could not load the LinkedIn conversation: {error}</span></div>;

  const statusLine = visibleConnections
    .map((connection) => {
      const label = STATUS_LABEL[connection.status ?? ''] ?? 'Unknown';
      const date = connection.connectedAt ?? connection.requestedAt;
      return `${connection.account?.name ?? 'LinkedIn'} · ${label}${date ? ` ${new Date(date).toLocaleDateString()}` : ''}`;
    })
    .join('  ·  ');

  let lastDay = '';

  return (
    <div style={shell}>
      {hasTabs && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[...connections.map((connection) => ({ id: connection.id, label: connection.account?.name ?? 'LinkedIn', at: lastActivity(connection.id) })),
            { id: 'ALL', label: 'All', at: null as string | null }].map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelected(tab.id)}
                title={tab.at ? `Last message ${new Date(tab.at).toLocaleString()}` : undefined}
                style={{
                  border: `1px solid ${active ? colors.outbound : colors.border}`,
                  background: active ? colors.outbound : 'transparent',
                  color: active ? colors.outboundText : colors.text,
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ color: colors.muted, fontSize: 12, paddingBottom: 4, borderBottom: `1px solid ${colors.border}` }}>
        {connections.length === 0 ? 'No LinkedIn connection with this person yet.' : statusLine}
      </div>

      {visibleMessages.length === 0 && connections.length > 0 && (
        <span style={{ color: colors.muted }}>No LinkedIn messages synced for this conversation yet.</span>
      )}

      {visibleMessages.map((message) => {
        const outbound = message.direction === 'OUTBOUND';
        const day = message.sentAt ? formatDay(message.sentAt) : '';
        const showDay = day !== lastDay;
        lastDay = day;
        const channel = CHANNEL_LABEL[message.channel ?? ''];
        const attachments = Array.isArray(message.attachmentDetails) ? message.attachmentDetails : [];

        return (
          <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {showDay && day && (
              <div style={{ alignSelf: 'center', color: colors.muted, fontSize: 11, margin: '6px 0' }}>{day}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: outbound ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 11, color: colors.muted, margin: '0 4px 2px' }}>
                {message.senderName ?? (outbound ? 'You' : 'Them')}
                {showAll && hasTabs && outbound ? ` · ${message.accountName}` : ''}
                {channel ? ` · ${channel}` : ''}
              </div>
              <div
                style={{
                  maxWidth: '78%',
                  padding: '8px 11px',
                  borderRadius: 14,
                  borderBottomRightRadius: outbound ? 4 : 14,
                  borderBottomLeftRadius: outbound ? 14 : 4,
                  background: outbound ? colors.outbound : colors.inbound,
                  color: outbound ? colors.outboundText : colors.text,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  opacity: message.isDeleted ? 0.6 : 1,
                }}
              >
                {message.isDeleted ? <em>(deleted) </em> : null}
                {message.text || (attachments.length ? '' : <em>(no text)</em>)}
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    style={{
                      marginTop: 6,
                      padding: '5px 8px',
                      borderRadius: 8,
                      background: outbound ? 'rgba(255,255,255,0.15)' : colors.chip,
                      fontSize: 12,
                    }}
                  >
                    📎 {attachmentLabel(attachment)}
                    {attachment.kind === 'shared_content' && attachment.url ? (
                      <div>
                        <a href={attachment.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                          {attachment.description || attachment.url}
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: colors.muted, margin: '2px 4px 0' }}>
                {message.sentAt ? formatTime(message.sentAt) : ''}
                {message.isEdited ? ' · edited' : ''}
                {outbound ? (message.isSeen ? ' · Seen' : message.isDelivered ? ' · Delivered' : '') : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT.CONVERSATION,
  name: 'linkedin-conversation',
  description: 'The LinkedIn conversation with this person, across all our LinkedIn accounts.',
  component: LinkedInConversation,
  // Offered in the widget picker on People record pages.
  widgetAvailability: {
    pageLayoutType: PageLayoutType.RECORD_PAGE,
    objectUniversalIdentifiers: [STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier],
  },
});
