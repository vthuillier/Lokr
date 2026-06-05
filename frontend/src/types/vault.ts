export type VaultItem = {
    id: string;
    folderId?: string | null;
    groupId?: string | null;
    encryptedName: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
    encryptedUrl?: string;
    encryptedNotes?: string;
    nonce: string;
    createdAt: string;
    updatedAt: string;
};

export type DecryptedItem = {
    id: string;
    name: string;
    username: string;
    password: string;
    url: string;
    notes: string;
    folderId?: string | null;
    groupId?: string | null;
};

export type Folder = {
    id: string;
    encryptedName: string;
    nonce: string;
    createdAt: string;
    updatedAt: string;
};

export type DecryptedFolder = {
    id: string;
    name: string;
};

export type Group = {
    id: string;
    name: string;
    role: "ADMIN" | "MEMBER" | "VIEWER";
    encryptedGroupKey: string;
};

export type GroupMember = {
    userId: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "VIEWER";
    encryptedGroupKey: string;
};