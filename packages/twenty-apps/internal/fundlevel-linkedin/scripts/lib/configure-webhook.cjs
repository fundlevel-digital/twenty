require('reflect-metadata');
const { join } = require('node:path');
const { createHmac } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { DataSource } = require('typeorm');
const moduleAt = (path) => require(join(process.cwd(), 'dist', path));
const { AppModule } = moduleAt('app.module');
const { ApplicationEntity } = moduleAt(
  'engine/core-modules/application/application.entity',
);
const { ApplicationVariableEntityService } = moduleAt(
  'engine/core-modules/application/application-variable/application-variable.service',
);
const { ApplicationRegistrationVariableEntity } = moduleAt(
  'engine/core-modules/application/application-registration-variable/application-registration-variable.entity',
);
const { ApplicationRegistrationVariableService } = moduleAt(
  'engine/core-modules/application/application-registration-variable/application-registration-variable.service',
);
const APPLICATION_IDENTIFIER = '52d88794-a0fa-4e26-bbbe-8efe622efb52';
const RESOLVER_IDENTIFIER = 'ddb93016-b894-412f-887b-cb9f306b157f';
const TRIGGER_EVENTS = [
  'message.new',
  'account.status.disconnected',
  'account.status.errored',
];
const main = async () => {
  const workspaceId = process.argv[1];
  const isApplying = process.argv.includes('--apply');
  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const database = application.get(DataSource);
    const installed = await database
      .getRepository(ApplicationEntity)
      .findOneByOrFail({
        workspaceId,
        universalIdentifier: APPLICATION_IDENTIFIER,
      });
    if (!installed.applicationRegistrationId)
      throw new Error('LinkedIn Sync has no application registration.');
    const variables = application.get(ApplicationVariableEntityService);
    const environment = await variables.getServerEnvVariables({
      workspaceId,
      applicationId: installed.id,
    });
    const apiKey = environment.UNIPILE_API_KEY;
    if (!apiKey)
      throw new Error(
        'Save the Unipile API key before configuring its webhook.',
      );
    const target = new URL(
      `/webhooks/server/${installed.applicationRegistrationId}/${RESOLVER_IDENTIFIER}`,
      process.env.SERVER_URL,
    ).toString();
    if (!target.startsWith('https://'))
      throw new Error('The production webhook requires HTTPS.');
    const request = async (path, body, method = body ? 'POST' : 'GET') => {
      const response = await fetch(
        `https://api.unipile.com/v2/webhooks/endpoints/${path}`,
        {
          method,
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!response.ok)
        throw new Error(
          `Unipile webhook API returned HTTP ${response.status}.`,
        );
      return response.json();
    };
    const matches = [];
    for (let offset = 0; ; ) {
      const page = await request(`?limit=100&offset=${offset}`);
      if (!Array.isArray(page.data))
        throw new Error('Unipile returned an invalid endpoint list.');
      matches.push(...page.data.filter((endpoint) => endpoint.url === target));
      if (!page.has_more) break;
      if (!page.data.length)
        throw new Error('Webhook endpoint pagination did not advance.');
      offset += page.data.length;
    }
    if (matches.length > 1)
      throw new Error(
        'Multiple endpoints match this app; reconcile them before configuration.',
      );
    console.log(
      JSON.stringify({
        isApplying,
        matchingEndpoints: matches.length,
        willCreate: matches.length === 0,
      }),
    );
    if (!isApplying) return;
    let endpoint = matches[0];
    if (!endpoint)
      endpoint = await request('', {
        url: target,
        trigger_events: TRIGGER_EVENTS,
        description: 'Twenty LinkedIn Sync',
      });
    else if (
      !endpoint.enabled ||
      TRIGGER_EVENTS.some((event) => !endpoint.trigger_events.includes(event))
    )
      endpoint = await request(
        endpoint.id,
        {
          enabled: true,
          trigger_events: [
            ...new Set([...endpoint.trigger_events, ...TRIGGER_EVENTS]),
          ],
        },
        'PATCH',
      );
    if (!endpoint.secret || !endpoint.id)
      throw new Error('Unipile did not return its endpoint secret.');
    await variables.update({
      key: 'UNIPILE_WEBHOOK_SECRET',
      plainTextValue: endpoint.secret,
      workspaceId,
      applicationId: installed.id,
    });
    const registrationVariables = await database
      .getRepository(ApplicationRegistrationVariableEntity)
      .find({
        where: {
          applicationRegistrationId: installed.applicationRegistrationId,
        },
      });
    const registrationService = application.get(
      ApplicationRegistrationVariableService,
    );
    for (const [key, value] of [
      ['UNIPILE_API_KEY', apiKey],
      ['UNIPILE_WEBHOOK_SECRET', endpoint.secret],
    ]) {
      const variable = registrationVariables.find((item) => item.key === key);
      if (!variable)
        throw new Error(
          'The LinkedIn registration is missing a required server variable.',
        );
      await registrationService.updateVariableGlobal({
        id: variable.id,
        update: { value },
      });
    }
    const body = JSON.stringify({
      id: 'twenty-webhook-configuration-check',
      type: 'account.status.disconnected',
      account_provider: 'mock',
      account_id: 'configuration-check',
      created_at: new Date().toISOString(),
      payload: {},
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', endpoint.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    const signed = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'unipile-signature': `t=${timestamp},v0=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (!signed.ok)
      throw new Error(
        `Signed webhook verification returned HTTP ${signed.status}.`,
      );
    const rejected = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (rejected.status !== 401)
      throw new Error(
        `Unsigned webhook verification returned HTTP ${rejected.status}; expected 401.`,
      );
    console.log(
      JSON.stringify({
        endpointConfigured: true,
        endpointId: endpoint.id,
        signedDeliveryStatus: signed.status,
        unsignedDeliveryStatus: rejected.status,
        secretsStored: true,
      }),
    );
  } finally {
    await application.close();
  }
};
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
