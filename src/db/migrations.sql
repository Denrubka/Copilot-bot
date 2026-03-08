-- src/db/migrations.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE,
  username TEXT,
  first_name TEXT,
  age_group TEXT,          -- 'under18' | '18plus'
  goal TEXT,               -- 'self' | 'study' | 'travel' | 'exam'
  level TEXT,              -- 'C0' | 'B1' | ...
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('welcome_text', 'Привет! Я Амелия. Давай познакомимся :)'),
  ('welcome_video_file_id', ''),
  ('lesson_link', 'https://example.com/lesson');

-- slots
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,        -- YYYY-MM-DD
  time TEXT NOT NULL,        -- HH:MM
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, time)
);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  slot_id INTEGER NOT NULL,
  type TEXT NOT NULL,        -- 'trial' | 'regular'
  status TEXT NOT NULL,      -- 'pending_payment' | 'paid' | 'cancelled' | 'expired'
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notify_24h INTEGER DEFAULT 0,
  notify_1h INTEGER DEFAULT 0,
  notify_15m INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(slot_id) REFERENCES slots(id)
);

-- admin messages mapping for replies
CREATE TABLE IF NOT EXISTS admin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  admin_message_id INTEGER NOT NULL,
  admin_chat_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);