package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Requête d'enregistrement d'un nouvel utilisateur.
 *
 * @param email L'adresse email de l'utilisateur (obligatoire et unique)
 * @param password L'empreinte (hash) du mot de passe maître de l'utilisateur (obligatoire)
 * @param kdfSalt Le sel KDF généré côté client pour le chiffrement (obligatoire)
 * @param encryptedVerification Le texte de vérification cryptographique chiffré
 * @param verificationNonce Le nonce associé au texte de vérification
 * @param publicKey La clé publique asymétrique générée pour l'utilisateur
 * @param encryptedPrivateKey La clé privée asymétrique chiffrée de l'utilisateur
 * @param privateKeyNonce Le nonce associé à la clé privée chiffrée
 */
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
