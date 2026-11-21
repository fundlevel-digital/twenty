import { type LinkedinSettings } from 'src/types/linkedin-settings.type';

export const DEFAULT_LINKEDIN_SETTINGS: LinkedinSettings = {
  connectionsVisibility: 'WORKSPACE',
  areSalesNavigatorChatsImported: true,
  areInMailChatsImported: true,
  importPolicy: 'ALL',
  areGroupChatsImported: true,
  historyConversationLimit: -1,
  contactAutoCreationPolicy: 'NONE',
  isNameMatchingEnabled: true,
  areChatsMarkedAsRead: false,
};
