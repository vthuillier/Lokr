function getSubtleCrypto(): SubtleCrypto {
    if (!window.crypto?.subtle) {
        throw new Error(
            "WebCrypto API indisponible. Utilise http://localhost:5173 ou HTTPS."
        );
    }
    return window.crypto.subtle;
}

export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function deriveKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();

    const baseKey = await subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 600_000,
            hash: "SHA-256",
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encryptText(
    text: string,
    key: CryptoKey,
    iv?: Uint8Array
) {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();
    const actualIv = iv || crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await subtle.encrypt(
        {
            name: "AES-GCM",
            iv: actualIv as any,
        },
        key,
        encoder.encode(text)
    );

    return {
        ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
        iv: uint8ArrayToBase64(actualIv),
        ivRaw: actualIv
    };
}

export async function decryptText(
    ciphertext: string,
    iv: string,
    key: CryptoKey
): Promise<string> {
    const subtle = getSubtleCrypto();
    const encryptedBytes = base64ToUint8Array(ciphertext);
    const ivBytes = base64ToUint8Array(iv);

    const decrypted = await subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivBytes as any,
        },
        key,
        encryptedBytes as any
    );

    return new TextDecoder().decode(decrypted);
}

export function generatePassword(length: number = 16): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let retVal = "";
    const values = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length; ++i) {
        retVal += charset.charAt(values[i] % charset.length);
    }
    return retVal;
}

export async function generateRsaKeyPair(): Promise<{ publicKeySpki: string; privateKeyPkcs8: string }> {
    const subtle = getSubtleCrypto();
    const pair = await subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const pubExport = await subtle.exportKey("spki", pair.publicKey);
    const privExport = await subtle.exportKey("pkcs8", pair.privateKey);

    return {
        publicKeySpki: uint8ArrayToBase64(new Uint8Array(pubExport)),
        privateKeyPkcs8: uint8ArrayToBase64(new Uint8Array(privExport)),
    };
}

export async function encryptWithPublicKey(publicKeySpkiBase64: string, data: Uint8Array): Promise<string> {
    const subtle = getSubtleCrypto();
    const pubKeyBytes = base64ToUint8Array(publicKeySpkiBase64);
    const pubKey = await subtle.importKey(
        "spki",
        pubKeyBytes as any,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        false,
        ["encrypt"]
    );
    const encrypted = await subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        pubKey,
        data as any
    );
    return uint8ArrayToBase64(new Uint8Array(encrypted));
}

export async function decryptWithPrivateKey(privateKeyPkcs8Base64: string, encryptedDataBase64: string): Promise<Uint8Array> {
    const subtle = getSubtleCrypto();
    const privKeyBytes = base64ToUint8Array(privateKeyPkcs8Base64);
    const privKey = await subtle.importKey(
        "pkcs8",
        privKeyBytes as any,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        false,
        ["decrypt"]
    );
    const encryptedBytes = base64ToUint8Array(encryptedDataBase64);
    const decrypted = await subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privKey,
        encryptedBytes as any
    );
    return new Uint8Array(decrypted);
}

export async function generateGroupKey(): Promise<string> {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
    return uint8ArrayToBase64(keyBytes);
}

export async function importAesKey(base64Key: string): Promise<CryptoKey> {
    const subtle = getSubtleCrypto();
    const keyBytes = base64ToUint8Array(base64Key);
    return subtle.importKey(
        "raw",
        keyBytes as any,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}