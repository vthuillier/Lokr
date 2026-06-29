package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Requête de mise à jour d'un secret du coffre-fort.
 *
 * @param encryptedName Le nouveau nom chiffré (obligatoire)
 * @param encryptedUsername Le nouvel identifiant chiffré
 * @param encryptedPassword Le nouveau mot de passe chiffré
 * @param encryptedUrl La nouvelle URL chiffrée
 * @param encryptedNotes Les nouvelles notes chiffrées
 * @param nonce Le nouveau nonce associé à l'élément (obligatoire)
 * @param groupId L'identifiant du groupe associé (optionnel)
 */
public record UpdateVaultItemRequest(

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
