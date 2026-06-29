package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import java.util.UUID;

/**
 * Réponse représentant un groupe d'utilisateurs.
 *
 * @param id L'identifiant unique du groupe
 * @param name Le nom du groupe
 * @param role Le rôle de l'utilisateur connecté dans ce groupe
 * @param encryptedGroupKey La clé symétrique du groupe chiffrée avec la clé publique de l'utilisateur connecté
 */
public record GroupResponse(
    UUID id,
    String name,
    GroupRole role,
    String encryptedGroupKey
) {}
