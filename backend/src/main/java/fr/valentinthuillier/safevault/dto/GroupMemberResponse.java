package fr.valentinthuillier.safevault.dto;

import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import java.util.UUID;

public record GroupMemberResponse(
    UUID userId,
    String email,
    GroupRole role,
    String encryptedGroupKey
) {}
