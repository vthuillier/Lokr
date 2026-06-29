package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Requête de connexion (authentification).
 *
 * @param email L'adresse email de l'utilisateur (obligatoire)
 * @param password Le hash du mot de passe maître de l'utilisateur (obligatoire)
 * @param code Le code de double authentification TOTP (optionnel)
 */
public record LoginRequest(

        @Email
        @NotBlank
        String email,

        @NotBlank
        String password,

        String code

) {
}
