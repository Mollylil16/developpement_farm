-- Migration 095: add token_selector to refresh_tokens for O(1) lookup
-- The token_selector is the SHA-256 hex digest of the raw refresh token.
-- It lets us find the exact row with a single indexed query instead of
-- loading every non-revoked token and running bcrypt.compare in a loop.
--
-- Existing rows will have NULL selector; they will expire naturally within
-- 7 days and the slow path is kept as a fallback until then.

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_selector VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_selector
  ON refresh_tokens (token_selector)
  WHERE token_selector IS NOT NULL AND revoked = false;
