package fr.valentinthuillier.lokr.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Réponse représentant un secret stocké dans le coffre-fort.
 *
 * @param id L'identifiant unique du secret
 * @param folderId L'identifiant du dossier parent (optionnel)
 * @param groupId L'identifiant du groupe associé si partagé (optionnel)
 * @param encryptedName Le nom chiffré du secret
 * @param encryptedUsername L'identifiant chiffré
 * @param encryptedPassword Le mot de passe chiffré
 * @param encryptedUrl L'URL chiffrée
 * @param encryptedNotes Les notes chiffrées
 * @param nonce Le nonce utilisé pour déchiffrer
 * @param createdAt Date de création du secret
 * @param updatedAt Date de dernière mise à jour du secret
 */
public record VaultItemResponse(

                UUID id,

                UUID folderId,

                UUID groupId,

                String encryptedName,

                String encryptedUsername,

                String encryptedPassword,

                String encryptedUrl,

                String encryptedNotes,

                String nonce,

                Instant createdAt,

                Instant updatedAt

) {
}
