CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  notified_at TEXT,
  claim_token TEXT,
  claim_until TEXT
);
CREATE INDEX contact_messages_pending ON contact_messages (notified_at, created_at);

CREATE TABLE prayer_requests (
  id TEXT PRIMARY KEY,
  name TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  notified_at TEXT,
  digest_id TEXT
);
CREATE INDEX prayer_requests_pending ON prayer_requests (notified_at, created_at);

CREATE TABLE prayer_digests (
  id TEXT PRIMARY KEY,
  cutoff TEXT NOT NULL,
  sent_at TEXT,
  claim_token TEXT,
  claim_until TEXT
);
