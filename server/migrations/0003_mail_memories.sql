CREATE TABLE IF NOT EXISTS mail_memories (
 owner TEXT NOT NULL REFERENCES users(id),
 mail_id TEXT NOT NULL REFERENCES mail(id),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(owner,mail_id)
);
