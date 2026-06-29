package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

/**
 * Requête pour déplacer un secret vers un autre dossier.
 *
 * @param folderId L'identifiant unique du dossier cible (peut être null pour déplacer à la racine du coffre-fort)
 */
public record MoveItemRequest(
     UUID folderId
 ) {}
