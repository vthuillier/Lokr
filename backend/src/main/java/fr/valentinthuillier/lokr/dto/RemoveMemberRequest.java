package fr.valentinthuillier.lokr.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Requête de suppression d'un membre d'un groupe.
 * Transmet les informations de ré-encodage de sécurité afin de révoquer l'accès du membre supprimé.
 *
 * @param newGroupKeys Les nouvelles clés de groupe chiffrées pour chacun des membres restants du groupe
 * @param reencryptedItems Les secrets du groupe ré-encryptés avec la nouvelle clé du groupe
 */
public record RemoveMemberRequest(
    Map<UUID, String> newGroupKeys,
    List<ReencryptedItemRequest> reencryptedItems
) {}
