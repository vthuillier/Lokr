import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { deriveKey, base64ToUint8Array, decryptText } from "../crypto/crypto";

interface AuthContextType {
    token: string | null;
    salt: string | null;
    masterPassword: string | null;
    derivedKey: CryptoKey | null;
    publicKey: string | null;
    privateKeyPkcs8: string | null;
    isAuthenticated: boolean;
    isLocked: boolean;
    setAuth: (
        token: string, 
        masterPassword: string, 
        salt: string, 
        encryptedVerification?: string, 
        verificationNonce?: string,
        remember?: boolean,
        publicKey?: string | null,
        encryptedPrivateKey?: string | null,
        privateKeyNonce?: string | null
    ) => Promise<void>;
    logout: () => void;
    unlock: (masterPassword: string, salt: string, remember?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [salt, setSalt] = useState<string | null>(localStorage.getItem("kdfSalt"));
    const [derivedKey, setDerivedKey] = useState<CryptoKey | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(localStorage.getItem("pubKey"));
    const [privateKeyPkcs8, setPrivateKeyPkcs8] = useState<string | null>(null);

    const isAuthenticated = !!token;
    const isLocked = isAuthenticated && !derivedKey;

    // Load master password from storage on mount
    useState(() => {
        const savedPass = localStorage.getItem("mp_p") || sessionStorage.getItem("mp");
        const savedSalt = localStorage.getItem("kdfSalt");
        if (savedPass && savedSalt) {
            unlock(savedPass, savedSalt).catch(() => {
                sessionStorage.removeItem("mp");
                localStorage.removeItem("mp_p");
            });
        }
    });

    async function setAuth(
        newToken: string, 
        newMasterPassword: string, 
        saltBase64: string,
        encryptedVerification?: string,
        verificationNonce?: string,
        remember: boolean = false,
        pubKey?: string | null,
        encPrivKey?: string | null,
        privKeyNonce?: string | null
    ) {
        localStorage.setItem("token", newToken);
        localStorage.setItem("kdfSalt", saltBase64);
        
        if (remember) {
            localStorage.setItem("mp_p", newMasterPassword); // Persistent
            sessionStorage.removeItem("mp");
        } else {
            sessionStorage.setItem("mp", newMasterPassword); // Session only
            localStorage.removeItem("mp_p");
        }
        
        if (encryptedVerification) localStorage.setItem("vEnc", encryptedVerification);
        if (verificationNonce) localStorage.setItem("vNonce", verificationNonce);
        
        if (pubKey) localStorage.setItem("pubKey", pubKey);
        if (encPrivKey) localStorage.setItem("encPriv", encPrivKey);
        if (privKeyNonce) localStorage.setItem("privNonce", privKeyNonce);
        
        setToken(newToken);
        setSalt(saltBase64);
        if (pubKey) setPublicKey(pubKey);
        
        await unlock(newMasterPassword, saltBase64, remember);
    }

    async function unlock(password: string, saltBase64: string, remember: boolean = false) {
        const saltBytes = base64ToUint8Array(saltBase64);
        const key = await deriveKey(password, saltBytes);
        
        // Verification logic
        const vEnc = localStorage.getItem("vEnc");
        const vNonce = localStorage.getItem("vNonce");
        
        if (vEnc && vNonce) {
            try {
                const decrypted = await decryptText(vEnc, vNonce, key);
                if (decrypted !== "VERIFIED") {
                    throw new Error("Mot de passe maître incorrect.");
                }
            } catch (err) {
                throw new Error("Mot de passe maître incorrect.");
            }
        }
        
        if (remember) {
            localStorage.setItem("mp_p", password);
            sessionStorage.removeItem("mp");
        } else {
            // Only update sessionStorage if not already in localStorage
            if (!localStorage.getItem("mp_p")) {
                sessionStorage.setItem("mp", password);
            }
        }

        // Decrypt private key
        const encPriv = localStorage.getItem("encPriv");
        const privNonce = localStorage.getItem("privNonce");
        if (encPriv && privNonce) {
            try {
                const decryptedPriv = await decryptText(encPriv, privNonce, key);
                setPrivateKeyPkcs8(decryptedPriv);
            } catch (err) {
                console.error("Failed to decrypt private key", err);
            }
        }
        
        const pubKey = localStorage.getItem("pubKey");
        if (pubKey) {
            setPublicKey(pubKey);
        }

        setDerivedKey(key);
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("kdfSalt");
        localStorage.removeItem("vEnc");
        localStorage.removeItem("vNonce");
        localStorage.removeItem("mp_p");
        localStorage.removeItem("pubKey");
        localStorage.removeItem("encPriv");
        localStorage.removeItem("privNonce");
        localStorage.removeItem("email");
        sessionStorage.removeItem("mp");
        setToken(null);
        setSalt(null);
        setDerivedKey(null);
        setPublicKey(null);
        setPrivateKeyPkcs8(null);
    }

    return (
        <AuthContext.Provider value={{ 
            token, 
            salt,
            masterPassword: null,
            derivedKey, 
            publicKey,
            privateKeyPkcs8,
            isAuthenticated, 
            isLocked, 
            setAuth, 
            logout, 
            unlock 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
