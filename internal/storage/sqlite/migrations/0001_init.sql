CREATE TABLE review_sessions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX review_sessions_one_open ON review_sessions (source, target) WHERE finished_at IS NULL;
CREATE INDEX review_sessions_finished ON review_sessions (finished_at);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES review_sessions (id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  side TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  end_side TEXT NOT NULL,
  body TEXT NOT NULL,
  snapshot TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX comments_session ON comments (session_id, file_path, start_line, created_at);

CREATE TABLE comment_replies (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX comment_replies_comment ON comment_replies (comment_id, created_at);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES review_sessions (id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES comments (id) ON DELETE CASCADE,
  status TEXT,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX notifications_unread ON notifications (read_at, id);
