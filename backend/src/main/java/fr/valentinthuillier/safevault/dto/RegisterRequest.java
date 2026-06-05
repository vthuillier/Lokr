package fr.valentinthuillier.safevault.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(

        @Email
        @NotBlank
        String email,

        @NotBlank
        String password,

        @NotBlank
        String kdfSalt,

        String encryptedVerification,
        String verificationNonce,
        String publicKey,
        String encryptedPrivateKey,
        String privateKeyNonce
) {
}