package fr.valentinthuillier.safevault.dto;

import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import java.util.UUID;

public record GroupResponse(
    UUID id,
    String name,
    GroupRole role,
    String encryptedGroupKey
) {}
