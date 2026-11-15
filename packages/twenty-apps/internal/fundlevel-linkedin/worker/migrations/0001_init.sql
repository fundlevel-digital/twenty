-- Raw Unipile data for the LinkedIn Sync app.

-- Latest version of every object the app read from Unipile, exactly as returned.
-- kind: account | profile | sales_navigator_profile | relation | sent_request | received_request | chat | message
CREATE TABLE unipile_object (
  kind TEXT NOT NULL,
  unipile_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  first_seen_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (kind, unipile_id)
);
CREATE INDEX unipile_object_account ON unipile_object (account_id, kind);

-- Every webhook delivery Unipile sent, append-only, with what Twenty answered when it was forwarded.
CREATE TABLE unipile_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE, -- Unipile's event ID when present; redeliveries update the same row
  type TEXT,
  account_id TEXT,
  received_at TEXT NOT NULL,
  last_delivery_at TEXT NOT NULL,
  deliveries INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL, -- JSON body as received
  forward_status INTEGER, -- HTTP status Twenty returned (null when forwarding failed outright)
  forward_response TEXT,
  forward_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX unipile_event_retry ON unipile_event (forward_status, received_at);
CREATE INDEX unipile_event_account ON unipile_event (account_id, received_at);
CREATE INDEX unipile_event_type ON unipile_event (type, received_at);
