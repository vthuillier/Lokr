export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 600000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function decryptText(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
    const ciphertext = base64ToUint8Array(ciphertextBase64);
    const iv = base64ToUint8Array(ivBase64);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as any },
        key,
        ciphertext as any
    );

    return new TextDecoder().decode(decrypted);
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function encryptText(text: string, key: CryptoKey, iv: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        key,
        encoder.encode(text)
    );
    return {
        ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
        iv: uint8ArrayToBase64(iv)
    };
}
