export const isCommentsInboxView = (location: { search: string }) =>
  new URLSearchParams(location.search).get('section') === 'comments';
