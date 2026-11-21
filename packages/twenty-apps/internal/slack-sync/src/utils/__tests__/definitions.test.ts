import { describe, expect, it } from 'vitest';
import application from 'src/application.config';
import messaging from 'src/messaging-providers/slack';
import connection from 'src/connection-providers/slack';

describe('Slack app definitions', () => {
  it('retains the fork deduplication flag with the published SDK', () => {
    expect(messaging.errors).toEqual([]);
    expect(messaging.config).toHaveProperty(
      'deduplicateAcrossConnections',
      true,
    );
  });
  it('keeps credentials at application scope', () => {
    expect(application.errors).toEqual([]);
    expect(application.config.applicationVariables).toHaveProperty(
      'SLACK_SIGNING_SECRET.isSecret',
      true,
    );
    expect(application.config).not.toHaveProperty('serverVariables');
  });
  it('uses custom per-user authorization', () => {
    expect(connection.errors).toEqual([]);
    expect(connection.config).toMatchObject({ type: 'custom', scope: 'USER' });
  });
});
