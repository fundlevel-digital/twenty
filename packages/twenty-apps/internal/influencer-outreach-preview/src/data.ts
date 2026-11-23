export type OutreachStatus =
  | 'Never Contacted'
  | 'In Sequence'
  | 'Ready For Next Contact'
  | 'Waterfall Exhausted';

export type Contact = {
  name: string;
  email: string;
  sends: number;
  sequence: string;
};

export type ColdCreator = {
  name: string;
  category: string;
  status: OutreachStatus;
  contacts: Contact[];
  rounds: number;
  lastOutboundDays: number | null;
};

const contact = (
  name: string,
  email: string,
  sends: number,
  sequence: string,
): Contact => ({ name, email, sends, sequence });

export const COLD_CREATORS: ColdCreator[] = [
  {
    name: 'Build With Maya',
    category: 'Software & Development',
    status: 'Ready For Next Contact',
    rounds: 0,
    lastOutboundDays: 12,
    contacts: [
      contact('Maya Chen', 'maya@buildmaya.example', 4, 'Completed'),
      contact('Maya Chen', 'hello@buildmaya.example', 0, 'Not Enrolled'),
      contact('Taylor · Manager', 'taylor@studio.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'Everyday Systems',
    category: 'Productivity',
    status: 'Never Contacted',
    rounds: 0,
    lastOutboundDays: null,
    contacts: [
      contact('Jordan Lee', 'jordan@systems.example', 0, 'Not Enrolled'),
      contact('Unknown POC', 'partners@systems.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'The Design Desk',
    category: 'Design',
    status: 'In Sequence',
    rounds: 0,
    lastOutboundDays: 1,
    contacts: [
      contact(
        'Amara Wells',
        'amara@designdesk.example',
        2,
        'Active · Step 2 of 4',
      ),
      contact('Unknown POC', 'business@designdesk.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'Studio North',
    category: 'Creative Tools',
    status: 'Waterfall Exhausted',
    rounds: 2,
    lastOutboundDays: 21,
    contacts: [
      contact(
        'Riley Park',
        'riley@north.example',
        8,
        'Completed · 2 Sequences',
      ),
      contact(
        'Riley Park',
        'hello@north.example',
        8,
        'Completed · 2 Sequences',
      ),
      contact(
        'Alex · Manager',
        'alex@agency.example',
        8,
        'Completed · 2 Sequences',
      ),
    ],
  },
  {
    name: 'Code & Coffee',
    category: 'Software & Development',
    status: 'Ready For Next Contact',
    rounds: 0,
    lastOutboundDays: 8,
    contacts: [
      contact('Morgan Diaz', 'morgan@coffee.example', 4, 'Completed'),
      contact('Unknown POC', 'team@coffee.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'Small Space Stories',
    category: 'Lifestyle',
    status: 'In Sequence',
    rounds: 0,
    lastOutboundDays: 2,
    contacts: [
      contact(
        'Avery Stone',
        'avery@smallspace.example',
        3,
        'Active · Step 3 of 4',
      ),
    ],
  },
  {
    name: 'Practical Pixels',
    category: 'Design',
    status: 'Never Contacted',
    rounds: 0,
    lastOutboundDays: null,
    contacts: [
      contact('Casey Rivera', 'casey@pixels.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'Sunday Workshop',
    category: 'Creative Tools',
    status: 'Waterfall Exhausted',
    rounds: 1,
    lastOutboundDays: 16,
    contacts: [
      contact('Sam Brooks', 'sam@workshop.example', 4, 'Completed'),
      contact('Unknown POC', 'collabs@workshop.example', 4, 'Completed'),
    ],
  },
  {
    name: 'Bright Ideas Lab',
    category: 'Productivity',
    status: 'In Sequence',
    rounds: 0,
    lastOutboundDays: 0,
    contacts: [
      contact(
        'Robin James',
        'robin@brightideas.example',
        1,
        'Active · Step 1 of 4',
      ),
      contact('Unknown POC', 'hello@brightideas.example', 0, 'Not Enrolled'),
    ],
  },
  {
    name: 'Making Things Simple',
    category: 'Lifestyle',
    status: 'Ready For Next Contact',
    rounds: 0,
    lastOutboundDays: 18,
    contacts: [
      contact('Jamie Reed', 'jamie@simple.example', 4, 'Completed'),
      contact('Chris · Manager', 'chris@creators.example', 0, 'Not Enrolled'),
    ],
  },
];

export type OwnedInbox = {
  address: string;
  sends: number;
  replies: number;
  access: 'Available' | 'Unavailable' | 'Unknown';
};
export type Message = {
  direction: 'inbound' | 'outbound';
  daysAgo: number;
  from: string;
  to: string;
  body: string;
};
export type GhostedCreator = {
  name: string;
  category: string;
  person: string;
  replyDays: number;
  outboundDays: number;
  personFollowUps: number;
  allFollowUps: number;
  otherPerson: string;
  lastReply: string;
  inboxes: OwnedInbox[];
  firstReplyInbox: string;
  lastReplyInbox: string;
  lastSender: string;
  sequence: string;
  historyComplete: boolean;
};

const ORIGINAL_INBOX = 'sean@outreach.example';
const CURRENT_INBOX = 'kareem@team.example';
const OTHER_INBOX = 'partnerships@outreach.example';

export const GHOSTED_CREATORS: GhostedCreator[] = [
  {
    name: 'Creative Circuit',
    category: 'Software & Development',
    person: 'Alex Morgan',
    replyDays: 32,
    outboundDays: 3,
    personFollowUps: 3,
    allFollowUps: 5,
    otherPerson: 'Taylor · Manager',
    lastReply:
      'This sounds interesting. Could you send over the brief and the timeline you had in mind?',
    firstReplyInbox: ORIGINAL_INBOX,
    lastReplyInbox: ORIGINAL_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Active · Step 3 of 4',
    historyComplete: true,
    inboxes: [
      { address: ORIGINAL_INBOX, sends: 4, replies: 3, access: 'Available' },
      { address: CURRENT_INBOX, sends: 3, replies: 0, access: 'Available' },
    ],
  },
  {
    name: 'Life By Design',
    category: 'Lifestyle',
    person: 'Dana Foster',
    replyDays: 47,
    outboundDays: 14,
    personFollowUps: 6,
    allFollowUps: 8,
    otherPerson: 'Lee · Manager',
    lastReply:
      'Happy to explore a dedicated video. Let me check my availability for next month.',
    firstReplyInbox: ORIGINAL_INBOX,
    lastReplyInbox: OTHER_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Completed',
    historyComplete: true,
    inboxes: [
      { address: ORIGINAL_INBOX, sends: 3, replies: 2, access: 'Unavailable' },
      { address: OTHER_INBOX, sends: 5, replies: 4, access: 'Available' },
      { address: CURRENT_INBOX, sends: 4, replies: 0, access: 'Available' },
    ],
  },
  {
    name: 'The Quiet Builder',
    category: 'Productivity',
    person: 'Noah Blake',
    replyDays: 19,
    outboundDays: 2,
    personFollowUps: 2,
    allFollowUps: 2,
    otherPerson: 'No Other POC',
    lastReply:
      'Could you share a little more about the audience you are trying to reach?',
    firstReplyInbox: CURRENT_INBOX,
    lastReplyInbox: CURRENT_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Active · Step 2 of 4',
    historyComplete: true,
    inboxes: [
      { address: CURRENT_INBOX, sends: 5, replies: 3, access: 'Available' },
    ],
  },
  {
    name: 'Pixel Journal',
    category: 'Design',
    person: 'Sage Kim',
    replyDays: 61,
    outboundDays: 22,
    personFollowUps: 8,
    allFollowUps: 12,
    otherPerson: 'Jules · Manager',
    lastReply:
      'Thanks for the details. I will have a look and get back to you.',
    firstReplyInbox: ORIGINAL_INBOX,
    lastReplyInbox: ORIGINAL_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Completed',
    historyComplete: true,
    inboxes: [
      { address: ORIGINAL_INBOX, sends: 6, replies: 2, access: 'Unknown' },
      { address: CURRENT_INBOX, sends: 8, replies: 0, access: 'Available' },
    ],
  },
  {
    name: 'Beyond The Setup',
    category: 'Creative Tools',
    person: 'Elliot Gray',
    replyDays: 28,
    outboundDays: 6,
    personFollowUps: 4,
    allFollowUps: 4,
    otherPerson: 'No Other POC',
    lastReply:
      'Yes, please send the integration requirements and I can put together a quote.',
    firstReplyInbox: OTHER_INBOX,
    lastReplyInbox: CURRENT_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Completed',
    historyComplete: true,
    inboxes: [
      { address: OTHER_INBOX, sends: 2, replies: 1, access: 'Available' },
      { address: CURRENT_INBOX, sends: 6, replies: 2, access: 'Available' },
    ],
  },
  {
    name: 'Work In Progress',
    category: 'Productivity',
    person: 'Harper Lane',
    replyDays: 40,
    outboundDays: 9,
    personFollowUps: 3,
    allFollowUps: 6,
    otherPerson: 'Unknown POC',
    lastReply:
      'Could we revisit this after the launch? We should have more room then.',
    firstReplyInbox: ORIGINAL_INBOX,
    lastReplyInbox: ORIGINAL_INBOX,
    lastSender: CURRENT_INBOX,
    sequence: 'Unknown · Missing History',
    historyComplete: false,
    inboxes: [
      { address: ORIGINAL_INBOX, sends: 2, replies: 1, access: 'Unknown' },
      { address: CURRENT_INBOX, sends: 3, replies: 0, access: 'Available' },
    ],
  },
];

export const getMessages = (creator: GhostedCreator): Message[] => [
  {
    direction: 'outbound',
    daysAgo: creator.replyDays + 1,
    from: creator.lastReplyInbox,
    to: creator.person,
    body: 'Would you be interested in discussing a potential partnership? Happy to share more details.',
  },
  {
    direction: 'inbound',
    daysAgo: creator.replyDays,
    from: creator.person,
    to: creator.lastReplyInbox,
    body: creator.lastReply,
  },
  ...Array.from({ length: creator.personFollowUps }, (_, index): Message => ({
    direction: 'outbound',
    daysAgo: Math.round(
      creator.replyDays -
        (creator.replyDays - creator.outboundDays) *
          ((index + 1) / creator.personFollowUps),
    ),
    from: creator.lastSender,
    to: creator.person,
    body:
      index === 0
        ? 'Following up on our conversation. Here are the partnership details you asked for. Would you like to pick this up?'
        : 'Checking back in on the partnership. Is this still something you would like to explore?',
  })),
];
