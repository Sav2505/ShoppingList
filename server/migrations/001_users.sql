BEGIN TRANSACTION;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

INSERT INTO users (username, password_hash) VALUES
  ('שחר ודן', 'e08806528403878d80fcf63cf447e992:b15d742b2749976f5962e84410cc63e5fd58d665f7d3c9f57a145c5776360577a1287ee8400faf5bda45355c88ef2e0c0a359ca7a709d345401d1346d67c6527'),
  ('נורית ועופר', '066048f8f7592e2fab7836072ee6e70d:c6284297d05e3c017813613242820a7926639e5d75f55bb81479e61d8bdda096bf140c259f8f547dcbaa88494e2608bf5120b6cfdf3569b540b245e365bb5ef1'),
  ('ליה ועדי', '40bfceced39801049eb67d60b7d043f2:f1c70a5d0e45f38062ba52050ef84a19d76e08fd2611040d38295a0dab217ad19aa3516edf97f747041859c7ba92a61ab751686cc04566308503e0cdeef075a4');

CREATE TABLE items_with_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  completedAt TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id)
);

INSERT INTO items_with_users (id, name, category, quantity, completed, createdAt, completedAt, user_id)
SELECT id, name, category, quantity, completed, createdAt, completedAt,
  (SELECT id FROM users WHERE username = 'שחר ודן')
FROM items;

DROP TABLE items;
ALTER TABLE items_with_users RENAME TO items;
CREATE INDEX items_user_id_idx ON items (user_id);

COMMIT;