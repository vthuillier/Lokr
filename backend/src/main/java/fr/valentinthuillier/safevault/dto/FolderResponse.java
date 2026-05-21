package fr.valentinthuillier.safevault.dto;

import java.time.Instant;
import java.util.UUID;

public record FolderResponse(
    UUID id,
    String encryptedName,
    String nonce,
    Instant createdAt,
    Instant updatedAt
) {}