package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête de vérification d'un code TOTP.
 *
 * @param code Le code de double authentification à 6 chiffres (obligatoire)
 */
public record TotpVerifyRequest(
        @NotBlank
        String code
) {
}
