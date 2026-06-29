package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête pour ajouter un nouvel élément (secret) au coffre-fort.
 *
 * @param encryptedName Le nom chiffré de l'élément (obligatoire)
 * @param encryptedUsername L'identifiant/nom d'utilisateur chiffré
 * @param encryptedPassword Le mot de passe chiffré
 * @param encryptedUrl L'URL chiffrée
 * @param encryptedNotes Les notes chiffrées additionnelles
 * @param nonce Le nonce unique utilisé pour chiffrer les champs de cet élément (obligatoire)
 * @param groupId L'identifiant du groupe de partage (optionnel)
 */
public record CreateVaultItemRequest(

        @NotBlank
        String encryptedName,

        String encryptedUsername,

        String encryptedPassword,

        String encryptedUrl,

        String encryptedNotes,

        @NotBlank
        String nonce,

        java.util.UUID groupId

) {
}
