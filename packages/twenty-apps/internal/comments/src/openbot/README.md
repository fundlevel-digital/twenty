# Optional Bot Adapter

OpenBot is a [separate installable app](../../../openbot/README.md). It owns bot
identities, the supplied logo, settings, credentials, deliveries, callbacks,
Task assignments and workflows. Comments owns ordinary human comment threads
and validates selected mentions.

This folder only discovers public profiles, validates selected recipients,
queues a persisted comment ID, and reads app-owned replies/statuses through
OpenBot's native authenticated `/s/openbot/bridge` route. Normal Comments remain
usable when OpenBot is absent or unavailable. Delivery failures preserve the
saved comment and show a warning. No bot webhook credentials are stored here.

The provider returns generic `objectName: 'bot'` identities. Legacy
`openbotAgent` selections remain readable for existing history. Bots are
separate from human login accounts. Only the OpenBot adapter is implemented;
future providers need an explicit adapter and model extension.
