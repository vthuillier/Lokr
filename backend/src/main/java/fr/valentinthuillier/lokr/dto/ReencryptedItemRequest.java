package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

public record  ReencryptedItemRequest(
    UUID id,
    String encryptedName,
    String encryptedUsername,
    String encryptedPassword,
    String encryptedUrl,
    String encryptedNotes,
    String nonce
) {}
