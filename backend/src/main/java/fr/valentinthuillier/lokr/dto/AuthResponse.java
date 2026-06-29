package fr.valentinthuillier.lokr.dto;

/**
 * Réponse d'authentification ou d'inscription.
 *
 * @param token Le jeton JWT généré (null si 2FA est requis)
 * @param kdfSalt Le sel KDF de l'utilisateur
 * @param encryptedVerification Le texte de vérification chiffré du mot de passe maître
 * @param verificationNonce Le nonce associé à la vérification
 * @param totpEnabled Indique si la double authentification TOTP est activée
 * @param totpSecret Le secret TOTP (seulement renvoyé temporairement lors de la création pour initialisation)
 * @param publicKey La clé publique de l'utilisateur
 * @param encryptedPrivateKey La clé privée chiffrée de l'utilisateur
 * @param privateKeyNonce Le nonce associé à la clé privée chiffrée
 */
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
