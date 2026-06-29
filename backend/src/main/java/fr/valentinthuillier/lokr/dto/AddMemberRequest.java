package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Requête pour l'ajout d'un membre à un groupe.
 *
 * @param email L'adresse email de l'utilisateur à ajouter
 * @param encryptedGroupKey La clé symétrique du groupe chiffrée avec la clé publique du membre à ajouter
 * @param role Le rôle attribué au nouveau membre
 */
public record AddMemberRequest(
    @NotBlank @Email String email,
    @NotBlank String encryptedGroupKey,
    @NotNull GroupRole role
) {}
