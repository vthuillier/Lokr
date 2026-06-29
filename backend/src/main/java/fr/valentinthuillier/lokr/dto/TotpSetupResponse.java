package fr.valentinthuillier.lokr.dto;

/**
 * Réponse renvoyée lors de l'initialisation de la double authentification TOTP.
 *
 * @param secret Le secret TOTP partagé généré
 * @param otpauthUri L'URI standardisée au format otpauth:// pour la génération du QR Code
 */
public record TotpSetupResponse(
        String secret,
        String otpauthUri
) {
}
