CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip text,
  attempted_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, attempted_at DESC);
