-- mezo-kinvault D1 schema
-- Apply: wrangler d1 migrations apply mezo-kinvault-db --remote
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  contact_email TEXT,
  passport_verified_at INTEGER,
  notification_prefs TEXT NOT NULL DEFAULT '{"email":true,"web":true}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY,
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 31611,
  owner_wallet TEXT NOT NULL,
  name TEXT,
  description TEXT,
  heartbeat_interval_seconds INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','triggered','dissolved')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (owner_wallet) REFERENCES profiles(wallet_address)
);
CREATE INDEX IF NOT EXISTS idx_vaults_owner ON vaults(owner_wallet);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  beneficiary_wallet TEXT NOT NULL,
  share_pct_bps INTEGER NOT NULL CHECK (share_pct_bps > 0 AND share_pct_bps <= 10000),
  display_name TEXT,
  contact_email TEXT,
  message_from_owner TEXT,
  passport_verified INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER,
  claim_tx_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_vault ON beneficiaries(vault_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_wallet ON beneficiaries(beneficiary_wallet);

CREATE TABLE IF NOT EXISTS heartbeats (
  id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_heartbeats_vault ON heartbeats(vault_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('vault_created','heartbeat','trigger_expired','passport_verified','claim','dissolved')),
  actor_wallet TEXT,
  metadata TEXT,
  tx_hash TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audit_vault ON audit_log(vault_id, created_at DESC);
