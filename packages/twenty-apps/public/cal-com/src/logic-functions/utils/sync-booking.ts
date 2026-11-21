import {
  DEFAULT_CONNECTION_SETTINGS,
  type ConnectionSettings,
} from 'src/types/connection-settings';
import {
  selectBookingAnswers,
  mapBookingAnswers,
} from 'src/logic-functions/utils/booking-preferences';
import { type CalComBooking } from 'src/logic-functions/types/booking';
import {
  bookingFields,
  bookingRecordId,
} from 'src/logic-functions/utils/booking-fields';
import { createWorkspaceGraphqlClient } from 'src/logic-functions/utils/workspace-client';

type SavedBooking = {
  id: string;
  updatedAt: string;
  sourceUpdatedAt: string | null;
};
type Edges<TNode> = { edges: { node: TNode }[] };

export const syncBooking = async (
  booking: CalComBooking,
  connectionId: string,
  settings: ConnectionSettings = DEFAULT_CONNECTION_SETTINGS,
  mappingFields: Set<string> = new Set(),
): Promise<void> => {
  const client = createWorkspaceGraphqlClient();
  const id = bookingRecordId(booking.uid);
  const load = () =>
    client.request<{ calComBookings: Edges<SavedBooking> }>(
      `query Booking($id: UUID!) { calComBookings(filter: { id: { eq: $id } }, first: 1) { edges { node { id updatedAt sourceUpdatedAt } } } }`,
      { id },
    );
  const existing = (await load()).calComBookings.edges[0]?.node;
  if (
    existing?.sourceUpdatedAt &&
    Date.parse(existing.sourceUpdatedAt) > Date.parse(booking.updatedAt)
  )
    return;

  const email = booking.attendees[0]?.email.toLowerCase();
  const people = email
    ? await client.request<{ people: Edges<{ id: string }> }>(
        `query MatchPerson($email: String!) { people(filter: { emails: { primaryEmail: { ilike: $email } } }, first: 2) { edges { node { id } } } }`,
        { email: email.replace(/[\%_]/g, (character) => '\\' + character) },
      )
    : null;
  let personId =
    people?.people.edges.length === 1
      ? people.people.edges[0].node.id
      : undefined;
  if (
    email &&
    people?.people.edges.length === 0 &&
    settings.createMissingContacts
  ) {
    const personIdToCreate = bookingRecordId(`person:${email}`);
    try {
      await client.request(
        `mutation CreateAttendee($data: PersonCreateInput!) { createPerson(data:$data){id} }`,
        {
          data: {
            id: personIdToCreate,
            name: { firstName: booking.attendees[0].name, lastName: '' },
            emails: { primaryEmail: email, additionalEmails: [] },
          },
        },
      );
    } catch (error) {
      const found = await client.request<{ people: Edges<{ id: string }> }>(
        `query CreatedAttendee($id: UUID!) {people(filter:{id:{eq:$id}},first:1){edges{node{id}}}}`,
        { id: personIdToCreate },
      );
      if (!found.people.edges.length) throw error;
    }
    personId = personIdToCreate;
  }
  const calendars = booking.icsUid
    ? await client.request<{ calendarEvents: Edges<{ id: string }> }>(
        `query MatchCalendar($uid: String!) { calendarEvents(filter: { iCalUid: { eq: $uid } }, first: 2) { edges { node { id } } } }`,
        { uid: booking.icsUid },
      )
    : null;
  const data = {
    ...bookingFields(booking, connectionId),
    ...(personId ? { personId } : {}),
    answers: selectBookingAnswers(booking.bookingFieldsResponses, settings),
    ...mapBookingAnswers(
      booking.bookingFieldsResponses,
      settings,
      mappingFields,
    ),
    ...(calendars?.calendarEvents.edges.length === 1
      ? { calendarEventId: calendars.calendarEvents.edges[0].node.id }
      : {}),
  };
  if (!existing) {
    try {
      await client.request(
        `mutation CreateBooking($data: CalComBookingCreateInput!) { createCalComBooking(data: $data) { id } }`,
        { data: { id, ...data } },
      );
      return;
    } catch (error) {
      if (!(await load()).calComBookings.edges[0]?.node) throw error;
      // A concurrent webhook may have created this row; retry against its version.
      return syncBooking(booking, connectionId, settings, mappingFields);
    }
  }
  const result = await client.request<{
    updateCalComBookings: { id: string }[];
  }>(
    `mutation UpdateBooking($filter: CalComBookingFilterInput!, $data: CalComBookingUpdateInput!) { updateCalComBookings(filter: $filter, data: $data) { id } }`,
    { filter: { id: { eq: id }, updatedAt: { eq: existing.updatedAt } }, data },
  );
  if (result.updateCalComBookings.length === 0)
    throw new Error('Booking changed during sync. Retry this job.');
};
