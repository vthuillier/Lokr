package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import java.util.UUID;

/**
 * Réponse représentant un membre d'un groupe.
 *
 * @param userId L'identifiant unique de l'utilisateur membre
 * @param email L'adresse email du membre
 * @param role Le rôle du membre au sein du groupe
 * @param encryptedGroupKey La clé symétrique du groupe chiffrée avec la clé publique de ce membre
 * @param publicKey La clé publique de chiffrement du membre
 */
public record GroupMemberResponse(
    UUID userId,
    String email,
    GroupRole role,
    String encryptedGroupKey,
    String publicKey
) {}
