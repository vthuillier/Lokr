package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

public record MoveItemRequest(
    UUID folderId
) {}
