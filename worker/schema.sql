CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  salon       TEXT DEFAULT 'otros',
  name        TEXT,
  phone       TEXT,
  wa_jid      TEXT,
  source      TEXT DEFAULT 'whatsapp',
  event_type  TEXT,
  event_year  TEXT,
  stage       TEXT DEFAULT 'nuevo_lead',
  guests      INTEGER DEFAULT 0,
  notes       TEXT,
  last_message TEXT,
  created_at  INTEGER,
  updated_at  INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id   TEXT NOT NULL,
  direction TEXT NOT NULL,
  text      TEXT NOT NULL,
  author    TEXT,
  ts        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_lead ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at DESC);
