package fr.valentinthuillier.safevault.dto;

import java.util.UUID;

public record MoveItemRequest(
    UUID folderId
) {}
