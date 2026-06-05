package fr.valentinthuillier.safevault.dto;

public record AuthResponse(
                String token,
                String kdfSalt,
                String encryptedVerification,
                String verificationNonce,
                boolean totpEnabled,
                String totpSecret,
                String publicKey,
                String encryptedPrivateKey,
                String privateKeyNonce) {
}
