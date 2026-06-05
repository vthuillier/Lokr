package fr.valentinthuillier.safevault.dto;

import jakarta.validation.constraints.NotBlank;

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
