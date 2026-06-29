package fr.valentinthuillier.lokr.dto;

/**
 * Requête pour la création ou la modification d'un dossier.
 *
 * @param encryptedName Le nom chiffré du dossier
 * @param nonce Le nonce de chiffrement utilisé
 */
public record FolderRequest(
         String encryptedName,
         String nonce) {
 }
