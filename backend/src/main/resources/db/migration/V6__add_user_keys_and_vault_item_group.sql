ALTER TABLE users ADD COLUMN public_key TEXT;
ALTER TABLE users ADD COLUMN encrypted_private_key TEXT;
ALTER TABLE users ADD COLUMN private_key_nonce TEXT;

ALTER TABLE vault_items ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
