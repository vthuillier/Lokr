package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête de création d'un groupe.
 *
 * @param name Le nom du groupe
 * @param encryptedGroupKey La clé symétrique du groupe, chiffrée pour le créateur du groupe
 */
public record CreateGroupRequest(
    @NotBlank String name,
    @NotBlank String encryptedGroupKey
) {}
