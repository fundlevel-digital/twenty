import { i18n } from '@lingui/core';
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Callout } from 'twenty-ui/components/feedback';
import { SearchInput } from 'twenty-ui/components/input';
import {
  IconArrowsSort,
  IconArrowRight,
  IconBrandLinkedin,
  IconChevronRight,
  IconLayoutDashboard,
  IconLayoutSidebarRightCollapse,
  IconMail,
  IconMoon,
  IconSun,
  IconUser,
  IconUsers,
  IconZzz,
} from 'twenty-ui/icon';
import { Avatar, Badge, Status } from 'twenty-ui/primitives/data-display';
import { Button } from 'twenty-ui/primitives/input';
import { ListItem, Tabs } from 'twenty-ui/primitives/navigation';
import { Card } from 'twenty-ui/primitives/surfaces';
import { Heading, Text } from 'twenty-ui/primitives/typography';
import { ThemeProvider } from 'twenty-ui/theme';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import 'twenty-ui/style.css';
import './style.css';
import {
  COLD_CREATORS,
  GHOSTED_CREATORS,
  getMessages,
  type ColdCreator,
  type GhostedCreator,
  type OutreachStatus,
} from './data';

i18n.loadAndActivate({ locale: 'en', messages: {} });
const translate = (message: string) => i18n._({ id: message, message });
const daysAgo = (days: number | null) =>
  days === null
    ? translate('Never')
    : days === 0
      ? translate('Today')
      : days === 1
        ? translate('1 Day Ago')
        : `${days} ${translate('Days Ago')}`;
type Page = 'cold' | 'ghosted';
type Selection =
  | { page: 'cold'; creator: ColdCreator }
  | { page: 'ghosted'; creator: GhostedCreator };
type SummaryCardProps = {
  label: string;
  count: number;
  description: string;
  onClick: () => void;
  active: boolean;
};

const SummaryCard = ({
  label,
  count,
  description,
  onClick,
  active,
}: SummaryCardProps) => (
  <Card.Root className={active ? 'summary active-summary' : 'summary'}>
    <Card.Content>
      <Text color="secondary" size="sm">
        {translate(label)}
      </Text>
      <Heading size="xxl" className="metric">
        {count}
      </Heading>
      <Text color="tertiary" size="sm">
        {translate(description)}
      </Text>
      <div className="summary-action">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClick}
          aria-pressed={active}
          endIcon={<IconArrowRight size={14} />}
        >
          {translate('View Creators')}
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
);

const CreatorIdentifier = ({
  name,
  category,
  onClick,
}: {
  name: string;
  category: string;
  onClick: () => void;
}) => (
  <div className="creator-identifier">
    <Avatar name={name} shape="square" size="md" />
    <div>
      <Button size="sm" variant="ghost" onClick={onClick}>
        {name}
      </Button>
      <Text size="sm" color="tertiary">
        {translate(category)}
      </Text>
    </div>
  </div>
);

const StatusLabel = ({ status }: { status: OutreachStatus }) => (
  <Status
    color={
      status === 'In Sequence'
        ? 'blue'
        : status === 'Never Contacted'
          ? 'gray'
          : 'orange'
    }
  >
    {translate(status)}
  </Status>
);

const InboxFields = ({ creator }: { creator: GhostedCreator }) => (
  <dl className="properties">
    <dt>{translate('First Inbox With A Reply')}</dt>
    <dd>{creator.firstReplyInbox}</dd>
    <dt>{translate('Latest Inbox With A Reply')}</dt>
    <dd>{creator.lastReplyInbox}</dd>
    <dt>{translate('Latest Sending Inbox')}</dt>
    <dd>{creator.lastSender}</dd>
  </dl>
);

const ColdDetails = ({ creator }: { creator: ColdCreator }) => {
  const emailsTried = creator.contacts.filter(
    (contact) => contact.sends > 0,
  ).length;
  return (
    <>
      <div className="detail-section">
        <StatusLabel status={creator.status} />
        <Text color="secondary" className="section-description">
          {translate(
            'Review contact coverage before deciding where to continue outreach.',
          )}
        </Text>
      </div>
      <div className="detail-section">
        <Heading size="md">{translate('Outreach Progress')}</Heading>
        <dl className="properties">
          <dt>{translate('Emails Tried')}</dt>
          <dd>
            {emailsTried} / {creator.contacts.length}
          </dd>
          <dt>{translate('Completed Waterfall Rounds')}</dt>
          <dd>{creator.rounds}</dd>
          <dt>{translate('Last Outbound')}</dt>
          <dd>{daysAgo(creator.lastOutboundDays)}</dd>
        </dl>
      </div>
      <div className="detail-section">
        <Heading size="md">{translate('POCs & Email Usage')}</Heading>
        <Text size="sm" color="tertiary" className="section-description">
          {translate(
            'Grouped by person. Contact order is illustrative; ranking is deferred.',
          )}
        </Text>
        {creator.contacts.map((contact) => (
          <Card.Root key={contact.email} className="contact-card">
            <Card.Content>
              <div className="spread">
                <Text weight="medium">{contact.name}</Text>
                <Badge>
                  {contact.sends} {translate('Sends')}
                </Badge>
              </div>
              <Text size="sm" color="secondary" className="email">
                {contact.email}
              </Text>
              <Text size="sm" color="tertiary">
                {translate(contact.sequence)}
              </Text>
            </Card.Content>
          </Card.Root>
        ))}
      </div>
      <div className="detail-section">
        <Callout
          fullWidth
          title={translate('LinkedIn History Not Included')}
          description={translate(
            'An email-only view cannot establish whether this creator has been contacted on LinkedIn.',
          )}
          icon={<IconBrandLinkedin size={16} />}
        />
      </div>
    </>
  );
};

const GhostedDetails = ({ creator }: { creator: GhostedCreator }) => {
  const [detailTab, setDetailTab] = useState('context');
  const [sortByReplies, setSortByReplies] = useState(true);
  const inboxes = [...creator.inboxes].sort((left, right) =>
    sortByReplies ? right.replies - left.replies : left.sends - right.sends,
  );
  return (
    <>
      <div className="detail-section">
        <div className="spread">
          <Status color="gray">{translate('Ghosted')}</Status>
          <Badge>{translate(creator.sequence)}</Badge>
        </div>
        <Text color="secondary" className="section-description">
          {translate('Stage remains Ghosted when restarting contact outreach.')}
        </Text>
      </div>
      <Tabs.Root
        value={detailTab}
        onValueChange={(value) => setDetailTab(String(value))}
      >
        <div className="detail-tabs">
          <Tabs.List aria-label={translate('Creator Details')}>
            <Tabs.Tab value="context">{translate('Context')}</Tabs.Tab>
            <Tabs.Tab value="inboxes">{translate('Inboxes')}</Tabs.Tab>
            <Tabs.Tab value="thread">{translate('Thread')}</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        </div>
        <Tabs.Panel value="context">
          <div className="detail-section">
            <Heading size="md">{translate('Since The Last Reply')}</Heading>
            <Text size="sm" color="tertiary" className="section-description">
              {translate(
                'Email-only sample. Both counts use the latest creator reply as their starting point.',
              )}
            </Text>
            <dl className="properties">
              <dt>{translate('Last Reply')}</dt>
              <dd>{daysAgo(creator.replyDays)}</dd>
              <dt>{translate('Last Follow-Up')}</dt>
              <dd>{daysAgo(creator.outboundDays)}</dd>
              <dt>{translate('To Last Responding POC')}</dt>
              <dd>{creator.personFollowUps}</dd>
              <dt>{translate('Across All POCs')}</dt>
              <dd>
                {creator.allFollowUps} {translate('(Includes This POC)')}
              </dd>
            </dl>
            <div className="contact-breakdown">
              <ListItem
                startIcon={<IconUser size={16} />}
                description={`${creator.personFollowUps} ${translate('Unanswered')}`}
                descriptionPlacement="end"
              >
                {creator.person}
              </ListItem>
              {creator.allFollowUps > creator.personFollowUps && (
                <ListItem
                  startIcon={<IconUser size={16} />}
                  description={`${creator.allFollowUps - creator.personFollowUps} ${translate('Unanswered')}`}
                  descriptionPlacement="end"
                >
                  {creator.otherPerson}
                </ListItem>
              )}
            </div>
          </div>
          <div className="detail-section">
            <Heading size="md">{translate('Latest Reply')}</Heading>
            <Text size="sm" color="tertiary" className="section-description">
              {creator.person} · {daysAgo(creator.replyDays)}
            </Text>
            <blockquote>
              <Text>{creator.lastReply}</Text>
            </blockquote>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailTab('thread')}
              endIcon={<IconArrowRight size={14} />}
            >
              {translate('Open Conversation')}
            </Button>
          </div>
          <div className="detail-section">
            <Heading size="md">{translate('Inbox History')}</Heading>
            <InboxFields creator={creator} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailTab('inboxes')}
              endIcon={<IconArrowRight size={14} />}
            >
              {translate('Compare Inboxes')}
            </Button>
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="inboxes">
          <div className="detail-section">
            <Heading size="md">{translate('Inbox History')}</Heading>
            <InboxFields creator={creator} />
          </div>
          <div className="detail-section">
            <div className="spread">
              <Heading size="md">{translate('Inbox Activity')}</Heading>
              <Button
                size="sm"
                variant="ghost"
                startIcon={<IconArrowsSort size={14} />}
                onClick={() => setSortByReplies(!sortByReplies)}
              >
                {translate(sortByReplies ? 'Most Replies' : 'Least Used')}
              </Button>
            </div>
            <Text size="sm" color="tertiary" className="section-description">
              {translate(
                'Historical email activity with the last responding POC. Reply counts are evidence of past responses, not proof of deliverability.',
              )}
            </Text>
            {inboxes.map((inbox) => (
              <Card.Root className="contact-card" key={inbox.address}>
                <Card.Content>
                  <Text weight="medium" className="email">
                    {inbox.address}
                  </Text>
                  <div className="spread inbox-counts">
                    <Text size="sm" color="secondary">
                      {inbox.sends} {translate('Sends')} · {inbox.replies}{' '}
                      {translate('Replies')}
                    </Text>
                    <Status
                      color={inbox.access === 'Available' ? 'green' : 'gray'}
                    >
                      {translate(inbox.access)}
                    </Status>
                  </div>
                </Card.Content>
              </Card.Root>
            ))}
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="thread">
          <div className="detail-section">
            <Heading size="md">{translate('Sample Conversation')}</Heading>
            <Text size="sm" color="tertiary" className="section-description">
              {translate(
                'Illustrative excerpt showing the last reply and subsequent follow-ups. Inbox totals include earlier exchanges.',
              )}
            </Text>
            <div className="thread">
              {getMessages(creator).map((message, index) => (
                <Card.Root
                  key={index}
                  className={
                    message.direction === 'inbound'
                      ? 'message inbound'
                      : 'message'
                  }
                >
                  <Card.Content>
                    <div className="spread">
                      <Text weight="medium">{message.from}</Text>
                      <Text size="sm" color="tertiary">
                        {daysAgo(message.daysAgo)}
                      </Text>
                    </div>
                    <Text size="sm" color="tertiary" className="email">
                      {translate('To')} {message.to}
                    </Text>
                    <Text className="message-body">{message.body}</Text>
                  </Card.Content>
                </Card.Root>
              ))}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
};

const TableHeader = ({ children }: { children: ReactNode }) => (
  <th scope="col">{children}</th>
);

const App = () => {
  const [page, setPage] = useState<Page>(
    window.location.hash === '#ghosted' ? 'ghosted' : 'cold',
  );
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState('');
  const [coldFilter, setColdFilter] = useState('All Creators');
  const [ghostedFilter, setGhostedFilter] = useState('All Creators');
  const [inboxView, setInboxView] = useState(false);
  const [oldestFirst, setOldestFirst] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const switchPage = (nextPage: Page) => {
    setPage(nextPage);
    setSelection(null);
    setSearch('');
    window.location.hash = nextPage;
  };
  const matchesSearch = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase());
  const coldCreators = COLD_CREATORS.filter(
    (creator) =>
      matchesSearch(creator.name) &&
      (coldFilter === 'All Creators' || creator.status === coldFilter),
  ).sort((left, right) =>
    oldestFirst
      ? (right.lastOutboundDays ?? -1) - (left.lastOutboundDays ?? -1)
      : 0,
  );
  const ghostedCreators = GHOSTED_CREATORS.filter(
    (creator) =>
      matchesSearch(creator.name) &&
      (ghostedFilter === 'All Creators' ||
        (ghostedFilter === 'In Sequence' &&
          creator.sequence.startsWith('Active')) ||
        (ghostedFilter === 'Sequence Completed' &&
          creator.sequence === 'Completed') ||
        (ghostedFilter === 'History Incomplete' && !creator.historyComplete)),
  ).sort((left, right) => (oldestFirst ? right.replyDays - left.replyDays : 0));
  const statuses: OutreachStatus[] = [
    'Never Contacted',
    'In Sequence',
    'Ready For Next Contact',
    'Waterfall Exhausted',
  ];
  const ghostedGroups = [
    'In Sequence',
    'Sequence Completed',
    'History Incomplete',
  ];
  const ghostedCount = (filter: string) =>
    GHOSTED_CREATORS.filter((creator) =>
      filter === 'In Sequence'
        ? creator.sequence.startsWith('Active')
        : filter === 'Sequence Completed'
          ? creator.sequence === 'Completed'
          : !creator.historyComplete,
    ).length;
  return (
    <ThemeProvider colorScheme={darkMode ? 'dark' : 'light'}>
      <div
        className="app"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setSelection(null);
        }}
      >
        <nav className="sidebar" aria-label={translate('Workspace Navigation')}>
          <div className="workspace">
            <Avatar name="Fundlevel" size="sm" shape="square" />
            <Text weight="semibold">Fundlevel</Text>
            <Badge>{translate('Preview')}</Badge>
          </div>
          <div className="sidebar-section">
            <Text size="xs" color="tertiary">
              {translate('WORKSPACE')}
            </Text>
            <ListItem startIcon={<IconLayoutDashboard size={16} />} selected>
              {translate('Influencer Outreach')}
            </ListItem>
          </div>
          <div className="sidebar-section">
            <Text size="xs" color="tertiary">
              {translate('DASHBOARDS')}
            </Text>
            <ListItem
              startIcon={<IconMail size={16} />}
              selected={page === 'cold'}
              render={<button type="button" />}
              onClick={() => switchPage('cold')}
            >
              {translate('Cold')}
            </ListItem>
            <ListItem
              startIcon={<IconZzz size={16} />}
              selected={page === 'ghosted'}
              render={<button type="button" />}
              onClick={() => switchPage('ghosted')}
            >
              {translate('Ghosted')}
            </ListItem>
          </div>
          <div className="sidebar-bottom">
            <Text size="sm" color="tertiary">
              {translate('Fictional sample data')}
            </Text>
            <Text size="sm" color="tertiary">
              {translate('For dashboard review')}
            </Text>
          </div>
        </nav>
        <div className="workspace-content">
          <header className="topbar">
            <div className="breadcrumb">
              <IconLayoutDashboard size={16} />
              <Text color="secondary">{translate('Influencer Outreach')}</Text>
              <IconChevronRight size={14} />
              <Text>{translate(page === 'cold' ? 'Cold' : 'Ghosted')}</Text>
            </div>
            <div className="inline">
              <Badge>{translate('Interactive Preview')}</Badge>
              <Button
                size="sm"
                variant="ghost"
                aria-label={translate(
                  darkMode ? 'Switch To Light Mode' : 'Switch To Dark Mode',
                )}
                onClick={() => setDarkMode(!darkMode)}
                startIcon={
                  darkMode ? <IconSun size={16} /> : <IconMoon size={16} />
                }
              />
            </div>
          </header>
          <div className="page-tabs">
            <Tabs.Root
              value={page}
              onValueChange={(value) => switchPage(value as Page)}
            >
              <Tabs.List aria-label={translate('Outreach Dashboards')}>
                <Tabs.Tab value="cold">
                  <IconMail size={14} />
                  {translate('Cold')}
                  <Badge>{COLD_CREATORS.length}</Badge>
                </Tabs.Tab>
                <Tabs.Tab value="ghosted">
                  <IconZzz size={14} />
                  {translate('Ghosted')}
                  <Badge>{GHOSTED_CREATORS.length}</Badge>
                </Tabs.Tab>
                <Tabs.Indicator />
              </Tabs.List>
            </Tabs.Root>
          </div>
          <div
            className={selection ? 'content-grid with-detail' : 'content-grid'}
          >
            <main>
              <div className="page-intro">
                <div>
                  <Heading level={1} size="xl">
                    {translate(
                      page === 'cold'
                        ? 'Cold Outreach'
                        : 'Ghosted Conversations',
                    )}
                  </Heading>
                  <Text color="secondary" className="section-description">
                    {translate(
                      page === 'cold'
                        ? 'See who has been contacted, where outreach stopped, and which contacts remain.'
                        : 'Review unanswered follow-ups, conversation context, and the inboxes that received replies.',
                    )}
                  </Text>
                </div>
              </div>
              <div className="notice">
                <Callout
                  fullWidth
                  title={translate('Preview · Fictional Data')}
                  description={translate(
                    'Email activity is illustrated. LinkedIn history is not included; cross-channel totals remain unknown.',
                  )}
                  icon={<IconBrandLinkedin size={16} />}
                />
              </div>
              <div
                className={
                  page === 'cold' ? 'summaries' : 'summaries ghosted-summaries'
                }
              >
                {page === 'cold'
                  ? statuses.map((status, index) => (
                      <SummaryCard
                        key={status}
                        label={status}
                        count={
                          COLD_CREATORS.filter(
                            (creator) => creator.status === status,
                          ).length
                        }
                        description={
                          [
                            'No email outreach recorded',
                            'An email sequence is running',
                            'Sequence ended; contacts remain',
                            'All available emails tried',
                          ][index]
                        }
                        active={coldFilter === status}
                        onClick={() =>
                          setColdFilter(
                            coldFilter === status ? 'All Creators' : status,
                          )
                        }
                      />
                    ))
                  : ghostedGroups.map((group, index) => (
                      <SummaryCard
                        key={group}
                        label={group}
                        count={ghostedCount(group)}
                        description={
                          [
                            'Follow-ups are still running',
                            'Review reactivation options',
                            'Check coverage before acting',
                          ][index]
                        }
                        active={ghostedFilter === group}
                        onClick={() =>
                          setGhostedFilter(
                            ghostedFilter === group ? 'All Creators' : group,
                          )
                        }
                      />
                    ))}
              </div>
              <section
                className="records"
                aria-label={translate('Creator Outreach Table')}
              >
                <div className="table-toolbar">
                  <div className="inline">
                    <IconUsers size={16} />
                    <Text weight="medium">
                      {translate(page === 'cold' ? coldFilter : ghostedFilter)}
                    </Text>
                    <Badge>
                      {page === 'cold'
                        ? coldCreators.length
                        : ghostedCreators.length}
                    </Badge>
                    {(page === 'cold' ? coldFilter : ghostedFilter) !==
                      'All Creators' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          page === 'cold'
                            ? setColdFilter('All Creators')
                            : setGhostedFilter('All Creators')
                        }
                      >
                        {translate('Clear Filter')}
                      </Button>
                    )}
                  </div>
                  <div className="table-actions">
                    <SearchInput
                      aria-label={translate('Search Creators')}
                      placeholder={translate('Search Creators')}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <Button
                      size="sm"
                      variant={oldestFirst ? 'solid' : 'ghost'}
                      onClick={() => setOldestFirst(!oldestFirst)}
                      startIcon={<IconArrowsSort size={14} />}
                    >
                      {translate(oldestFirst ? 'Oldest First' : 'Sort')}
                    </Button>
                  </div>
                </div>
                {page === 'ghosted' && (
                  <div className="table-subtabs">
                    <Tabs.Root
                      value={inboxView ? 'inboxes' : 'conversations'}
                      onValueChange={(value) =>
                        setInboxView(value === 'inboxes')
                      }
                    >
                      <Tabs.List aria-label={translate('Ghosted Table View')}>
                        <Tabs.Tab value="conversations">
                          {translate('Conversations')}
                        </Tabs.Tab>
                        <Tabs.Tab value="inboxes">
                          {translate('Inbox History')}
                        </Tabs.Tab>
                        <Tabs.Indicator />
                      </Tabs.List>
                    </Tabs.Root>
                  </div>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <TableHeader>{translate('Creator')}</TableHeader>
                        {page === 'cold' ? (
                          <>
                            <TableHeader>
                              {translate('Outreach Status')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Emails Tried')}
                            </TableHeader>
                            <TableHeader>
                              {translate('POCs Reached')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Full Rounds')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Last Outbound')}
                            </TableHeader>
                          </>
                        ) : inboxView ? (
                          <>
                            <TableHeader>
                              {translate('First Reply Inbox')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Latest Reply Inbox')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Latest Sending Inbox')}
                            </TableHeader>
                          </>
                        ) : (
                          <>
                            <TableHeader>{translate('Last Reply')}</TableHeader>
                            <TableHeader>
                              {translate('Last Follow-Up')}
                            </TableHeader>
                            <TableHeader>
                              {translate('Unanswered')}
                              <Text size="sm" color="tertiary">
                                {translate('This POC / All POCs')}
                              </Text>
                            </TableHeader>
                            <TableHeader>
                              {translate('Latest Reply')}
                            </TableHeader>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {page === 'cold'
                        ? coldCreators.map((creator) => (
                            <tr
                              key={creator.name}
                              className={
                                selection?.creator.name === creator.name
                                  ? 'selected-row'
                                  : ''
                              }
                            >
                              <td>
                                <CreatorIdentifier
                                  name={creator.name}
                                  category={creator.category}
                                  onClick={() =>
                                    setSelection({ page: 'cold', creator })
                                  }
                                />
                              </td>
                              <td>
                                <StatusLabel status={creator.status} />
                              </td>
                              <td>
                                {
                                  creator.contacts.filter(
                                    (contact) => contact.sends > 0,
                                  ).length
                                }
                                <span className="muted">
                                  {' '}
                                  / {creator.contacts.length}
                                </span>
                              </td>
                              <td>
                                {
                                  new Set(
                                    creator.contacts
                                      .filter((contact) => contact.sends > 0)
                                      .map((contact) => contact.name),
                                  ).size
                                }
                                <span className="muted">
                                  {' '}
                                  /{' '}
                                  {
                                    new Set(
                                      creator.contacts.map(
                                        (contact) => contact.name,
                                      ),
                                    ).size
                                  }
                                </span>
                              </td>
                              <td>{creator.rounds}</td>
                              <td>{daysAgo(creator.lastOutboundDays)}</td>
                            </tr>
                          ))
                        : ghostedCreators.map((creator) => (
                            <tr
                              key={creator.name}
                              className={
                                selection?.creator.name === creator.name
                                  ? 'selected-row'
                                  : ''
                              }
                            >
                              <td>
                                <CreatorIdentifier
                                  name={creator.name}
                                  category={creator.category}
                                  onClick={() =>
                                    setSelection({ page: 'ghosted', creator })
                                  }
                                />
                                {!creator.historyComplete && (
                                  <Text size="sm" color="tertiary">
                                    {translate(
                                      'History Incomplete · Counts Are Partial',
                                    )}
                                  </Text>
                                )}
                              </td>
                              {inboxView ? (
                                <>
                                  <td className="inbox-cell">
                                    {creator.firstReplyInbox}
                                  </td>
                                  <td className="inbox-cell">
                                    {creator.lastReplyInbox}
                                  </td>
                                  <td className="inbox-cell">
                                    {creator.lastSender}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{daysAgo(creator.replyDays)}</td>
                                  <td>{daysAgo(creator.outboundDays)}</td>
                                  <td>
                                    <div className="follow-up-counts">
                                      <Text weight="semibold">
                                        {creator.personFollowUps}
                                      </Text>
                                      <Text color="tertiary">/</Text>
                                      <Text>{creator.allFollowUps}</Text>
                                    </div>
                                    <Text size="sm" color="tertiary">
                                      {creator.person}
                                    </Text>
                                  </td>
                                  <td className="reply-cell">
                                    <Text size="sm" color="secondary">
                                      {creator.lastReply}
                                    </Text>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                      {(page === 'cold'
                        ? coldCreators.length
                        : ghostedCreators.length) === 0 && (
                        <tr>
                          <td colSpan={page === 'cold' ? 6 : inboxView ? 4 : 5}>
                            <Text color="tertiary">
                              {translate(
                                'No creators match this search and filter.',
                              )}
                            </Text>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSearch('');
                                setColdFilter('All Creators');
                                setGhostedFilter('All Creators');
                              }}
                            >
                              {translate('Reset View')}
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <Text size="sm" color="tertiary">
                    {translate(
                      'Select A Creator To Review Contacts And History',
                    )}
                  </Text>
                  <Text size="sm" color="tertiary">
                    {translate('Sample Snapshot · 23 Nov 2026')}
                  </Text>
                </div>
              </section>
              <div className="page-footnote">
                <IconMail size={14} />
                <Text size="sm" color="tertiary">
                  {translate(
                    page === 'cold'
                      ? 'Waterfall rounds use explicit sample sequence history. Message counts alone do not establish completed rounds.'
                      : 'Ghosted is a judgment-based stage. No automatic time or follow-up threshold is applied.',
                  )}
                </Text>
              </div>
            </main>
            {selection && (
              <aside
                className="detail-panel"
                aria-label={translate('Creator Details')}
              >
                <div className="detail-header">
                  <Button
                    size="sm"
                    variant="ghost"
                    autoFocus
                    aria-label={translate('Close Creator Details')}
                    startIcon={<IconLayoutSidebarRightCollapse size={16} />}
                    onClick={() => setSelection(null)}
                  />
                  <Text weight="semibold">{selection.creator.name}</Text>
                </div>
                {selection.page === 'cold' ? (
                  <ColdDetails creator={selection.creator} />
                ) : (
                  <GhostedDetails
                    key={selection.creator.name}
                    creator={selection.creator}
                  />
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
