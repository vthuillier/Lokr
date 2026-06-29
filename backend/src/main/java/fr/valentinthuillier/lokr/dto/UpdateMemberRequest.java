package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import jakarta.validation.constraints.NotNull;

/**
 * Requête de mise à jour du rôle d'un membre de groupe.
 *
 * @param role Le nouveau rôle à attribuer (obligatoire)
 */
public record UpdateMemberRequest(
    @NotNull GroupRole role
) {}
