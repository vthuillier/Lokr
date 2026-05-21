export type VaultItem = {
    id: string;
    folderId?: string | null;
    encryptedName: string;
    encryptedUsername?: string;
    encryptedPassword?: string;
    encryptedUrl?: string;
    encryptedNotes?: string;
    nonce: string;
    createdAt: string;
    updatedAt: string;
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