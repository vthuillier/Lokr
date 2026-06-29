package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

/**
 * Réponse contenant les informations du profil utilisateur connecté.
 *
 * @param id L'identifiant unique de l'utilisateur
 * @param email L'adresse email de l'utilisateur
 * @param totpEnabled Indique si la double authentification (2FA / TOTP) est activée pour cet utilisateur
 */
public record MeResponse(
        UUID id,
        String email,
        boolean totpEnabled
) {}
