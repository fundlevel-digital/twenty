import { normalizeEnumValue } from '../utils/enum-fields.ts';
// Pure mapping from Unipile payloads to Twenty records. No I/O, so it is unit-tested.

export const PRODUCT_NAMES: Record<string, string> = {
  classic: 'CLASSIC',
  sales_navigator: 'SALES_NAVIGATOR',
  recruiter: 'RECRUITER',
  company: 'COMPANY_PAGES',
};

export const STATUS_NAMES: Record<string, string> = {
  running: 'RUNNING',
  disconnected: 'DISCONNECTED',
  errored: 'ERRORED',
  degraded: 'DEGRADED',
  partial: 'DEGRADED',
};

// Inboxes walked when mapping chats, with the channel their messages belong to.
export const INBOXES: [string, string][] = [
  ['CLASSIC_PRIMARY', 'CLASSIC'],
  ['CLASSIC_ARCHIVED', 'CLASSIC'],
  ['CLASSIC_INMAIL', 'INMAIL'],
  ['SALES_NAVIGATOR_PRIMARY', 'SALES_NAVIGATOR'],
  ['SALES_NAVIGATOR_ARCHIVED', 'SALES_NAVIGATOR'],
  ['SALES_NAVIGATOR_SENT', 'SALES_NAVIGATOR'],
];

export const links = (url: string | null | undefined) => ({
  primaryLinkUrl: url || '',
  primaryLinkLabel: '',
  secondaryLinks: [],
});

export const isClassicMemberId = (id: unknown): id is string => typeof id === 'string' && id.startsWith('ACoA');
export const isSalesNavigatorId = (id: unknown): id is string => typeof id === 'string' && id.startsWith('ACwA');

// The slug in linkedin.com/in/<slug>, lower-cased and decoded. Member-ID style slugs (ACoA..., ACwA...)
// are not slugs and return ''.
export const slugFromUrl = (url: unknown): string => {
  const match = String(url ?? '').match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!match) return '';
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // keep the raw slug
  }
  slug = slug.trim().toLowerCase();
  return /^ac[ow]a/i.test(slug) ? '' : slug;
};

// Member ID written in the URL itself (linkedin.com/in/ACoA...), if any.
export const memberIdFromUrl = (url: unknown): string => {
  const match = String(url ?? '').match(/linkedin\.com\/in\/(ACoA[A-Za-z0-9_-]+)/);
  return match ? match[1] : '';
};

export const later = (a?: string | null, b?: string | null) => (!a ? b || null : !b ? a : a > b ? a : b);
export const earlier = (a?: string | null, b?: string | null) => (!a ? b || null : !b ? a : a < b ? a : b);

export const displayName = (user: any) =>
  String(user?.display_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '').trim();

export type AccountSnapshot = {
  unipileAccountId: string;
  linkedinUserId: string;
  name: string;
  status: string;
  products: string[];
  proxyHost: string;
  proxyPort: string;
  proxyAuto: boolean;
  proxyUsername: string;
  details: Record<string, unknown>;
};

// Account event payloads can be partial, so only fields the payload actually carries are written.
const accountDetails = (account: any) => {
  const details: Record<string, unknown> = {};
  const proxy = account.proxy ?? {};
  if (typeof proxy.protocol === 'string') { details.proxyProtocol = proxy.protocol; details.proxyProtocolType = normalizeEnumValue('proxyProtocolType', proxy.protocol); }
  if (proxy.country !== undefined) details.proxyCountry = proxy.country ? String(proxy.country) : '';
  if (typeof account.metadata?.allow_country_fallback === 'boolean') details.allowCountryFallback = account.metadata.allow_country_fallback;
  if (typeof account.metadata?.connection_method === 'string') { details.connectionMethod = account.metadata.connection_method; details.connectionMethodType = normalizeEnumValue('connectionMethodType', account.metadata.connection_method); }
  if (typeof account.is_locked === 'boolean') details.isLocked = account.is_locked;
  if (account.created_at) details.unipileCreatedAt = account.created_at;
  return details;
};

export const accountSnapshot = (account: any): AccountSnapshot | null => {
  if (!account || account.provider !== 'linkedin' || !account.user_id) return null;
  const statuses = account.metadata?.products_connection_status ?? {};
  const products = Object.keys(statuses)
    .filter((key) => statuses[key] === 'running' && PRODUCT_NAMES[key])
    .map((key) => PRODUCT_NAMES[key]);
  const proxy = account.proxy ?? {};
  return {
    unipileAccountId: account.id,
    linkedinUserId: account.user_id,
    name: account.name || '',
    status: STATUS_NAMES[String(account.status || '').toLowerCase()] || 'RUNNING',
    products,
    proxyHost: proxy.host || '',
    proxyPort: proxy.port === undefined || proxy.port === null ? '' : String(proxy.port),
    proxyAuto: Boolean(proxy.auto_proxy),
    proxyUsername: proxy.username || '',
    details: accountDetails(account),
  };
};

// Profile details of a member (relation, request or chat partner) that change over time. Only
// fields present are returned, so a payload without them never blanks what is stored.
export const memberDetails = (user: any) => {
  const details: Record<string, unknown> = {};
  const headline = user?.description || user?.headline;
  if (headline) details.headline = String(headline);
  if (user?.public_picture_url) details.profilePictureUrl = String(user.public_picture_url);
  if (user?.type) { details.memberType = String(user.type); details.memberCategory = normalizeEnumValue('memberCategory', String(user.type)); }
  return details;
};

export const chatRecord = (chat: any, channel: string, accountId: string, connectionId: string, name: string) => {
  const last = chat.last_message ?? {};
  const preview = String(last.text || '').replace(/\s+/g, ' ').slice(0, 200);
  return {
    unipileChatId: chat.id,
    name: name || chat.name || chat.id,
    accountId,
    connectionId,
    channel: channel === 'INMAIL' || channel === 'SALES_NAVIGATOR' ? channel : 'CLASSIC',
    unreadCount: typeof chat.unread_count === 'number' ? chat.unread_count : null,
    isArchived: Boolean(chat.is_archived),
    isPinned: Boolean(chat.is_pinned),
    isReadOnly: Boolean(chat.is_readonly),
    isMuted: Boolean(chat.muted_until),
    folders: Array.isArray(chat.folders) ? chat.folders.map(String) : [],
    restrictions: Array.isArray(chat.restrictions) ? chat.restrictions.map(String) : [],
    startedAt: chat.created_at || null,
    creatorMemberId: chat.creator_id ? String(chat.creator_id) : '',
    lastMessageAt: last.timestamp || chat.last_message_timestamp || null,
    lastMessagePreview: preview,
  };
};

// Status for an account event. The account object's own aggregate status wins when present;
// a single product going down on an otherwise running account is Degraded.
export const accountEventStatus = (type: string, payload: any): string | null => {
  const account = payload?.account && typeof payload.account === 'object' ? payload.account : null;
  const fromAccount = account ? STATUS_NAMES[String(account.status || '').toLowerCase()] || null : null;
  if (type === 'account.remove' || type === 'account.delete') return 'REMOVED';
  if (type === 'account.add' || type === 'account.reconnect') return fromAccount || 'RUNNING';
  if (type.startsWith('account.status.')) {
    const fromType = STATUS_NAMES[type.slice('account.status.'.length)] || null;
    if (fromAccount) return fromAccount;
    if (payload?.product && (fromType === 'DISCONNECTED' || fromType === 'ERRORED')) return 'DEGRADED';
    return fromType;
  }
  return null;
};

export type MemberRef = {
  memberId: string; // ACoA..., or '' when LinkedIn only gave another kind of ID
  salesNavigatorUserId: string;
  publicIdentifier: string;
  name: string;
  profileUrl: string;
};

export const memberRef = (user: any): MemberRef => {
  const id = user?.id ?? user?.provider_id;
  const slug = String(user?.public_identifier || '').trim() || slugFromUrl(user?.profile_url);
  const memberId = isClassicMemberId(id) ? id : memberIdFromUrl(user?.profile_url);
  return {
    memberId,
    salesNavigatorUserId: isSalesNavigatorId(id) ? id : '',
    publicIdentifier: slug,
    name: displayName(user) || slug || memberId,
    profileUrl: slug ? `https://www.linkedin.com/in/${slug}` : memberId ? `https://www.linkedin.com/in/${memberId}` : '',
  };
};

// Unique key of an account/member pair. Member ID when known (permanent), else a fallback that
// keeps the record stable until the member ID is revealed.
export const syncKey = (accountLinkedinUserId: string, ref: MemberRef) => {
  if (ref.memberId) return `${accountLinkedinUserId}:${ref.memberId}`;
  if (ref.salesNavigatorUserId) return `${accountLinkedinUserId}:${ref.salesNavigatorUserId}`;
  if (ref.publicIdentifier) return `${accountLinkedinUserId}:slug:${ref.publicIdentifier.toLowerCase()}`;
  return '';
};

export type ChatState = {
  newest: string | null;
  oldest: string | null;
  complete: boolean;
  channel: string;
  error?: string;
  errorCount?: number;
};

export const messageRecord = (message: any, chatId: string, chatState: ChatState, connectionId: string) => {
  const text = String(message.text || '');
  const type = message.specifics?.type || '';
  const sender = message.sender || {};
  const attachments: any[] = Array.isArray(message.attachments) ? message.attachments : [];
  return {
    connectionId,
    unipileMessageId: message.id,
    unipileChatId: chatId,
    direction: message.is_sender ? 'OUTBOUND' : 'INBOUND',
    channel: type === 'INMAIL' ? 'INMAIL' : chatState.channel || 'CLASSIC',
    sentAt: message.timestamp || null,
    text,
    name: (message.is_sender ? 'Sent: ' : 'Received: ') + (text.replace(/\s+/g, ' ').slice(0, 80) || '(no text)'),
    isDeleted: Boolean(message.is_deleted),
    hasAttachments: attachments.length > 0,
    isSeen: Boolean(message.is_seen),
    isDelivered: Boolean(message.is_delivered),
    isEdited: Boolean(message.is_edited),
    isHidden: Boolean(message.is_hidden),
    isMentioned: Boolean(message.is_mentionned ?? message.is_mentioned),
    senderName: displayName(sender),
    senderMemberId: sender.id || message.sender_id || '',
    senderProfileLink: links(sender.profile_url),
    senderHeadline: sender.description || sender.headline || '',
    senderPictureUrl: sender.public_picture_url || '',
    senderType: sender.type || '',
    senderIsFollowing: Boolean(sender.specifics?.is_following),
    isPinned: Boolean(message.is_pinned),
    messageType: type,
    hyperlinks: Array.isArray(message.hyperlinks) ? message.hyperlinks : [],
    mentions: Array.isArray(message.mentions) ? message.mentions : [],
    reactions: Array.isArray(message.reactions_counter) ? message.reactions_counter : [],
    attachmentDetails: attachments.map((attachment) => {
      const out: Record<string, unknown> = {
        id: attachment.id,
        kind: attachment.type,
        mimetype: attachment.mimetype,
        fileSize: attachment.file_size,
      };
      if (attachment.filename) out.filename = attachment.filename;
      if (attachment.duration) out.duration = attachment.duration;
      if (attachment.voice_note) out.isVoiceNote = true;
      if (attachment.is_unavailable) out.isUnavailable = true;
      if (attachment.type === 'shared_content') {
        out.mediaType = attachment.media_type;
        out.author = attachment.author;
        out.description = attachment.description;
        out.url = attachment.url;
      }
      if (attachment.type === 'contact_card') {
        out.displayName = attachment.display_name;
        out.organization = attachment.organization;
      }
      return out;
    }),
  };
};

export const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};
