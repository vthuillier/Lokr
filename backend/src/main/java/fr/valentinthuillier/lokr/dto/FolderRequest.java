package fr.valentinthuillier.lokr.dto;

public record FolderRequest(
        String encryptedName,
        String nonce) {
}
