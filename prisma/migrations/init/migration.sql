
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,
  role TEXT DEFAULT 'user',
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  "userId" TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  revoked BOOLEAN DEFAULT false,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);
