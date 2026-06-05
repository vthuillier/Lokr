CREATE TABLE groups (
    id UUID primary key,
    name TEXT
);

CREATE TABLE group_access (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    encrypted_group_key TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    CONSTRAINT unique_user_group UNIQUE (user_id, group_id)
);
