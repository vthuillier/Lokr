package fr.valentinthuillier.safevault.dto;

public record FolderRequest(
        String encryptedName,
        String nonce) {
}