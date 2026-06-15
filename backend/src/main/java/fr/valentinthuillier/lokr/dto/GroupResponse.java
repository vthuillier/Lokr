package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import java.util.UUID;

public record GroupResponse(
    UUID id,
    String name,
    GroupRole role,
    String encryptedGroupKey
) {}
