package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

/**
 * Requête transmettant un secret ré-encrypté (nécessaire lors de la révocation d'un membre pour changer la clé du groupe).
 *
 * @param id L'identifiant unique du secret ré-encrypté
 * @param encryptedName Le nom chiffré ré-encrypté
 * @param encryptedUsername L'identifiant chiffré ré-encrypté
 * @param encryptedPassword Le mot de passe chiffré ré-encrypté
 * @param encryptedUrl L'URL chiffrée ré-encryptée
 * @param encryptedNotes Les notes chiffrées ré-encryptées
 * @param nonce Le nouveau nonce associé au secret ré-encrypté
 */
public record  ReencryptedItemRequest(
    UUID id,
    String encryptedName,
    String encryptedUsername,
    String encryptedPassword,
    String encryptedUrl,
    String encryptedNotes,
    String nonce
) {}
