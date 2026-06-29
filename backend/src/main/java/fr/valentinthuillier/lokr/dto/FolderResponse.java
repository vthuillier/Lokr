package fr.valentinthuillier.lokr.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Réponse représentant les détails d'un dossier.
 *
 * @param id L'identifiant unique du dossier
 * @param encryptedName Le nom chiffré du dossier
 * @param nonce Le nonce de chiffrement utilisé
 * @param createdAt Date de création du dossier
 * @param updatedAt Date de dernière mise à jour du dossier
 */
public record FolderResponse(
    UUID id,
    String encryptedName,
    String nonce,
    Instant createdAt,
    Instant updatedAt
) {}
